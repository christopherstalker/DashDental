import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AppState } from "@/domain/types";
import { ApiError } from "./api-error";
import { applyOAuthBootstrapUsers } from "./oauth-bootstrap";
import {
  ensurePrismaSeeded,
  readAppStateFromPrisma,
  resetPrismaState,
  writeAppStateDeltaToPrisma,
  writeAppStateToPrisma,
} from "./prisma-store";
import { isProductionBuild, isProductionRuntime } from "./feature-flags";
import { getRuntimeSeedState, sanitizeRuntimeState } from "./runtime-state";

type StorageDriver = "prisma" | "file";

function getDataDirectory(): string {
  if (isProductionRuntime() && !isPrismaStorageEnabled()) {
    return path.join(os.tmpdir(), "dental-recovery-data");
  }

  return path.join(process.cwd(), ".data");
}

function getStateFilePath(): string {
  return path.join(getDataDirectory(), "dental-recovery-state.json");
}

let writeQueue: Promise<unknown> = Promise.resolve();
let mutationQueue: Promise<unknown> = Promise.resolve();

function enqueueMutation<T>(operation: () => Promise<T>): Promise<T> {
  const nextOperation = mutationQueue.then(operation);
  mutationQueue = nextOperation.catch(() => undefined);
  return nextOperation;
}

export function isPrismaStorageEnabled(): boolean {
  return getStorageDriver() === "prisma";
}

function isLocalDatabaseUrl(connectionString: string): boolean {
  return /(localhost|127\.0\.0\.1|\[::1\])/i.test(connectionString);
}

function getRequestedStorageDriver(): "auto" | StorageDriver {
  const value = process.env.APP_STORAGE_DRIVER?.trim().toLowerCase();
  if (value === "prisma" || value === "file") {
    return value;
  }

  return "auto";
}

export function getStorageDriver(): StorageDriver {
  const requestedDriver = getRequestedStorageDriver();
  const connectionString = process.env.DATABASE_URL?.trim();

  if (requestedDriver === "file") {
    if (isProductionRuntime()) {
      throw new ApiError(
        500,
        "File-backed storage is disabled in production. Configure DATABASE_URL and use Prisma storage.",
        "production_file_storage_disabled",
      );
    }

    return "file";
  }

  if (requestedDriver === "prisma" && !connectionString) {
    throw new ApiError(
      500,
      "APP_STORAGE_DRIVER=prisma requires DATABASE_URL.",
      "database_url_missing",
    );
  }

  if (
    connectionString &&
    isLocalDatabaseUrl(connectionString) &&
    process.env.VERCEL === "1"
  ) {
    throw new ApiError(
      500,
      "DATABASE_URL points at localhost on Vercel. Configure a managed Postgres connection.",
      "database_url_invalid_for_vercel",
    );
  }

  if (isProductionRuntime()) {
    if (!connectionString) {
      throw new ApiError(
        500,
        "DATABASE_URL is required in production. Refusing to use file-backed storage.",
        "database_url_missing",
      );
    }

    if (isLocalDatabaseUrl(connectionString)) {
      throw new ApiError(
        500,
        "DATABASE_URL points at localhost in production. Configure a reachable Postgres database.",
        "database_url_invalid_for_production",
      );
    }

    return "prisma";
  }

  if (isProductionBuild() && requestedDriver !== "prisma") {
    return "file";
  }

  return connectionString ? "prisma" : "file";
}

export function getStorageConfiguration() {
  const connectionString = process.env.DATABASE_URL?.trim();

  return {
    driver: getStorageDriver(),
    requestedDriver: getRequestedStorageDriver(),
    databaseUrlConfigured: Boolean(connectionString),
    databaseUrlIsLocal: connectionString ? isLocalDatabaseUrl(connectionString) : false,
    productionRuntime: isProductionRuntime(),
    productionBuild: isProductionBuild(),
  };
}

function assertProductionStorageConfigured() {
  if (isProductionRuntime() && !isPrismaStorageEnabled()) {
    throw new ApiError(
      500,
      "Production storage is not configured. DATABASE_URL must point to Postgres.",
      "production_storage_not_configured",
    );
  }
}

export function isRecoverablePrismaConnectionError(error: unknown): boolean {
  if (!error) {
    return false;
  }

  if (error instanceof AggregateError) {
    return error.errors.some(isRecoverablePrismaConnectionError);
  }

  if (typeof error !== "object") {
    return false;
  }

  const code = "code" in error ? String(error.code) : "";
  const message =
    "message" in error && typeof error.message === "string" ? error.message : "";

  return (
    code === "P1001" ||
    code === "ECONNREFUSED" ||
    message.includes("Can't reach database server") ||
    message.includes("ECONNREFUSED") ||
    message.includes("connect ECONNREFUSED")
  );
}

