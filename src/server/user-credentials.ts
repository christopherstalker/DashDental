import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { FREE_TRIAL_DAYS, getFreeTrialPeriod, getPlanLimits } from "@/domain/business-rules";
import { isDemoOrganizationId } from "@/domain/seed-data";
import type { AppState, Organization, Role, Subscription, UsageLimits } from "@/domain/types";
import { prisma } from "./prisma";
import { addAudit } from "./state-mutations";
import { createDefaultClinicDbContract } from "./data-access-contracts";
import { ApiError } from "./api-error";
import { isPrismaStorageEnabled, mutateAppState, readAppState } from "./data-store";
import { getBillingProvider } from "./manual-billing";

const scryptAsync = promisify(crypto.scrypt);

interface CredentialRecord {
  userId: string;
  passwordHash: string;
}

interface ActiveMembership {
  organizationId: string;
  role: Role;
}

type DefaultIntegrationProvider = "telegram" | "web_form" | "instagram" | "whatsapp" | "clinic_database";

let credentialWriteQueue: Promise<unknown> = Promise.resolve();

function getCredentialsDirectory(): string {
  if (process.env.NODE_ENV === "production" && !isPrismaStorageEnabled()) {
    return path.join(os.tmpdir(), "dental-recovery-data");
  }

  return path.join(process.cwd(), ".data");
}

function getCredentialsFilePath(): string {
  return path.join(getCredentialsDirectory(), "dental-recovery-credentials.json");
}

function createRuntimeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function sanitizeAvatar(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() ?? "")
    .join("") || "DR";
}

function normalizeClinicSlug(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "clinic";
}

function roleRank(role: Role): number {
  switch (role) {
    case "owner":
      return 1;
    case "admin":
      return 2;
    case "manager":
      return 3;
    case "super_admin":
      return 4;
  }
}

function choosePrimaryMembership(memberships: ActiveMembership[]): ActiveMembership | undefined {
  return memberships
    .toSorted((left, right) => {
      const leftDemo = isDemoOrganizationId(left.organizationId) ? 1 : 0;
      const rightDemo = isDemoOrganizationId(right.organizationId) ? 1 : 0;

      if (leftDemo !== rightDemo) {
        return leftDemo - rightDemo;
      }

      return roleRank(left.role) - roleRank(right.role);
    })[0];
}

function validatePasswordStrength(password: string) {
  if (password.length < 10) {
    throw new ApiError(400, "Password must be at least 10 characters long", "validation_error", {
      field: "password",
    });
  }
}

async function readCredentialRecordsFromFile(): Promise<CredentialRecord[]> {
  const credentialsDirectory = getCredentialsDirectory();
  const credentialsFilePath = getCredentialsFilePath();
  await fs.mkdir(credentialsDirectory, { recursive: true });

  try {
    const file = await fs.readFile(credentialsFilePath, "utf8");
    const payload = JSON.parse(file) as unknown;
    return Array.isArray(payload)
      ? payload.filter(
          (item): item is CredentialRecord =>
            Boolean(
              item &&
                typeof item === "object" &&
                typeof (item as CredentialRecord).userId === "string" &&
                typeof (item as CredentialRecord).passwordHash === "string",
            ),
        )
      : [];
  } catch {
    return [];
  }
}

async function writeCredentialRecordsToFile(records: CredentialRecord[]): Promise<void> {
  const credentialsDirectory = getCredentialsDirectory();
  const credentialsFilePath = getCredentialsFilePath();
  await fs.mkdir(credentialsDirectory, { recursive: true });
  credentialWriteQueue = credentialWriteQueue.then(() =>
    fs.writeFile(credentialsFilePath, JSON.stringify(records, null, 2), "utf8"),
  );
  await credentialWriteQueue;
}

async function getPasswordHash(userId: string): Promise<string | undefined> {
  if (isPrismaStorageEnabled()) {
    const record = await prisma.userCredential.findUnique({
      where: { userId },
      select: { passwordHash: true },
    });
    return record?.passwordHash;
  }

  const records = await readCredentialRecordsFromFile();
  return records.find((record) => record.userId === userId)?.passwordHash;
}

