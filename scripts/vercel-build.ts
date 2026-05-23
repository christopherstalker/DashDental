import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";

const isProductionDeployment = process.env.VERCEL_ENV === "production";
const shouldDeployPrismaMigrations =
  process.env.VERCEL === "1" && Boolean(process.env.DATABASE_URL?.trim());
const shouldRecoverPreviewMigration =
  shouldDeployPrismaMigrations && process.env.VERCEL_ENV !== "production";
const BASELINE_MIGRATION_NAME = "20260430000000_baseline";

type PrismaMigrationRecord = {
  migration_name: string;
  finished_at: Date | null;
  rolled_back_at: Date | null;
};

function getNpmInvocation() {
  if (process.env.npm_execpath) {
    return {
      command: process.execPath,
      prefixArgs: [process.env.npm_execpath],
    };
  }

  if (process.platform === "win32") {
    const bundledNpmCli = path.join(
      path.dirname(process.execPath),
      "node_modules",
      "npm",
      "bin",
      "npm-cli.js",
    );

    if (existsSync(bundledNpmCli)) {
      return {
        command: process.execPath,
        prefixArgs: [bundledNpmCli],
      };
    }
  }

  return {
    command: "npm",
    prefixArgs: [],
  };
}

function runNpm(args: string[], options: { allowFailure?: boolean } = {}): boolean {
  const npmInvocation = getNpmInvocation();
  const command = npmInvocation.command;
  const commandArgs = [...npmInvocation.prefixArgs, ...args];
  const result = spawnSync(command, commandArgs, {
    env: process.env,
    stdio: "inherit",
  });

  if (result.error) {
    console.error(result.error.message);
    if (options.allowFailure) {
      return false;
    }
    process.exit(1);
  }

  process.exitCode = result.status ?? 1;
  if (process.exitCode !== 0) {
    if (options.allowFailure) {
      process.exitCode = 0;
      return false;
    }
    process.exit(process.exitCode);
  }

  return true;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runNpmWithRetry(args: string[], attempts = 3) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    if (runNpm(args, { allowFailure: attempt < attempts })) {
      return;
    }

    const retryDelayMs = 15_000 * attempt;
    console.warn(
      `Command failed; retrying in ${Math.round(retryDelayMs / 1000)}s (${attempt}/${attempts})...`,
    );
    await sleep(retryDelayMs);
  }
}

function readLocalMigrationNames(): string[] {
  const migrationsDir = path.join(process.cwd(), "prisma", "migrations");

  if (!existsSync(migrationsDir)) {
    return [];
  }

  return readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

async function readPrismaMigrationRecords(): Promise<PrismaMigrationRecord[] | undefined> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    return undefined;
  }

  const client = new Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 10_000,
  });

  try {
    await client.connect();
    const result = await client.query<PrismaMigrationRecord>(
      'select migration_name, finished_at, rolled_back_at from "_prisma_migrations"',
    );

    return result.rows;
  } catch (error) {
    if ((error as { code?: string }).code === "42P01") {
      return [];
    }

    console.warn("Could not inspect Prisma migration table; falling back to prisma migrate deploy.");
    return undefined;
  } finally {
    await client.end().catch(() => {});
  }
}

function migrationIsApplied(record: PrismaMigrationRecord | undefined) {
  return Boolean(record?.finished_at && !record.rolled_back_at);
}

function migrationNeedsRollback(record: PrismaMigrationRecord | undefined) {
  return Boolean(record && !record.finished_at && !record.rolled_back_at);
}

function hasPendingLocalMigrations(records: PrismaMigrationRecord[] | undefined) {
  if (!records) {
    return true;
  }

  const recordsByName = new Map(records.map((record) => [record.migration_name, record]));
  return readLocalMigrationNames().some(
    (migrationName) => !migrationIsApplied(recordsByName.get(migrationName)),
  );
}

function baselineNeedsResolve(records: PrismaMigrationRecord[] | undefined) {
  if (!records?.length) {
    return false;
  }

  const recordsByName = new Map(records.map((record) => [record.migration_name, record]));
  if (recordsByName.has(BASELINE_MIGRATION_NAME)) {
    return false;
  }

  return records.some(
    (record) => record.migration_name > BASELINE_MIGRATION_NAME && migrationIsApplied(record),
  );
}

async function main() {
  if (isProductionDeployment) {
    runNpm(["run", "go-live:check"]);
  }

  let migrationRecords = shouldDeployPrismaMigrations
    ? await readPrismaMigrationRecords()
    : undefined;

  if (shouldDeployPrismaMigrations && baselineNeedsResolve(migrationRecords)) {
    await runNpmWithRetry([
      "exec",
      "--",
      "prisma",
      "migrate",
      "resolve",
      "--applied",
      BASELINE_MIGRATION_NAME,
    ]);
    migrationRecords = await readPrismaMigrationRecords();
  }

  if (shouldRecoverPreviewMigration) {
    const recordsByName = new Map(
      (migrationRecords ?? []).map((record) => [record.migration_name, record]),
    );

    for (const migrationName of [
      "20260502060000_phase5_billing_usage_hardening",
      "20260518101000_team_invite_tokens",
    ]) {
      if (migrationNeedsRollback(recordsByName.get(migrationName))) {
        runNpm(
          ["exec", "--", "prisma", "migrate", "resolve", "--rolled-back", migrationName],
          { allowFailure: true },
        );
      }
    }
  }

  if (shouldDeployPrismaMigrations) {
    if (hasPendingLocalMigrations(migrationRecords)) {
      await runNpmWithRetry(["exec", "--", "prisma", "migrate", "deploy"]);
    } else {
      console.log("Prisma migrations already applied; skipping migrate deploy.");
    }
  }

  runNpm(["run", "build"]);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
