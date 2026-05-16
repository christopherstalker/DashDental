import "dotenv/config";
import { Role, type Role as PrismaRole } from "../src/generated/prisma/enums";
import { defaultOrganizationId } from "../src/domain/seed-data";
import { prisma } from "../src/server/prisma";

const roles = Object.values(Role) as PrismaRole[];

function usage() {
  console.error(
    "Usage: npx tsx prisma/invite-oauth-user.ts <email> [role] [organizationId] [name]",
  );
  console.error("Example: npm run admin:grant -- owner@example.com super_admin org-main Owner");
}

function avatarFromName(name: string) {
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return initials || "DR";
}

const email = process.argv[2]?.trim().toLowerCase();
const role = (process.argv[3]?.trim() ?? "owner") as PrismaRole;
const organizationId = process.argv[4]?.trim() || defaultOrganizationId;
const name = process.argv[5]?.trim() || email?.split("@")[0] || "OAuth User";

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  usage();
  process.exit(0);
}

if (!email || !email.includes("@") || !roles.includes(role)) {
  usage();
  process.exit(1);
}

async function main() {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  if (!organization) {
    throw new Error(`Organization not found: ${organizationId}`);
  }

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name,
      avatar: avatarFromName(name),
      status: "active",
      lastLoginAt: new Date(),
    },
    update: {
      name,
      status: "active",
      lastLoginAt: new Date(),
    },
  });

  const membership = await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId,
      },
    },
    create: {
      userId: user.id,
      organizationId,
      role,
      status: "active",
    },
    update: {
      role,
      status: "active",
    },
  });

  console.log(
    JSON.stringify(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        membership: {
          id: membership.id,
          organizationId: membership.organizationId,
          role: membership.role,
          status: membership.status,
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