export async function setPasswordHash(userId: string, passwordHash: string): Promise<void> {
  if (isPrismaStorageEnabled()) {
    await prisma.userCredential.upsert({
      where: { userId },
      update: { passwordHash },
      create: { userId, passwordHash },
    });
    return;
  }

  const records = await readCredentialRecordsFromFile();
  const index = records.findIndex((record) => record.userId === userId);
  if (index >= 0) {
    records[index] = { userId, passwordHash };
  } else {
    records.push({ userId, passwordHash });
  }

  await writeCredentialRecordsToFile(records);
}

export async function hashPassword(password: string): Promise<string> {
  validatePasswordStrength(password);
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derivedKey.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  passwordHash?: string,
): Promise<boolean> {
  if (!passwordHash) {
    return false;
  }

  const [algorithm, salt, hash] = passwordHash.split("$");
  if (algorithm !== "scrypt" || !salt || !hash) {
    return false;
  }

  const derivedKey = (await scryptAsync(password, salt, Buffer.from(hash, "hex").length)) as Buffer;
  const storedHash = Buffer.from(hash, "hex");

  return (
    storedHash.length === derivedKey.length &&
    crypto.timingSafeEqual(storedHash, derivedKey)
  );
}

export async function resolvePasswordLogin(input: {
  state: AppState;
  email: string;
  password: string;
  organizationId?: string;
}): Promise<{ userId: string; organizationId: string }> {
  const email = normalizeEmail(input.email);
  const user = input.state.users.find(
    (item) => item.email.toLowerCase() === email && item.status === "active",
  );
  if (!user) {
    throw new ApiError(401, "Invalid email or password", "invalid_credentials");
  }

  const passwordHash = await getPasswordHash(user.id);
  const isValidPassword = await verifyPassword(input.password, passwordHash);
  if (!isValidPassword) {
    throw new ApiError(401, "Invalid email or password", "invalid_credentials");
  }

  const memberships = input.state.memberships
    .filter(
      (membership) => membership.userId === user.id && membership.status === "active",
    )
    .map((membership) => ({
      organizationId: membership.organizationId,
      role: membership.role,
    }));

  if (memberships.length === 0) {
    throw new ApiError(403, "No active clinic membership was found", "membership_missing");
  }

  const membership = input.organizationId
    ? memberships.find((item) => item.organizationId === input.organizationId)
    : choosePrimaryMembership(memberships);

  if (!membership) {
    throw new ApiError(403, "Requested clinic access is not allowed", "forbidden");
  }

  return {
    userId: user.id,
    organizationId: membership.organizationId,
  };
}

function createStarterSubscription(
  organizationId: string,
  nowIso: string,
): Subscription {
  const trialPeriod = getFreeTrialPeriod(nowIso);

  return {
    id: createRuntimeId("sub"),
    organizationId,
    provider: getBillingProvider() === "stripe" ? "stripe" : "manual",
    plan: "starter",
    status: "trialing",
    currentPeriodStart: trialPeriod.startIso,
    currentPeriodEnd: trialPeriod.endIso,
    externalCustomerId: "",
    externalSubscriptionId: "free-trial",
  };
}

function createDefaultIntegrationSlots(organizationId: string): AppState["integrations"] {
  const providers: DefaultIntegrationProvider[] = [
    "telegram",
    "web_form",
    "instagram",
    "whatsapp",
    "clinic_database",
  ];

  return providers.map((provider) => ({
    id: createRuntimeId(`int-${provider}`),
    organizationId,
    provider,
    status: "pending",
    encryptedCredentials: "",
    webhookSecret:
      provider === "clinic_database"
        ? "not-used-read-only-sync"
        : "",
    errorState:
      provider === "clinic_database"
        ? "Add a clinic database connection before the first sync."
        : "Add credentials to activate this channel.",
    healthScore: provider === "clinic_database" ? 20 : 0,
  }));
}

function createStarterUsage(organizationId: string): UsageLimits {
  const limits = getPlanLimits("starter");

  return {
    id: createRuntimeId("usage"),
    organizationId,
    maxUsers: limits.maxUsers,
    maxIntegrations: limits.maxIntegrations,
    monthlyMessages: limits.monthlyMessages,
    monthlyAiRuns: limits.monthlyAiRuns,
    periodUsageJson: {
      users: 1,
      integrations: 0,
      messages: 0,
      aiRuns: 0,
    },
  };
}

