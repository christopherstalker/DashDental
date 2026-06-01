import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import type {
  PmsAppointmentRecord,
  PmsAppointmentSnapshot,
  PmsConnectionHealth,
  PmsConnectionRecord,
  PmsConnectionStatus,
  PmsRepository,
  PmsSyncStatus,
} from "../../src/server/pms-sync";
import {
  hasPmsAppointmentChanged,
  mergePmsAppointmentSnapshot,
  processPmsWebhook,
  verifyPmsWebhookSignature,
} from "../../src/server/pms-sync";

class InMemoryPmsRepository implements PmsRepository {
  readonly connections = new Map<string, PmsConnectionRecord>();
  readonly appointments = new Map<string, PmsAppointmentRecord>();
  readonly syncLogs: Array<{
    organizationId: string;
    direction: "inbound" | "outbound";
    recordId: string;
    status: PmsSyncStatus;
    error?: string;
  }> = [];

  constructor(connection: PmsConnectionRecord) {
    this.connections.set(`${connection.organizationId}:${connection.provider}`, connection);
  }

  async findConnection(input: {
    organizationId: string;
    provider: PmsConnectionRecord["provider"];
  }) {
    return this.connections.get(`${input.organizationId}:${input.provider}`) ?? null;
  }

  async listActiveConnections() {
    return [...this.connections.values()].filter((connection) => connection.status === "active");
  }

  async listConnectionHealth(organizationId: string): Promise<PmsConnectionHealth[]> {
    return [...this.connections.values()]
      .filter((connection) => connection.organizationId === organizationId)
      .map((connection) => ({
        id: connection.id,
        provider: connection.provider,
        status: connection.status,
        lastSyncedAt: connection.lastSyncedAt?.toISOString() ?? null,
        errorCount24h: this.syncLogs.filter((log) => log.status === "failed").length,
      }));
  }

  async upsertAppointment(snapshot: PmsAppointmentSnapshot, syncedAt: Date) {
    const key = `${snapshot.organizationId}:${snapshot.pmsId}`;
    const existing = this.appointments.get(key) ?? null;
    const changed = hasPmsAppointmentChanged(existing, snapshot);
    const appointment = mergePmsAppointmentSnapshot(existing, snapshot, syncedAt);
    this.appointments.set(key, appointment);

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
  }) {
    this.syncLogs.push(input);
  }

  async markConnectionSyncResult(input: {
    connectionId: string;
    status: PmsConnectionStatus;
    syncedAt?: Date;
  }) {
    for (const [key, connection] of this.connections) {
      if (connection.id === input.connectionId) {
        this.connections.set(key, {
          ...connection,
          status: input.status,
          lastSyncedAt: input.syncedAt ?? connection.lastSyncedAt,
        });
      }
    }
  }
}

function pmsSignature(secret: string, rawBody: string, timestamp?: string) {
  return crypto
    .createHmac("sha256", secret)
    .update(timestamp ? `${timestamp}.${rawBody}` : rawBody)
    .digest("hex");
}

test("PMS appointment conflict resolution keeps PMS as source of truth", () => {
  const syncedAt = new Date("2026-06-01T10:00:00.000Z");
  const existing: PmsAppointmentRecord = {
    id: "appt-local",
    organizationId: "clinic-1",
    pmsId: "pms-42",
    patientName: "Local Edited Name",
    patientPhone: "+15550001111",
    startAt: new Date("2026-06-02T09:00:00.000Z"),
    endAt: new Date("2026-06-02T09:30:00.000Z"),
    type: "Consult",
    status: "scheduled",
    syncedAt: new Date("2026-05-31T10:00:00.000Z"),
  };
  const pmsSnapshot: PmsAppointmentSnapshot = {
    organizationId: "clinic-1",
    pmsId: "pms-42",
    patientName: "PMS Source Name",
    patientPhone: "+15550002222",
    startAt: new Date("2026-06-03T11:00:00.000Z"),
    endAt: new Date("2026-06-03T11:45:00.000Z"),
    type: "Implant consult",
    status: "confirmed",
  };

  assert.equal(hasPmsAppointmentChanged(existing, pmsSnapshot), true);
  assert.deepEqual(mergePmsAppointmentSnapshot(existing, pmsSnapshot, syncedAt), {
    id: "appt-local",
    ...pmsSnapshot,
    syncedAt,
  });
});

test("PMS webhook processing is idempotent by clinic and pms appointment id", async () => {
  const repository = new InMemoryPmsRepository({
    id: "pms-conn-1",
    organizationId: "clinic-1",
    provider: "cliniko",
    apiKeyEncrypted: "test",
    lastSyncedAt: null,
    status: "active",
  });
  const payload = {
    clinic_id: "clinic-1",
    provider: "cliniko",
    event_id: "evt-1",
    event_type: "appointment.updated",
    appointment: {
      id: "appointment-1",
      patient_name: "Patient One",
      patient_phone: "+15550001111",
      start_at: "2026-06-04T09:00:00.000Z",
      end_at: "2026-06-04T09:30:00.000Z",
      type: "New patient",
      status: "confirmed",
    },
  };
  const headers = new Headers({ "x-pms-provider": "cliniko", "x-clinic-id": "clinic-1" });

  const first = await processPmsWebhook({
    repository,
    payload,
    headers,
    syncedAt: new Date("2026-06-01T10:00:00.000Z"),
  });
  const second = await processPmsWebhook({
    repository,
    payload,
    headers,
    syncedAt: new Date("2026-06-01T10:01:00.000Z"),
  });

  assert.equal(first.status, "created");
  assert.equal(second.status, "duplicate");
  assert.equal(repository.appointments.size, 1);
  assert.equal(repository.syncLogs.length, 2);
  assert.equal(repository.appointments.get("clinic-1:appointment-1")?.status, "confirmed");
});

test("PMS webhook HMAC verifier supports raw-body and timestamp signatures", () => {
  const secret = "pms-secret";
  const rawBody = JSON.stringify({ id: "evt-1" });
  const timestamp = "1770000000";

  assert.equal(
    verifyPmsWebhookSignature({
      rawBody,
      secret,
      signature: `sha256=${pmsSignature(secret, rawBody)}`,
    }),
    true,
  );
  assert.equal(
    verifyPmsWebhookSignature({
      rawBody,
      secret,
      timestamp,
      signature: pmsSignature(secret, rawBody, timestamp),
    }),
    true,
  );
  assert.equal(
    verifyPmsWebhookSignature({
      rawBody,
      secret,
      signature: pmsSignature("wrong", rawBody),
    }),
    false,
  );
});
