import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://dental:dental@localhost:5432/dental_recovery?schema=public",
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
