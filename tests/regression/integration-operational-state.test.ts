import assert from "node:assert/strict";
import test from "node:test";
import type { Integration, IntegrationEvent } from "../../src/domain/types";
import { buildIntegrationOperationalState } from "../../src/features/operations/integration-operational-state";

const baseIntegration: Integration = {
  encryptedCredentials: "enc:test",
  healthScore: 96,
  id: "int-web",
  organizationId: "org-1",
  provider: "web_form",
  status: "active",
  webhookSecret: "secret",
};

function event(patch: Partial<IntegrationEvent>): IntegrationEvent {
  return {
    createdAt: "2026-06-06T09:00:00.000Z",
    id: patch.id ?? "evt-1",
    organizationId: "org-1",
    payloadJson: {},
    processedAt: patch.processedAt,
    provider: patch.provider ?? "web_form",
    providerEventId: patch.providerEventId ?? "provider-evt-1",
    retryCount: patch.retryCount ?? 0,
    status: patch.status ?? "processed",
    ...patch,
  };
}

test("active integrations expose runtime evidence and reliability", () => {
  const state = buildIntegrationOperationalState({
    events: [
      event({ id: "evt-1", status: "processed" }),
      event({ id: "evt-2", status: "processed", providerEventId: "provider-evt-2" }),
    ],
    integration: {
      ...baseIntegration,
      lastSyncAt: "2026-06-06T09:25:00.000Z",
    },
    nowMs: Date.parse("2026-06-06T09:40:00.000Z"),
    provider: "web_form",
  });

  assert.equal(state.tone, "live");
  assert.equal(state.statusLabel, "Live and healthy");
  assert.equal(state.lastActivityLabel, "15m ago");
  assert.equal(state.eventSummary, "2/2 processed");
  assert.equal(state.reliabilityLabel, "100% reliable");
});

test("active integrations with failed events move into attention state", () => {
  const state = buildIntegrationOperationalState({
    events: [
      event({ id: "evt-1", status: "processed" }),
      event({ id: "evt-2", status: "failed", errorMessage: "Webhook rejected" }),
    ],
    integration: baseIntegration,
    nowMs: Date.parse("2026-06-06T10:00:00.000Z"),
    provider: "web_form",
  });

  assert.equal(state.tone, "attention");
  assert.equal(state.statusLabel, "Live with recent warnings");
  assert.equal(state.eventSummary, "1/2 processed, 1 failed");
  assert.match(state.nextAction, /Review failed events/);
});

test("missing integrations explain setup as the next action", () => {
  const state = buildIntegrationOperationalState({
    events: [],
    nowMs: Date.parse("2026-06-06T10:00:00.000Z"),
    provider: "whatsapp",
  });

  assert.equal(state.tone, "setup");
  assert.equal(state.statusLabel, "Setup required");
  assert.equal(state.lastActivityLabel, "No activity yet");
  assert.equal(state.reliabilityLabel, "No traffic yet");
  assert.match(state.nextAction, /Add WhatsApp credentials/);
});

