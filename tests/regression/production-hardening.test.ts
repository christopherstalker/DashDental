import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { defaultOrganizationId } from "../../src/domain/seed-data";
import type { AppState, Conversation, Lead } from "../../src/domain/types";
import { getRuntimeSeedState } from "../../src/server/runtime-state";
import { createLeadFromInbound } from "../../src/server/state-mutations";
import { encryptIntegrationSecret } from "../../src/server/integration-secrets";
import { createSessionPayload, encodeSession } from "../../src/server/session";
import { verifyMetaWebhookSignature } from "../../src/server/channel-integrations";
import * as prismaStore from "../../src/server/prisma-store";

function withEnv<T>(values: Record<string, string | undefined>, callback: () => T): T {
  const previous = new Map<string, string | undefined>();

  for (const [key, value] of Object.entries(values)) {
    previous.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return callback();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

function appendUnrelatedTenant(state: AppState): AppState {
  return {
    ...state,
    users: [
      ...state.users,
      {
        id: "user-other-tenant",
        email: "owner@other.example",
        name: "Other Owner",
        avatar: "",
        status: "active",
        lastLoginAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    organizations: [
      ...state.organizations,
      {
        id: "org-other-tenant",
        name: "Other Clinic",
        timezone: "UTC",
        currency: "USD",
        averagePatientValue: 700,
        businessHours: state.organizations[0]?.businessHours ?? {},
        status: "active",
      },
    ],
    memberships: [
      ...state.memberships,
      {
        id: "membership-other-tenant",
        userId: "user-other-tenant",
        organizationId: "org-other-tenant",
        role: "owner",
        status: "active",
      },
    ],
    leads: [
      ...state.leads,
      {
        id: "lead-other-tenant",
        organizationId: "org-other-tenant",
        name: "Unrelated Patient",
        source: "web_form",
        status: "new",
        providerContactId: "unrelated-contact",
        firstMessageAt: "2026-01-01T00:00:00.000Z",
        estimatedValue: 700,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
  };
}

test("production session signing refuses development fallback secrets", () => {
  withEnv(
    {
      NODE_ENV: "production",
      NEXT_PHASE: undefined,
      SESSION_SECRET: undefined,
    },
    () => {
      assert.throws(
        () =>
          encodeSession(
            createSessionPayload({
              userId: "user-owner",
              organizationId: defaultOrganizationId,
              now: 1_767_225_600_000,
            }),
          ),
        /SESSION_SECRET/i,
      );
    },
  );
});

test("production integration encryption refuses fallback secrets", () => {
  withEnv(
    {
      NODE_ENV: "production",
      NEXT_PHASE: undefined,
      INTEGRATION_SECRET: undefined,
      SESSION_SECRET: undefined,
    },
    () => {
      assert.throws(
        () => encryptIntegrationSecret({ token: "provider-token" }),
        /INTEGRATION_SECRET/i,
      );
    },
  );
});

test("Meta webhook signature verification fails closed when no app secret exists", () => {
  const state: AppState = {
    ...getRuntimeSeedState(),
    integrations: [],
  };

  assert.equal(verifyMetaWebhookSignature(state, "{\"entry\":[]}", null), false);
});

test("managed messaging connector activates and delivers without provider credentials", async () => {
  const {
    provisionManagedMessagingIntegration,
    resolveMessagingCredentials,
    sendLiveProviderMessage,
  } = await import("../../src/server/channel-integrations");
  const organizationId = defaultOrganizationId;
  const lead: Lead = {
    id: "lead-managed-whatsapp",
    organizationId,
    name: "Managed Patient",
    phone: "+15551234567",
    source: "whatsapp",
    status: "new",
    providerContactId: "15551234567",
    firstMessageAt: "2026-05-01T09:00:00.000Z",
    estimatedValue: 500,
    createdAt: "2026-05-01T09:00:00.000Z",
    updatedAt: "2026-05-01T09:00:00.000Z",
  };
  const conversation: Conversation = {
    id: "conv-managed-whatsapp",
    organizationId,
    leadId: lead.id,
    provider: "whatsapp",
    providerThreadId: "15551234567",
    status: "open",
    lastMessageAt: "2026-05-01T09:00:00.000Z",
  };
  const state = provisionManagedMessagingIntegration(getRuntimeSeedState(), {
    actorUserId: "user-owner",
    organizationId,
    provider: "whatsapp",
  });
  const integration = state.integrations.find(
    (item) => item.organizationId === organizationId && item.provider === "whatsapp",
  );
  const credentials = resolveMessagingCredentials(state, organizationId, "whatsapp");
  const result = await sendLiveProviderMessage(state, conversation, lead, "Can we book tomorrow?");

  assert.equal(integration?.status, "active");
  assert.equal(integration?.healthScore, 96);
  assert.equal(credentials?.connectorMode, "managed");
  assert.equal(credentials?.managedByDashDental, true);
  assert.equal(result.payloadJson.connectorMode, "managed");
  assert.equal(result.payloadJson.live, false);
});

test("Prisma delta writes do not issue full-table deletes or delete unrelated tenant data", async () => {
  const previous = appendUnrelatedTenant(getRuntimeSeedState());
  const next = createLeadFromInbound(previous, {
    organizationId: defaultOrganizationId,
    name: "Regression Patient",
    source: "web_form",
    providerEventId: "regression-event",
    providerMessageId: "regression-message",
    providerContactId: "regression-contact",
    providerThreadId: "regression-thread",
    messageText: "Need an appointment",
    nowIso: "2026-01-02T00:00:00.000Z",
  });
  const calls: Array<{ model: string; method: string; args: unknown }> = [];
  const tx = new Proxy(
    {},
    {
      get: (_target, model: string) =>
        new Proxy(
          {},
          {
            get: (_innerTarget, method: string) => async (args: unknown) => {
              calls.push({ model, method, args });
              return method === "findMany" ? [] : {};
            },
          },
        ),
    },
  );
  const client = {
    $transaction: async (callback: (transactionClient: unknown) => Promise<void>) =>
      callback(tx),
  };

  const writeAppStateDeltaToPrisma = (
    prismaStore as Record<string, unknown>
  ).writeAppStateDeltaToPrisma;
  assert.equal(typeof writeAppStateDeltaToPrisma, "function");

  await (
    writeAppStateDeltaToPrisma as (
      previousState: AppState,
      nextState: AppState,
      client: never,
    ) => Promise<AppState>
  )(previous, next, client as never);

  assert.equal(
    calls.some(
      (call) =>
        call.method === "deleteMany" &&
        (!call.args ||
          typeof call.args !== "object" ||
          !("where" in call.args) ||
          Object.keys((call.args as { where?: object }).where ?? {}).length === 0),
    ),
    false,
  );
  assert.equal(
    calls.some((call) => JSON.stringify(call.args).includes("lead-other-tenant")),
    false,
  );
  assert.equal(calls.some((call) => call.model === "lead" && call.method === "upsert"), true);
  assert.equal(calls.some((call) => call.model === "message" && call.method === "upsert"), true);
});

test("outbound conversation route does not send provider-first before local durability", async () => {
  const routeSource = await readFile(
    "src/app/api/v1/conversations/[id]/messages/route.ts",
    "utf8",
  );

  assert.equal(routeSource.includes("sendLiveProviderMessage("), false);
});