async function ensureStateFile() {
  const dataDirectory = getDataDirectory();
  const stateFilePath = getStateFilePath();
  await fs.mkdir(dataDirectory, { recursive: true });

  try {
    await fs.access(stateFilePath);
  } catch {
    await fs.writeFile(
      stateFilePath,
      JSON.stringify(getRuntimeSeedState(), null, 2),
      "utf8",
    );
  }
}

async function readAppStateFromFile(): Promise<AppState> {
  assertProductionStorageConfigured();
  await ensureStateFile();
  const stateFilePath = getStateFilePath();
  const file = await fs.readFile(stateFilePath, "utf8");
  const parsed = JSON.parse(file.replace(/^\uFEFF/, "")) as Partial<AppState>;
  const fallback = getRuntimeSeedState();
  return applyOAuthBootstrapUsers(
      sanitizeRuntimeState({
        ...fallback,
        ...parsed,
        dataAccessContracts: parsed.dataAccessContracts ?? fallback.dataAccessContracts,
        inviteTokens: parsed.inviteTokens ?? fallback.inviteTokens ?? [],
        replyTemplates: parsed.replyTemplates ?? fallback.replyTemplates ?? [],
        conversationReminders: parsed.conversationReminders ?? fallback.conversationReminders ?? [],
        featureFlags: parsed.featureFlags ?? fallback.featureFlags ?? [],
        outgoingWebhookEndpoints:
          parsed.outgoingWebhookEndpoints ?? fallback.outgoingWebhookEndpoints ?? [],
        partnerApiKeys: parsed.partnerApiKeys ?? fallback.partnerApiKeys ?? [],
        weeklyDigests: parsed.weeklyDigests ?? fallback.weeklyDigests ?? [],
        teamNotes: parsed.teamNotes ?? fallback.teamNotes,
      } as AppState),
  );
}

async function writeAppStateToFile(state: AppState): Promise<AppState> {
  assertProductionStorageConfigured();
  const dataDirectory = getDataDirectory();
  const stateFilePath = getStateFilePath();
  await fs.mkdir(dataDirectory, { recursive: true });
  writeQueue = writeQueue.then(() =>
    fs.writeFile(stateFilePath, JSON.stringify(state, null, 2), "utf8"),
  );
  await writeQueue;
  return state;
}

export async function readAppState(): Promise<AppState> {
  assertProductionStorageConfigured();
  if (isPrismaStorageEnabled()) {
    try {
      await ensurePrismaSeeded();
      return applyOAuthBootstrapUsers(
        sanitizeRuntimeState(await readAppStateFromPrisma()),
      );
    } catch (error) {
      if (!isRecoverablePrismaConnectionError(error)) {
        throw error;
      }

      if (isProductionRuntime()) {
        throw new ApiError(
          503,
          "Prisma storage is unavailable in production. Refusing to fall back to file-backed storage.",
          "prisma_storage_unavailable",
        );
      }

      if (!isProductionBuild()) {
        console.warn(
          "Prisma storage is unavailable; falling back to file-backed app state.",
        );
      }
    }
  }

  return readAppStateFromFile();
}

export async function writeAppState(state: AppState): Promise<AppState> {
  assertProductionStorageConfigured();
  if (isPrismaStorageEnabled()) {
    try {
      return await writeAppStateToPrisma(state);
    } catch (error) {
      if (!isRecoverablePrismaConnectionError(error)) {
        throw error;
      }

      if (isProductionRuntime()) {
        throw new ApiError(
          503,
          "Prisma write failed in production. Refusing to fall back to file-backed storage.",
          "prisma_storage_unavailable",
        );
      }

      if (!isProductionBuild()) {
        console.warn(
          "Prisma write failed because the database is unavailable; falling back to file-backed storage.",
        );
      }
    }
  }

  return writeAppStateToFile(state);
}

export async function mutateAppState(
  mutator: (state: AppState) => AppState | Promise<AppState>,
): Promise<AppState> {
  return enqueueMutation(async () => {
    const state = await readAppState();
    const nextState = await mutator(state);
    assertProductionStorageConfigured();
    if (isPrismaStorageEnabled()) {
      try {
        return await writeAppStateDeltaToPrisma(state, nextState);
      } catch (error) {
        if (!isRecoverablePrismaConnectionError(error)) {
          throw error;
        }

        if (isProductionRuntime()) {
          throw new ApiError(
            503,
            "Prisma write failed in production. Refusing to fall back to file-backed storage.",
            "prisma_storage_unavailable",
          );
        }

        if (!isProductionBuild()) {
          console.warn(
            "Prisma write failed because the database is unavailable; falling back to file-backed app state.",
          );
        }
      }
    }

    return writeAppStateToFile(nextState);
  });
}

export async function resetAppState(): Promise<AppState> {
  return enqueueMutation(() =>
    isPrismaStorageEnabled()
      ? resetPrismaState()
      : writeAppStateToFile(getRuntimeSeedState()),
  );
}
