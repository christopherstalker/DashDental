import type { AppState, DataAccessContract, Provider } from "@/domain/types";
import { addAudit } from "./state-mutations";

const clinicDbTables = ["dental_recovery_leads"];
const clinicDbFields = [
  "external_id",
  "name",
  "phone",
  "email",
  "source",
  "status",
  "assigned_to",
  "first_message_at",
  "first_human_response_at",
  "booked_at",
  "lost_reason",
  "estimated_value",
  "updated_at",
  "last_message_text",
];

function createRuntimeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createDefaultClinicDbContract(input: {
  organizationId: string;
  actorUserId?: string;
  nowIso: string;
}): DataAccessContract {
  return {
    id: createRuntimeId("dac-clinic-db"),
    organizationId: input.organizationId,
    provider: "clinic_database",
    status: "pending_it_approval",
    purpose:
      "Read lead intake, response, booking, and loss signals for Dash Dental dashboard analytics.",
    tables: clinicDbTables,
    fields: clinicDbFields,
    piiCategories: [
      "Patient contact details",
      "Lead status and appointment metadata",
      "Last inbound message snippet",
    ],
    retentionDays: 365,
    readOnly: true,
    createdBy: input.actorUserId ?? "system",
    createdAt: input.nowIso,
    updatedAt: input.nowIso,
  };
}

export function getDataAccessContract(
  state: AppState,
  input: { organizationId: string; provider: Provider },
): DataAccessContract | undefined {
  return state.dataAccessContracts.find(
    (contract) =>
      contract.organizationId === input.organizationId &&
      contract.provider === input.provider,
  );
}

export function hasApprovedClinicDbContract(
  state: AppState,
  organizationId: string,
): boolean {
  const contract = getDataAccessContract(state, {
    organizationId,
    provider: "clinic_database",
  });

  return Boolean(
    contract?.status === "approved" &&
      contract.readOnly &&
      contract.tables.includes("dental_recovery_leads"),
  );
}

export function updateDataAccessContractApproval(
  state: AppState,
  input: {
    organizationId: string;
    provider: Provider;
    action: "approve" | "revoke";
    actorUserId?: string;
    approvedByName?: string;
    approvedByEmail?: string;
    nowIso?: string;
  },
): AppState {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const existing =
    getDataAccessContract(state, {
      organizationId: input.organizationId,
      provider: input.provider,
    }) ??
    (input.provider === "clinic_database"
      ? createDefaultClinicDbContract({
          organizationId: input.organizationId,
          actorUserId: input.actorUserId,
          nowIso,
        })
      : undefined);

  if (!existing) {
    return state;
  }

  const nextContract: DataAccessContract =
    input.action === "approve"
      ? {
          ...existing,
          status: "approved",
          approvedByName: input.approvedByName?.trim() || existing.approvedByName,
          approvedByEmail: input.approvedByEmail?.trim() || existing.approvedByEmail,
          approvedAt: nowIso,
          revokedAt: undefined,
          updatedAt: nowIso,
        }
      : {
          ...existing,
          status: "revoked",
          revokedAt: nowIso,
          updatedAt: nowIso,
        };

  const hasExisting = state.dataAccessContracts.some((contract) => contract.id === existing.id);
  let nextState: AppState = {
    ...state,
    dataAccessContracts: hasExisting
      ? state.dataAccessContracts.map((contract) =>
          contract.id === existing.id ? nextContract : contract,
        )
      : [...state.dataAccessContracts, nextContract],
  };

  nextState = addAudit(nextState, {
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: `data_access_contract.${input.action === "approve" ? "approved" : "revoked"}`,
    entityType: "data_access_contract",
    entityId: nextContract.id,
    metadataJson: {
      provider: input.provider,
      tables: nextContract.tables,
      fields: nextContract.fields,
      readOnly: nextContract.readOnly,
      approvedByEmail: nextContract.approvedByEmail,
    },
  });

  return nextState;
}
