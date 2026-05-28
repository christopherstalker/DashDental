import { config } from "dotenv";
import { defaultOrganizationId } from "../src/domain/seed-data";
import { prisma } from "../src/server/prisma";
import { hashPassword } from "../src/server/user-credentials";

type PrismaRole = "owner" | "admin" | "manager" | "super_admin";

const envFiles = [".env.codex.production", ".env.production.local", ".env.local"];

for (const envFile of envFiles) {
  config({ path: envFile, override: false, quiet: true });
}

function clean(value?: string): string {
  return value?.trim().replace(/^['"]|['"]$/g, "") ?? "";
}

function ensureDatabaseUrl() {
  if (clean(process.env.DATABASE_URL)) {
    process.env.DATABASE_URL = clean(process.env.DATABASE_URL);
    return;
  }

  const user = clean(process.env.PGUSER);
  const password = clean(process.env.PGPASSWORD);
  const host = clean(process.env.PGHOST);
  const database = clean(process.env.PGDATABASE);

  if (!user || !password || !host || !database) {
    throw new Error(
      "DATABASE_URL is missing. Provide DATABASE_URL or PGUSER/PGPASSWORD/PGHOST/PGDATABASE.",
    );
  }

  const url = new URL("postgresql://dashdental.local");
  url.username = user;
  url.password = password;
  url.hostname = host;
  url.pathname = `/${database}`;
  url.searchParams.set("sslmode", "verify-full");
  process.env.DATABASE_URL = url.toString();
}

function avatarFromName(name: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "SA";
}

async function resolveOrganizationId() {
  const requestedOrganizationId =
    clean(process.env.DD_SUPER_ADMIN_ORGANIZATION_ID) || defaultOrganizationId;
  const requestedOrganization = await prisma.organization.findUnique({
    where: { id: requestedOrganizationId },
  });

  if (requestedOrganization) {
    return requestedOrganization.id;
  }

  const firstOrganization = await prisma.organization.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (!firstOrganization) {
    throw new Error("No organization exists. Create a clinic workspace before assigning super admin.");
  }

  return firstOrganization.id;
}

async function main() {
  ensureDatabaseUrl();
  process.env.APP_STORAGE_DRIVER = "prisma";

  const email = clean(process.env.DD_SUPER_ADMIN_EMAIL).toLowerCase();
  const password = clean(process.env.DD_SUPER_ADMIN_PASSWORD);
  const name = clean(process.env.DD_SUPER_ADMIN_NAME) || email.split("@")[0] || "Super Admin";
  const role: PrismaRole = "super_admin";

  if (!email || !email.includes("@")) {
    throw new Error("DD_SUPER_ADMIN_EMAIL must be a valid email address.");
  }

  if (!password) {
    throw new Error("DD_SUPER_ADMIN_PASSWORD is required.");
  }

  const organizationId = await resolveOrganizationId();
  const passwordHash = await hashPassword(password);
  const now = new Date();

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      avatar: avatarFromName(name),
      email,
      emailVerifiedAt: now,
      lastLoginAt: now,
      name,
      sessionVersion: 0,
      status: "active",
    },
    update: {
      emailVerifiedAt: now,
      lastLoginAt: now,
      name,
      status: "active",
    },
  });

  await prisma.userCredential.upsert({
    where: { userId: user.id },
    create: {
      passwordHash,
      userId: user.id,
    },
    update: {
      passwordHash,
    },
  });

  const membership = await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        organizationId,
        userId: user.id,
      },
    },
    create: {
      organizationId,
      role,
      status: "active",
      userId: user.id,
    },
    update: {
      role,
      status: "active",
    },
  });

  console.log(
    JSON.stringify(
      {
        membership: {
          id: membership.id,
          organizationId: membership.organizationId,
          role: membership.role,
          status: membership.status,
        },
        user: {
          email: user.email,
          id: user.id,
          status: user.status,
        },
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