function createClinicOrganization(
  existingState: AppState,
  input: {
    clinicName: string;
    timezone: string;
    currency: Organization["currency"];
  },
): Organization {
  const baseSlug = normalizeClinicSlug(input.clinicName);
  let organizationId = `org-${baseSlug}`;
  let attempt = 1;

  while (existingState.organizations.some((organization) => organization.id === organizationId)) {
    attempt += 1;
    organizationId = `org-${baseSlug}-${attempt}`;
  }

  return {
    id: organizationId,
    name: input.clinicName.trim(),
    timezone: input.timezone.trim() || "UTC",
    currency: input.currency,
    averagePatientValue: 500,
    businessHours: {
      start: "09:00",
      end: "18:00",
      weekdays: [1, 2, 3, 4, 5],
    },
    status: "trial",
  };
}

export async function registerClinicWorkspace(input: {
  clinicName: string;
  ownerName: string;
  email: string;
  password: string;
  timezone: string;
  currency: Organization["currency"];
}): Promise<{ state: AppState; userId: string; organizationId: string }> {
  const clinicName = input.clinicName.trim();
  const ownerName = input.ownerName.trim();
  const email = normalizeEmail(input.email);
  const timezone = input.timezone.trim() || "UTC";

  if (clinicName.length < 2) {
    throw new ApiError(400, "Clinic name is required", "validation_error", {
      field: "clinicName",
    });
  }

  if (ownerName.length < 2) {
    throw new ApiError(400, "Owner name is required", "validation_error", {
      field: "ownerName",
    });
  }

  if (!email.includes("@")) {
    throw new ApiError(400, "Email must be valid", "validation_error", {
      field: "email",
    });
  }

  const passwordHash = await hashPassword(input.password);
  const existingState = await readAppState();
  if (existingState.users.some((user) => user.email.toLowerCase() === email)) {
    throw new ApiError(409, "A user with this email already exists", "email_conflict");
  }

  const userId = createRuntimeId("user");
  const nowIso = new Date().toISOString();
  let organizationId = "";

  const nextState = await mutateAppState((current) => {
    if (current.users.some((user) => user.email.toLowerCase() === email)) {
      throw new ApiError(409, "A user with this email already exists", "email_conflict");
    }

    const organization = createClinicOrganization(current, {
      clinicName,
      timezone,
      currency: input.currency,
    });
    organizationId = organization.id;
    const subscription = createStarterSubscription(organization.id, nowIso);

    let state: AppState = {
      ...current,
      organizations: [...current.organizations, organization],
      users: [
        ...current.users,
        {
          id: userId,
          email,
          name: ownerName,
          avatar: sanitizeAvatar(ownerName),
          status: "active",
          lastLoginAt: nowIso,
        },
      ],
      memberships: [
        ...current.memberships,
        {
          id: createRuntimeId("mem"),
          userId,
          organizationId: organization.id,
          role: "owner",
          status: "active",
        },
      ],
      subscriptions: [...current.subscriptions, subscription],
      usageLimits: [...current.usageLimits, createStarterUsage(organization.id)],
      integrations: [...current.integrations, ...createDefaultIntegrationSlots(organization.id)],
      dataAccessContracts: [
        ...current.dataAccessContracts,
        createDefaultClinicDbContract({
          organizationId: organization.id,
          actorUserId: userId,
          nowIso,
        }),
      ],
    };

    state = addAudit(state, {
      organizationId: organization.id,
      actorUserId: userId,
      action: "organization.registered",
      entityType: "organization",
      entityId: organization.id,
      metadataJson: {
        email,
        timezone,
        trialDays: FREE_TRIAL_DAYS,
        trialEndsAt: subscription.currentPeriodEnd,
      },
    });

    return state;
  });

  await setPasswordHash(userId, passwordHash);

  return {
    state: nextState,
    userId,
    organizationId,
  };
}

export async function touchUserLastLogin(
  userId: string,
  nowIso = new Date().toISOString(),
): Promise<AppState> {
  return mutateAppState((state) => ({
    ...state,
    users: state.users.map((user) =>
      user.id === userId
        ? {
            ...user,
            lastLoginAt: nowIso,
          }
        : user,
    ),
  }));
}
