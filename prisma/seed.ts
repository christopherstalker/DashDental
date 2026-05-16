import { getInitialAppState } from "../src/domain/seed-data";
import { prisma } from "../src/server/prisma";
import { writeAppStateToPrisma } from "../src/server/prisma-store";

async function main() {
  await writeAppStateToPrisma(getInitialAppState(), prisma);
  console.log("Seeded Dental Recovery demo data.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
