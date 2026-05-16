import type { AppState, Integration } from "@/domain/types";
import { ApiError } from "./api-error";
import { encryptIntegrationSecret } from "./integration-secrets";
import { addAudit } from "./state-mutations";

export interface WebFormIntegrationConfig {
  webhookSecret: string;
}

function createRuntimeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function sanitizeWebhookSecret(value: string): string {
  const normalized = value.trim();
  if (!/^[A-Za-z0-9_-]{6,256}$/.test(normalized)) {
    throw new ApiError(
      400,
      "webhookSecret must contain only A-Z, a-z, 0-9, _ or -",
      "validation_error",
      { field: "webhookSecret" },
    );
  }

  return normalized;
}

function upsertWebFormIntegration(
  integrations: Integration[],
  organizationId: string,
  patch: Partial<Integration>,
): Integration[] {
  const existing = integrations.find(
    (integration) =>
      integration.organizationId === organizationId &&
      integration.provider === "web_form",
  );

  if (!existing) {
    return [
      ...integrations,
      {
        id: createRuntimeId("int-web-form"),
        organizationId,
        provider: "web_form",
        status: "pending",
        encryptedCredentials: "",
        webhookSecret: "",
        healthScore: 0,
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

export function configureWebFormIntegration(
  state: AppState,
  input: {
    organizationId: string;
    webhookSecret: string;
    actorUserId?: string;
    nowIso?: string;
  },
): AppState {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const webhookSecret = sanitizeWebhookSecret(input.webhookSecret);
  const encryptedCredentials = encryptIntegrationSecret({
    webhookSecret,
  } satisfies WebFormIntegrationConfig);

  let nextState: AppState = {
    ...state,
    integrations: upsertWebFormIntegration(state.integrations, input.organizationId, {
      encryptedCredentials,
      webhookSecret,
      status: "active",
      errorState: "Website form webhook is active. Send a test lead before go-live.",
      healthScore: 92,
      lastSyncAt: nowIso,
    }),
  };

  const integration = nextState.integrations.find(
    (item) => item.organizationId === input.organizationId && item.provider === "web_form",
  );

  nextState = addAudit(nextState, {
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "web_form.credentials_updated",
    entityType: "integration",
    entityId: integration?.id ?? input.organizationId,
    metadataJson: {
      configuredAt: nowIso,
      status: "active",
    },
  });

  return nextState;
}
