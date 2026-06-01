import crypto from "node:crypto";
import type {
  PmsConnectionStatus as PrismaPmsConnectionStatus,
  PmsProvider as PrismaPmsProvider,
  PmsSyncStatus as PrismaPmsSyncStatus,
} from "@/generated/prisma";
import { ApiError } from "./api-error";
import { decryptIntegrationSecret } from "./integration-secrets";
import { structuredLog } from "./observability";
import { prisma } from "./prisma";
import { enqueuePmsSyncPoll } from "./queue-runtime";
import { withRedisLease } from "./redis-lock";

export type PmsProvider = "jane_app" | "cliniko" | "mindbody";
export type PmsConnectionStatus = "active" | "pending" | "degraded" | "disconnected";
export type PmsSyncStatus = "success" | "failed" | "skipped";

const pmsProviders = new Set<PmsProvider>(["jane_app", "cliniko", "mindbody"]);
const appointmentDeletedActions = new Set(["delete", "deleted", "destroy", "removed"]);
const normalizedAppointmentStatuses = new Set([
  "scheduled",
  "confirmed",
  "completed",
  "canceled",
  "deleted",
  "no_show",
]);
const pmsApiTimeoutMs = 5000;
const pmsApiAttempts = 2;

export interface PmsConnectionRecord {
  id: string;
  organizationId: string;
  provider: PmsProvider;
  apiKeyEncrypted: string;
  lastSyncedAt: Date | null;
  status: PmsConnectionStatus;
}

export interface PmsAppointmentSnapshot {
  organizationId: string;
  pmsId: string;
  patientName: string;
  patientPhone?: string | null;
  startAt: Date;
  endAt: Date;
  type: string;
  status: string;
}

export interface PmsAppointmentRecord extends PmsAppointmentSnapshot {
  id: string;
  syncedAt: Date;
}

export interface PmsUpsertResult {
  appointment: PmsAppointmentRecord;
  created: boolean;
  changed: boolean;
}

export interface PmsConnectionHealth {
  id: string;
  provider: PmsProvider;
  status: PmsConnectionStatus;
  lastSyncedAt: string | null;
  errorCount24h: number;
}

export interface PmsRepository {
  findConnection(input: {
    organizationId: string;
    provider: PmsProvider;
  }): Promise<PmsConnectionRecord | null>;
  listActiveConnections(): Promise<PmsConnectionRecord[]>;
  listConnectionHealth(organizationId: string, since: Date): Promise<PmsConnectionHealth[]>;
  upsertAppointment(snapshot: PmsAppointmentSnapshot, syncedAt: Date): Promise<PmsUpsertResult>;
  createSyncLog(input: {
    organizationId: string;
    direction: "inbound" | "outbound";
    recordId: string;
    status: PmsSyncStatus;
    error?: string;
  }): Promise<void>;
  markConnectionSyncResult(input: {
    connectionId: string;
    status: PmsConnectionStatus;
    syncedAt?: Date;
  }): Promise<void>;
}

interface PmsCredentialPayload {
  apiKey?: string;
  token?: string;
  webhookSecret?: string;
  baseUrl?: string;
}

interface NormalizedPmsWebhook {
  provider: PmsProvider;
  organizationId: string;
  eventId: string;
  action: string;
  appointment: PmsAppointmentSnapshot;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return undefined;
}

function normalizeDate(value: unknown, field: string): Date {
  const raw = firstString(value);
  if (!raw) {
    throw new ApiError(400, `${field} is required`, "validation_error", { field });
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError(400, `${field} must be an ISO date`, "validation_error", { field });
  }

  return parsed;
}

