import { Pool, type QueryResultRow } from "pg";
import type {
  AppState,
  Integration,
  Lead,
  LeadStatus,
  LostReason,
  Message,
  Provider,
} from "@/domain/types";
import { resolveClinicDbConnectionConfig } from "./clinic-db-integration";
import { addAudit } from "./state-mutations";

const validProviders = new Set<Provider>([
  "telegram",
  "web_form",
  "instagram",
  "whatsapp",
  "clinic_database",
]);

const validStatuses = new Set<LeadStatus>([
  "new",
  "unanswered",
  "at_risk",
  "in_conversation",
  "booked",
  "lost",
]);

const validLostReasons = new Set<LostReason>([
  "no_response",
  "price",
  "chose_competitor",
  "spam",
  "not_relevant",
]);

export class ClinicDbSyncSetupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClinicDbSyncSetupError";
  }
}

interface ClinicDbLeadRow extends QueryResultRow {
  external_id: string | number;
  name: string | null;
  phone: string | null;
  email: string | null;
  source: string | null;
  status: string | null;
  assigned_to: string | null;
  first_message_at: Date | string | null;
  first_human_response_at: Date | string | null;
  booked_at: Date | string | null;
  lost_reason: string | null;
  estimated_value: string | number | null;
  updated_at: Date | string | null;
  last_message_text: string | null;
}

export interface ClinicDbSyncResult {
  state: AppState;
  imported: number;
  updated: number;
  skipped: number;
}

function createRuntimeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toIso(value: Date | string | null | undefined, fallback: string): string {
  if (!value) {
    return fallback;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
}

function toProvider(value: string | null): Provider {
  return value && validProviders.has(value as Provider)
    ? (value as Provider)
    : "clinic_database";
}

function toLeadStatus(value: string | null): LeadStatus {
  return value && validStatuses.has(value as LeadStatus) ? (value as LeadStatus) : "new";
}

function toLostReason(value: string | null): LostReason | undefined {
  return value && validLostReasons.has(value as LostReason) ? (value as LostReason) : undefined;
}

function toNumber(value: string | number | null, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function upsertClinicDbIntegration(
  integrations: Integration[],
  organizationId: string,
  patch: Partial<Integration>,
): Integration[] {
  const existing = integrations.find(
    (integration) =>
      integration.organizationId === organizationId &&
      integration.provider === "clinic_database",
  );

  if (!existing) {
    return [
      ...integrations,
      {
        id: createRuntimeId("int-clinic-db"),
        organizationId,
        provider: "clinic_database",
        status: "active",
        encryptedCredentials: "",
        webhookSecret: "not-used-read-only-sync",
        healthScore: 95,
        ...patch,
      },
    ];
  }

  return integrations.map((integration) =>
    integration.id === existing.id
      ? {
          ...integration,
          ...patch,
        }
      : integration,
  );
}

export async function fetchClinicDbLeadRows(input: {
  state: AppState;
  organizationId: string;
  limit?: number;
}): Promise<ClinicDbLeadRow[]> {
  const connection = resolveClinicDbConnectionConfig(input.state, input.organizationId);
  if (!connection?.connectionString) {
    throw new ClinicDbSyncSetupError(
      "Clinic DB connection is not configured. Add a read-only PostgreSQL URL in Integrations.",
    );
  }

  const pool = new Pool({
    connectionString: connection.connectionString,
    max: 1,
    ssl: connection.ssl ? { rejectUnauthorized: false } : undefined,
  });

  try {
    const result = await pool.query<ClinicDbLeadRow>(
      `
        select
          external_id,
          name,
          phone,
          email,
          source,
          status,
          assigned_to,
          first_message_at,
          first_human_response_at,
          booked_at,
          lost_reason,
          estimated_value,
          updated_at,
          last_message_text
        from dental_recovery_leads
        order by coalesce(updated_at, first_message_at) desc nulls last
        limit $1
      `,
      [input.limit ?? 500],
    );

    return result.rows;
  } finally {
    await pool.end();
  }
}

export function syncClinicDbRows(
  state: AppState,
  input: {
    organizationId: string;
    actorUserId?: string;
    nowIso: string;
    rows: ClinicDbLeadRow[];
  },
): ClinicDbSyncResult {
  const organization = state.organizations.find((item) => item.id === input.organizationId);
  const defaultValue = organization?.averagePatientValue ?? 500;
  const existingUserIds = new Set(state.users.map((user) => user.id));
  const leads = [...state.leads];
  const conversations = [...state.conversations];
  const messages = [...state.messages];
  const leadStatusHistory = [...state.leadStatusHistory];
  let imported = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of input.rows) {
    const externalId = String(row.external_id ?? "").trim();
    if (!externalId) {
      skipped += 1;
      continue;
    }

    const providerContactId = `clinic-db:${externalId}`;
    const existingIndex = leads.findIndex(
      (lead) =>
        lead.organizationId === input.organizationId &&
        lead.providerContactId === providerContactId,
    );
    const existingLead = existingIndex >= 0 ? leads[existingIndex] : undefined;
    const source = toProvider(row.source);
    const status = toLeadStatus(row.status);
    const firstMessageAt = toIso(row.first_message_at, input.nowIso);
    const updatedAt = toIso(row.updated_at, input.nowIso);
    const assignedTo =
      row.assigned_to && existingUserIds.has(row.assigned_to)
        ? row.assigned_to
        : existingLead?.assignedTo;

    const nextLead: Lead = {
      id: existingLead?.id ?? createRuntimeId("lead-clinic-db"),
      organizationId: input.organizationId,
      name: row.name?.trim() || existingLead?.name || "Clinic patient",
      phone: row.phone?.trim() || existingLead?.phone,
      email: row.email?.trim() || existingLead?.email,
      source,
      status,
      assignedTo,
      providerContactId,
      firstMessageAt,
      firstHumanResponseAt: toIso(
        row.first_human_response_at,
        existingLead?.firstHumanResponseAt ?? "",
      ),
      bookedAt: toIso(row.booked_at, existingLead?.bookedAt ?? ""),
      lostReason: status === "lost" ? toLostReason(row.lost_reason) ?? "no_response" : undefined,
      estimatedValue: toNumber(row.estimated_value, existingLead?.estimatedValue ?? defaultValue),
      createdAt: existingLead?.createdAt ?? firstMessageAt,
      updatedAt,
    };

    if (existingLead) {
      if (existingLead.status !== nextLead.status) {
        leadStatusHistory.unshift({
          id: createRuntimeId("history-clinic-db"),
          leadId: existingLead.id,
          fromStatus: existingLead.status,
          toStatus: nextLead.status,
          changedBy: input.actorUserId ?? "system",
          reason: "Clinic database sync",
          createdAt: input.nowIso,
        });
      }
      leads[existingIndex] = nextLead;
      updated += 1;
    } else {
      leads.unshift(nextLead);
      imported += 1;
    }

    const existingConversation = conversations.find(
      (conversation) => conversation.leadId === nextLead.id,
    );
    const conversation =
      existingConversation ??
      {
        id: createRuntimeId("conv-clinic-db"),
        organizationId: input.organizationId,
        leadId: nextLead.id,
        provider: source,
        providerThreadId: providerContactId,
        status: status === "booked" || status === "lost" ? "closed" : "open",
        lastMessageAt: updatedAt,
      };

    if (existingConversation) {
      const index = conversations.findIndex((item) => item.id === existingConversation.id);
      conversations[index] = {
        ...existingConversation,
        provider: source,
        status: status === "booked" || status === "lost" ? "closed" : existingConversation.status,
        lastMessageAt: updatedAt,
      };
    } else {
      conversations.unshift(conversation);
    }

    if (row.last_message_text?.trim()) {
      const providerMessageId = `clinic-db:${externalId}:last`;
      const messageIndex = messages.findIndex(
        (message) =>
          message.conversationId === conversation.id &&
          message.providerMessageId === providerMessageId,
      );
      const nextMessage: Message = {
        id: messageIndex >= 0 ? messages[messageIndex].id : createRuntimeId("msg-clinic-db"),
        conversationId: conversation.id,
        direction: "inbound",
        senderType: "patient",
        providerMessageId,
        text: row.last_message_text.trim(),
        sentAt: updatedAt,
        payloadJson: {
          syncedFrom: "dental_recovery_leads",
          externalId,
        },
      };

      if (messageIndex >= 0) {
        messages[messageIndex] = nextMessage;
      } else {
        messages.push(nextMessage);
      }
    }
  }

  let nextState: AppState = {
    ...state,
    leads,
    conversations,
    messages,
    leadStatusHistory,
    integrations: upsertClinicDbIntegration(state.integrations, input.organizationId, {
      status: "active",
      lastSyncAt: input.nowIso,
      errorState: undefined,
      healthScore: input.rows.length > 0 ? 98 : 82,
    }),
    integrationEvents: [
      {
        id: createRuntimeId("evt-clinic-db"),
        organizationId: input.organizationId,
        provider: "clinic_database",
        providerEventId: createRuntimeId("clinic-db-sync"),
        status: "processed",
        payloadJson: {
          imported,
          updated,
          skipped,
          rows: input.rows.length,
        },
        retryCount: 0,
        createdAt: input.nowIso,
        processedAt: input.nowIso,
      },
      ...state.integrationEvents,
    ],
  };

  nextState = addAudit(nextState, {
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "clinic_db.synced",
    entityType: "integration",
    entityId:
      nextState.integrations.find((integration) => integration.provider === "clinic_database")
        ?.id ?? input.organizationId,
    metadataJson: {
      imported,
      updated,
      skipped,
    },
  });

  return {
    state: nextState,
    imported,
    updated,
    skipped,
  };
}

export function recordClinicDbSyncFailure(
  state: AppState,
  input: {
    organizationId: string;
    actorUserId?: string;
    nowIso: string;
    message: string;
    setupRequired: boolean;
  },
): AppState {
  let nextState: AppState = {
    ...state,
    integrations: upsertClinicDbIntegration(state.integrations, input.organizationId, {
      status: input.setupRequired ? "pending" : "degraded",
      errorState: input.message,
      healthScore: input.setupRequired ? 35 : 12,
    }),
    integrationEvents: [
      {
        id: createRuntimeId("evt-clinic-db"),
        organizationId: input.organizationId,
        provider: "clinic_database",
        providerEventId: createRuntimeId("clinic-db-sync-failed"),
        status: "failed",
        payloadJson: {
          setupRequired: input.setupRequired,
        },
        retryCount: 0,
        errorMessage: input.message,
        createdAt: input.nowIso,
      },
      ...state.integrationEvents,
    ],
  };

  nextState = addAudit(nextState, {
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "clinic_db.sync_failed",
    entityType: "integration",
    entityId:
      nextState.integrations.find((integration) => integration.provider === "clinic_database")
        ?.id ?? input.organizationId,
    metadataJson: {
      message: input.message,
      setupRequired: input.setupRequired,
    },
  });

  return nextState;
}
