import type { AppState, Integration } from "@/domain/types";
import { addAudit } from "./state-mutations";
import { decryptIntegrationSecret, encryptIntegrationSecret } from "./integration-secrets";

export interface ClinicDbConnectionConfig {
  connectionString: string;
  ssl: boolean;
}

function createRuntimeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
        status: "pending",
        encryptedCredentials: "",
        webhookSecret: "not-used-read-only-sync",
        healthScore: 20,
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

function hasApprovedClinicDbContract(state: AppState, organizationId: string): boolean {
  return state.dataAccessContracts.some(
    (contract) =>
      contract.organizationId === organizationId &&
      contract.provider === "clinic_database" &&
      contract.status === "approved" &&
      contract.readOnly,
  );
}

function legacyEnvConfig(value: string): ClinicDbConnectionConfig | undefined {
  const envName = value.slice("env:".length).trim();
  if (!envName) {
    return undefined;
  }

  const connectionString = process.env[envName]?.trim();
  if (!connectionString) {
    return undefined;
  }

  return {
    connectionString,
    ssl: process.env.CLINIC_DATABASE_SSL === "true",
  };
}

export function isClinicDbConnectionConfigured(integration?: Integration): boolean {
  return Boolean(integration?.encryptedCredentials?.trim());
}

export function resolveClinicDbConnectionConfig(
  state: AppState,
  organizationId: string,
): ClinicDbConnectionConfig | undefined {
  const integration = state.integrations.find(
    (item) =>
      item.organizationId === organizationId &&
      item.provider === "clinic_database",
  );
  const storedCredentials = integration?.encryptedCredentials?.trim();

  if (storedCredentials) {
    if (storedCredentials.startsWith("enc:v1.")) {
      return decryptIntegrationSecret<ClinicDbConnectionConfig>(storedCredentials);
    }

    if (storedCredentials.startsWith("env:")) {
      return legacyEnvConfig(storedCredentials);
    }
  }

  return undefined;
}

export function updateClinicDbConnectionConfig(
  state: AppState,
  input: {
    organizationId: string;
    connectionString: string;
    ssl: boolean;
    actorUserId?: string;
    nowIso?: string;
  },
): AppState {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const contractApproved = hasApprovedClinicDbContract(state, input.organizationId);
  const encryptedCredentials = encryptIntegrationSecret({
    connectionString: input.connectionString,
    ssl: input.ssl,
  } satisfies ClinicDbConnectionConfig);

  let nextState: AppState = {
    ...state,
    integrations: upsertClinicDbIntegration(state.integrations, input.organizationId, {
      encryptedCredentials,
      status: contractApproved ? "pending" : "pending",
      errorState: contractApproved
        ? "Connection saved. Run the first sync to validate access."
        : "Connection saved. Approve the IT contract, then run the first sync.",
      healthScore: 52,
    }),
  };

  nextState = addAudit(nextState, {
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "clinic_db.credentials_updated",
    entityType: "integration",
    entityId:
      nextState.integrations.find(
        (integration) =>
          integration.organizationId === input.organizationId &&
          integration.provider === "clinic_database",
      )?.id ?? input.organizationId,
    metadataJson: {
      ssl: input.ssl,
      configuredAt: nowIso,
    },
  });

  return nextState;
}