function normalizeOptionalDate(value: unknown): Date | undefined {
  const raw = firstString(value);
  if (!raw) {
    return undefined;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function normalizePmsProvider(value: unknown): PmsProvider | undefined {
  const normalized = firstString(value)
    ?.toLowerCase()
    .replaceAll("-", "_")
    .replaceAll(" ", "_");

  if (normalized === "jane" || normalized === "janeapp") {
    return "jane_app";
  }

  return normalized && pmsProviders.has(normalized as PmsProvider)
    ? (normalized as PmsProvider)
    : undefined;
}

function firstNonEmptyRecord(...values: unknown[]): Record<string, unknown> {
  for (const value of values) {
    const record = asRecord(value);
    if (Object.keys(record).length > 0) {
      return record;
    }
  }

  return {};
}

function pickAppointmentContainer(payload: Record<string, unknown>): Record<string, unknown> {
  const data = asRecord(payload.data);
  const object = asRecord(data.object);
  return firstNonEmptyRecord(payload.appointment, object, data.appointment, data);
}

function normalizeAction(rawAction: string | undefined): string {
  const action = rawAction?.toLowerCase().split(".").pop()?.trim();
  return action || "upsert";
}

function normalizeAppointmentStatus(
  appointment: Record<string, unknown>,
  action: string,
): string {
  if (appointmentDeletedActions.has(action)) {
    return "deleted";
  }

  const raw = firstString(appointment.status, appointment.state, appointment.appointment_status)
    ?.toLowerCase()
    .trim()
    .replaceAll("-", "_")
    .replaceAll(" ", "_");
  if (!raw) {
    return "scheduled";
  }

  if (raw === "cancelled") {
    return "canceled";
  }
  if (raw === "noshow" || raw === "no_showed" || raw === "missed") {
    return "no_show";
  }
  if (raw === "done" || raw === "finished") {
    return "completed";
  }
  if (raw === "booked") {
    return "confirmed";
  }

  return normalizedAppointmentStatuses.has(raw) ? raw : "scheduled";
}

function normalizeAppointmentSnapshot(input: {
  organizationId: string;
  action: string;
  appointment: Record<string, unknown>;
}): PmsAppointmentSnapshot {
  const patient = asRecord(input.appointment.patient);
  const client = asRecord(input.appointment.client);
  const pmsId = firstString(
    input.appointment.pms_id,
    input.appointment.appointment_id,
    input.appointment.id,
    input.appointment.uuid,
  );

  if (!pmsId) {
    throw new ApiError(400, "appointment id is required", "validation_error", {
      field: "appointment.id",
    });
  }

  const startAt = normalizeDate(
    input.appointment.start_at ??
      input.appointment.start ??
      input.appointment.starts_at ??
      input.appointment.startTime,
    "appointment.start_at",
  );
  const endAt =
    normalizeOptionalDate(
      input.appointment.end_at ??
        input.appointment.end ??
        input.appointment.ends_at ??
        input.appointment.endTime,
    ) ?? new Date(startAt.getTime() + 30 * 60 * 1000);

  return {
    organizationId: input.organizationId,
    pmsId,
    patientName:
      firstString(
        input.appointment.patient_name,
        patient.name,
        client.name,
        input.appointment.client_name,
      ) ?? "Patient",
    patientPhone: firstString(
      input.appointment.patient_phone,
      patient.phone,
      patient.mobile,
      client.phone,
      client.mobile,
    ),
    startAt,
    endAt,
    type:
      firstString(
        input.appointment.type,
        input.appointment.appointment_type,
        input.appointment.service_name,
        input.appointment.name,
      ) ?? "Appointment",
    status: normalizeAppointmentStatus(input.appointment, input.action),
  };
}

export function normalizePmsWebhookPayload(
  payload: Record<string, unknown>,
  headers: Headers,
): NormalizedPmsWebhook {
  const provider = normalizePmsProvider(
    headers.get("x-pms-provider") ??
      headers.get("x-provider") ??
      payload.provider ??
      payload.pms_provider,
  );
  if (!provider) {
    throw new ApiError(400, "PMS provider is required", "validation_error", {
      field: "provider",
    });
  }

  const organizationId = firstString(
    headers.get("x-clinic-id"),
    headers.get("x-organization-id"),
    payload.clinic_id,
    payload.clinicId,
    payload.organizationId,
    payload.organization_id,
  );
  if (!organizationId) {
    throw new ApiError(400, "clinic_id is required", "validation_error", {
      field: "clinic_id",
    });
  }

  const action = normalizeAction(
    firstString(payload.event, payload.event_type, payload.type, payload.action),
  );
  const appointment = pickAppointmentContainer(payload);
  const snapshot = normalizeAppointmentSnapshot({ organizationId, action, appointment });
  const eventId =
    firstString(
      headers.get("idempotency-key"),
      payload.event_id,
      payload.webhook_id,
      payload.id,
    ) ?? `${provider}:${organizationId}:${snapshot.pmsId}:${action}:${snapshot.startAt.toISOString()}`;

  return {
    provider,
    organizationId,
    eventId,
    action,
    appointment: snapshot,
  };
}

function safeCompare(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function stripSignaturePrefix(value: string): string {
  return value.trim().replace(/^sha256=/i, "");
}

function hmacSha256Hex(secret: string, value: string): string {
  return crypto.createHmac("sha256", secret).update(value, "utf8").digest("hex");
}

export function verifyPmsWebhookSignature(input: {
  rawBody: string;
  signature: string | null;
  secret: string;
  timestamp?: string | null;
}): boolean {
  const signature = input.signature ? stripSignaturePrefix(input.signature) : "";
  if (!signature || !input.secret) {
    return false;
  }

  const candidates = [
    hmacSha256Hex(input.secret, input.rawBody),
    input.timestamp ? hmacSha256Hex(input.secret, `${input.timestamp}.${input.rawBody}`) : "",
  ].filter(Boolean);

  return candidates.some((candidate) => safeCompare(candidate, signature));
}

function providerEnvPrefix(provider: PmsProvider): string {
  return provider.toUpperCase();
}

export function decryptPmsCredentials(value: string): PmsCredentialPayload {
  const decrypted = decryptIntegrationSecret<PmsCredentialPayload | string>(value);
  if (typeof decrypted === "string") {
    return { apiKey: decrypted, webhookSecret: decrypted };
  }
  if (decrypted && typeof decrypted === "object") {
    return decrypted;
  }

  return {};
}

export function resolvePmsWebhookSecret(
  provider: PmsProvider,
  connection: PmsConnectionRecord,
): string | undefined {
  const envPrefix = providerEnvPrefix(provider);
  return (
    process.env[`${envPrefix}_PMS_WEBHOOK_SECRET`]?.trim() ||
    process.env[`${envPrefix}_WEBHOOK_SECRET`]?.trim() ||
    process.env.PMS_WEBHOOK_SECRET?.trim() ||
    decryptPmsCredentials(connection.apiKeyEncrypted).webhookSecret ||
    decryptPmsCredentials(connection.apiKeyEncrypted).apiKey
  );
}

export function extractPmsSignatureHeaders(headers: Headers) {
  return {
    signature:
      headers.get("x-pms-signature") ??
      headers.get("x-jane-signature") ??
      headers.get("x-cliniko-signature") ??
      headers.get("x-mindbody-signature") ??
      headers.get("x-signature") ??
      headers.get("x-hub-signature-256"),
    timestamp:
      headers.get("x-pms-timestamp") ??
      headers.get("x-timestamp") ??
      headers.get("x-jane-timestamp") ??
      headers.get("x-cliniko-timestamp") ??
      headers.get("x-mindbody-timestamp"),
  };
}

export function mergePmsAppointmentSnapshot(
  existing: PmsAppointmentRecord | null,
  snapshot: PmsAppointmentSnapshot,
  syncedAt: Date,
): PmsAppointmentRecord {
  return {
    id: existing?.id ?? `appt-${crypto.randomUUID()}`,
    ...snapshot,
    syncedAt,
  };
}

export function hasPmsAppointmentChanged(
  existing: PmsAppointmentRecord | null,
  snapshot: PmsAppointmentSnapshot,
): boolean {
  if (!existing) {
    return true;
  }

  return (
    existing.patientName !== snapshot.patientName ||
    existing.patientPhone !== snapshot.patientPhone ||
    existing.startAt.getTime() !== snapshot.startAt.getTime() ||
    existing.endAt.getTime() !== snapshot.endAt.getTime() ||
    existing.type !== snapshot.type ||
    existing.status !== snapshot.status
  );
}

export class PrismaPmsRepository implements PmsRepository {
  async findConnection(input: {
    organizationId: string;
    provider: PmsProvider;
  }): Promise<PmsConnectionRecord | null> {
    const connection = await prisma.pmsConnection.findUnique({
      where: {
        organizationId_provider: {
          organizationId: input.organizationId,
          provider: input.provider as PrismaPmsProvider,
        },
      },
    });

    return connection
      ? {
          id: connection.id,
          organizationId: connection.organizationId,
          provider: connection.provider as PmsProvider,
          apiKeyEncrypted: connection.apiKeyEncrypted,
          lastSyncedAt: connection.lastSyncedAt,
          status: connection.status as PmsConnectionStatus,
        }
      : null;
  }

  async listActiveConnections(): Promise<PmsConnectionRecord[]> {
    const connections = await prisma.pmsConnection.findMany({
      where: { status: "active" },
    });

    return connections.map((connection) => ({
      id: connection.id,
      organizationId: connection.organizationId,
      provider: connection.provider as PmsProvider,
      apiKeyEncrypted: connection.apiKeyEncrypted,
      lastSyncedAt: connection.lastSyncedAt,
      status: connection.status as PmsConnectionStatus,
    }));
  }

  async listConnectionHealth(
    organizationId: string,
    since: Date,
  ): Promise<PmsConnectionHealth[]> {
    const connections = await prisma.pmsConnection.findMany({
      where: { organizationId },
      orderBy: { createdAt: "asc" },
    });

    return Promise.all(
      connections.map(async (connection) => ({
        id: connection.id,
        provider: connection.provider as PmsProvider,
        status: connection.status as PmsConnectionStatus,
        lastSyncedAt: connection.lastSyncedAt?.toISOString() ?? null,
        errorCount24h: await prisma.pmsSyncLog.count({
          where: {
            organizationId,
            status: "failed",
            createdAt: { gte: since },
          },
        }),
      })),
    );
  }

  async upsertAppointment(
    snapshot: PmsAppointmentSnapshot,
    syncedAt: Date,
  ): Promise<PmsUpsertResult> {
    const existing = await prisma.appointment.findUnique({
      where: {
        organizationId_pmsId: {
          organizationId: snapshot.organizationId,
          pmsId: snapshot.pmsId,
        },
      },
    });
    const changed = hasPmsAppointmentChanged(existing, snapshot);

    const appointment = await prisma.appointment.upsert({
      where: {
        organizationId_pmsId: {
          organizationId: snapshot.organizationId,
          pmsId: snapshot.pmsId,
        },
      },
      create: {
        organizationId: snapshot.organizationId,
        pmsId: snapshot.pmsId,
        patientName: snapshot.patientName,
        patientPhone: snapshot.patientPhone,
        startAt: snapshot.startAt,
        endAt: snapshot.endAt,
        type: snapshot.type,
        status: snapshot.status,
        syncedAt,
      },
      update: {
        patientName: snapshot.patientName,
        patientPhone: snapshot.patientPhone,
        startAt: snapshot.startAt,
        endAt: snapshot.endAt,
        type: snapshot.type,
        status: snapshot.status,
        syncedAt,
      },
    });

    return {
      appointment,
      created: !existing,
      changed,
    };
  }

  async createSyncLog(input: {
    organizationId: string;
    direction: "inbound" | "outbound";
    recordId: string;
    status: PmsSyncStatus;
    error?: string;
  }): Promise<void> {
    await prisma.pmsSyncLog.create({
      data: {
        organizationId: input.organizationId,
        direction: input.direction,
        recordId: input.recordId,
        status: input.status as PrismaPmsSyncStatus,
        error: input.error,
      },
    });
  }

  async markConnectionSyncResult(input: {
    connectionId: string;
    status: PmsConnectionStatus;
    syncedAt?: Date;
  }): Promise<void> {
    await prisma.pmsConnection.update({
      where: { id: input.connectionId },
      data: {
        status: input.status as PrismaPmsConnectionStatus,
        lastSyncedAt: input.syncedAt,
      },
    });
  }
}

export async function processPmsWebhook(input: {
  repository: PmsRepository;
  payload: Record<string, unknown>;
  headers: Headers;
  syncedAt?: Date;
}) {
  const event = normalizePmsWebhookPayload(input.payload, input.headers);
  const connection = await input.repository.findConnection({
    organizationId: event.organizationId,
    provider: event.provider,
  });

  if (!connection || connection.status === "disconnected") {
    throw new ApiError(404, "Active PMS connection was not found", "pms_connection_not_found");
  }

  const syncedAt = input.syncedAt ?? new Date();
  const result = await input.repository.upsertAppointment(event.appointment, syncedAt);
  await input.repository.createSyncLog({
    organizationId: event.organizationId,
    direction: "inbound",
    recordId: event.appointment.pmsId,
    status: "success",
  });
  await input.repository.markConnectionSyncResult({
    connectionId: connection.id,
    status: "active",
    syncedAt,
  });

  structuredLog("info", "pms.webhook.processed", {
    provider: event.provider,
    organizationId: event.organizationId,
    eventId: event.eventId,
    appointmentId: result.appointment.id,
    created: result.created,
    changed: result.changed,
  });

  return {
    status: result.created ? "created" : result.changed ? "updated" : "duplicate",
    eventId: event.eventId,
    appointmentId: result.appointment.id,
    pmsId: event.appointment.pmsId,
    created: result.created,
    changed: result.changed,
  };
}

function resolvePmsApiBaseUrl(provider: PmsProvider, credentials: PmsCredentialPayload): string | undefined {
  const envPrefix = providerEnvPrefix(provider);
  return credentials.baseUrl ?? process.env[`${envPrefix}_PMS_BASE_URL`]?.trim();
}

function resolvePmsApiKey(provider: PmsProvider, credentials: PmsCredentialPayload): string | undefined {
  const envPrefix = providerEnvPrefix(provider);
  return (
    credentials.apiKey ??
    credentials.token ??
    process.env[`${envPrefix}_PMS_API_KEY`]?.trim() ??
    process.env.PMS_API_KEY?.trim()
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPmsJsonWithRetry(url: URL, apiKey: string): Promise<Record<string, unknown>> {
  let lastStatus: number | undefined;

  for (let attempt = 1; attempt <= pmsApiAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), pmsApiTimeoutMs);

    try {
      const response = await fetch(url, {
        headers: {
          accept: "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        signal: controller.signal,
      });
      lastStatus = response.status;

      if (response.ok) {
        return asRecord(await response.json());
      }

      if (attempt === pmsApiAttempts || response.status >= 400 && response.status < 500) {
        throw new ApiError(response.status, "PMS API request failed", "pms_api_failed");
      }
    } catch (error) {
      if (attempt === pmsApiAttempts || error instanceof ApiError) {
        if (error instanceof DOMException && error.name === "AbortError") {
          throw new ApiError(504, "PMS API request timed out", "pms_api_timeout");
        }
        if (error instanceof ApiError) {
          throw error;
        }
        throw new ApiError(502, "PMS API request failed", "pms_api_failed");
      }
    } finally {
      clearTimeout(timeout);
    }

    await delay(250 * attempt);
  }

  throw new ApiError(lastStatus ?? 502, "PMS API request failed", "pms_api_failed");
}

async function fetchPmsAppointmentChanges(connection: PmsConnectionRecord) {
  const credentials = decryptPmsCredentials(connection.apiKeyEncrypted);
  const baseUrl = resolvePmsApiBaseUrl(connection.provider, credentials);
  const apiKey = resolvePmsApiKey(connection.provider, credentials);
  if (!baseUrl || !apiKey) {
    throw new ApiError(422, "PMS API credentials are not configured", "pms_credentials_missing");
  }

  const url = new URL("/appointments", baseUrl);
  if (connection.lastSyncedAt) {
    url.searchParams.set("updated_since", connection.lastSyncedAt.toISOString());
  }

  const body = await fetchPmsJsonWithRetry(url, apiKey);
  const rows = Array.isArray(body.appointments)
    ? body.appointments
    : Array.isArray(body.data)
      ? body.data
      : [];

  return rows.map((row) =>
    normalizeAppointmentSnapshot({
      organizationId: connection.organizationId,
      action: "upsert",
      appointment: asRecord(row),
    }),
  );
}

export async function pollPmsConnection(
  repository: PmsRepository,
  connection: PmsConnectionRecord,
  syncedAt = new Date(),
) {
  return withRedisLease({
    key: `pms-sync:${connection.id}`,
    ttlSeconds: 5 * 60,
    onLockUnavailable: () => ({ processed: 0, skipped: true as const, reason: "lock_held" }),
    run: () => pollPmsConnectionUnlocked(repository, connection, syncedAt),
  });
}

async function pollPmsConnectionUnlocked(
  repository: PmsRepository,
  connection: PmsConnectionRecord,
  syncedAt: Date,
) {
  try {
    const appointments = await fetchPmsAppointmentChanges(connection);
    let processed = 0;

    for (const appointment of appointments) {
      await repository.upsertAppointment(appointment, syncedAt);
      await repository.createSyncLog({
        organizationId: connection.organizationId,
        direction: "inbound",
        recordId: appointment.pmsId,
        status: "success",
      });
      processed += 1;
    }

    await repository.markConnectionSyncResult({
      connectionId: connection.id,
      status: "active",
      syncedAt,
    });
    structuredLog("info", "pms.poll.completed", {
      organizationId: connection.organizationId,
      provider: connection.provider,
      processed,
    });

    return { processed };
  } catch (error) {
    await repository.createSyncLog({
      organizationId: connection.organizationId,
      direction: "inbound",
      recordId: connection.id,
      status: "failed",
      error: error instanceof ApiError ? error.code : "pms_poll_failed",
    });
    await repository.markConnectionSyncResult({
      connectionId: connection.id,
      status: "degraded",
    });
    throw error;
  }
}

export async function runDuePmsPollingFallback(repository: PmsRepository = new PrismaPmsRepository()) {
  const connections = await repository.listActiveConnections();
  const results = [];

  for (const connection of connections) {
    results.push(await pollPmsConnection(repository, connection));
  }

  return {
    connections: connections.length,
    processed: results.reduce((sum, result) => sum + result.processed, 0),
  };
}

export async function schedulePmsPollingFallbackJobs(
  repository: PmsRepository = new PrismaPmsRepository(),
) {
  const connections = await repository.listActiveConnections();
  const results = [];

  for (const connection of connections) {
    results.push(await enqueuePmsSyncPoll(connection.id));
  }

  return {
    connections: connections.length,
    queued: results.filter((result) => result.queued).length,
  };
}

export async function getPmsConnectionHealth(
  organizationId: string,
  repository: PmsRepository = new PrismaPmsRepository(),
) {
  return repository.listConnectionHealth(
    organizationId,
    new Date(Date.now() - 24 * 60 * 60 * 1000),
  );
}
