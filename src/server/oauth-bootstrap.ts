import crypto from "node:crypto";
import { isDemoOrganizationId } from "@/domain/seed-data";
import type { AppState, Membership, Organization, Role, User } from "@/domain/types";

function envString(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function splitEnvList(value?: string): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function deterministicId(prefix: string, seed: string): string {
  const digest = crypto.createHash("sha256").update(seed).digest("hex").slice(0, 16);
  return `${prefix}-${digest}`;
}

function roleFromEnv(): Role {
  const value = envString("OAUTH_BOOTSTRAP_ROLE");
  if (value === "owner" || value === "admin" || value === "manager") {
    return value;
  }

  return "owner";
}

function nameFromEmail(email: string): string {
  const base = email.split("@")[0] ?? "Clinic User";
  const chunks = base
    .split(/[._-]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (chunks.length === 0) {
    return "Clinic User";
  }

  return chunks
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

function avatarFromName(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((chunk) => chunk[0]?.toUpperCase() ?? "")
      .join("") || "DR"
  );
}

function normalizeClinicSlug(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "clinic-workspace";
}

function resolveBootstrapOrganizationId(state: AppState): string {
  const requestedOrganizationId = envString("OAUTH_DEFAULT_ORGANIZATION_ID");

  if (
    requestedOrganizationId &&
    state.organizations.some((organization) => organization.id === requestedOrganizationId)
  ) {
    return requestedOrganizationId;
  }

  const nonDemoOrganization = state.organizations.find(
    (organization) => !isDemoOrganizationId(organization.id),
  );
  if (nonDemoOrganization) {
    return nonDemoOrganization.id;
  }

  const existingOrganization = state.organizations[0];
  if (existingOrganization) {
    return existingOrganization.id;
  }

  if (requestedOrganizationId && !isDemoOrganizationId(requestedOrganizationId)) {
    return requestedOrganizationId;
  }

  return `org-${normalizeClinicSlug(envString("OAUTH_BOOTSTRAP_CLINIC_NAME") ?? "Clinic Workspace")}`;
}

function createBootstrapOrganization(organizationId: string): Organization {
  return {
    id: organizationId,
    name: envString("OAUTH_BOOTSTRAP_CLINIC_NAME") ?? "Clinic Workspace",
    timezone: envString("OAUTH_BOOTSTRAP_TIMEZONE") ?? "UTC",
    currency: "USD",
    averagePatientValue: 500,
    businessHours: {
      start: "09:00",
      end: "18:00",
      weekdays: [1, 2, 3, 4, 5],
    },
    status: "trial",
  };
}

function createBootstrapUser(email: string): User {
  const name = nameFromEmail(email);

  return {
    id: deterministicId("user-oauth", email),
    email,
    emailVerifiedAt: new Date(0).toISOString(),
    name,
    avatar: avatarFromName(name),
    status: "active",
    lastLoginAt: new Date(0).toISOString(),
    sessionVersion: 0,
  };
}

function createBootstrapMembership(email: string, organizationId: string, role: Role): Membership {
  return {
    id: deterministicId("mem-oauth", `${organizationId}:${email}`),
    userId: deterministicId("user-oauth", email),
    organizationId,
    role,
    status: "active",
  };
}

export function applyOAuthBootstrapUsers(state: AppState): AppState {
  const emails = splitEnvList(process.env.OAUTH_BOOTSTRAP_EMAILS);
  if (emails.length === 0) {
    return state;
  }

  const organizationId = resolveBootstrapOrganizationId(state);
  const role = roleFromEnv();
  let nextOrganizations = state.organizations;
  let nextUsers = state.users;
  let nextMemberships = state.memberships;
  let changed = false;

  if (!nextOrganizations.some((organization) => organization.id === organizationId)) {
    nextOrganizations = [...nextOrganizations, createBootstrapOrganization(organizationId)];
    changed = true;
  }

  for (const email of emails) {
    const userIndex = nextUsers.findIndex((user) => user.email.toLowerCase() === email);

    if (userIndex === -1) {
      nextUsers = [...nextUsers, createBootstrapUser(email)];
      changed = true;
    } else {
      const existingUser = nextUsers[userIndex];
      if (existingUser.status === "invited") {
        nextUsers = nextUsers.map((user, index) =>
          index === userIndex
            ? {
                ...user,
                status: "active",
              }
            : user,
        );
        changed = true;
      }
    }

    const resolvedUserId =
      nextUsers.find((user) => user.email.toLowerCase() === email)?.id ??
      deterministicId("user-oauth", email);
    const membershipIndex = nextMemberships.findIndex(
      (membership) =>
        membership.userId === resolvedUserId && membership.organizationId === organizationId,
    );

    if (membershipIndex === -1) {
      nextMemberships = [
        ...nextMemberships,
        {
          ...createBootstrapMembership(email, organizationId, role),
          userId: resolvedUserId,
        },
      ];
      changed = true;
    } else if (nextMemberships[membershipIndex]?.status === "invited") {
      nextMemberships = nextMemberships.map((membership, index) =>
        index === membershipIndex
          ? {
              ...membership,
              status: "active",
            }
          : membership,
      );
      changed = true;
    }
  }

  if (!changed) {
    return state;
  }

  return {
    ...state,
    organizations: nextOrganizations,
    users: nextUsers,
    memberships: nextMemberships,
  };
}
