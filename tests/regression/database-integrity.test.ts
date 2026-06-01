import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { join } from "node:path";

const root = process.cwd();
const schema = readFileSync(join(root, "prisma/schema.prisma"), "utf8");
const integrityMigration = readFileSync(
  join(root, "prisma/migrations/20260601153000_production_data_integrity/migration.sql"),
  "utf8",
);

test("AI cost estimates are stored as exact numeric values, not floats", () => {
  assert.match(schema, /costEstimate\s+Decimal/);
  assert.doesNotMatch(schema, /costEstimate\s+Float/);
  assert.match(integrityMigration, /ALTER COLUMN "costEstimate" TYPE NUMERIC\(12,\s*6\)/);
});

test("status-like free-text columns are constrained at the database boundary", () => {
  for (const constraint of [
    "User_status_check",
    "Membership_status_check",
    "TeamInviteToken_emailDeliveryStatus_check",
    "Conversation_status_check",
    "ConversationReminder_status_check",
    "OutgoingWebhookEndpoint_status_check",
    "PartnerApiKey_status_check",
    "WeeklyDigest_status_check",
    "DataAccessContract_status_check",
    "Subscription_status_check",
    "AutomationRule_trigger_check",
    "AiInsight_type_check",
    "IntegrationEvent_status_check",
    "Contact_lifecycleStatus_check",
    "ConversationProjection_status_check",
    "ConversationProjection_responseState_check",
    "appointments_status_check",
  ]) {
    assert.match(integrityMigration, new RegExp(`conname = '${constraint}'`));
    assert.match(integrityMigration, new RegExp(`ADD CONSTRAINT "${constraint}"\\s+CHECK`, "s"));
  }
});

test("new FK and hot-path indexes are represented in schema and migration", () => {
  for (const index of [
    "Membership_organizationId_status_createdAt_idx",
    "Conversation_leadId_idx",
    "MessageDelivery_organizationId_updatedAt_idx",
    "TeamNote_authorUserId_createdAt_idx",
    "Subscription_organizationId_updatedAt_idx",
    "BillingEvent_subscriptionId_idx",
    "AiInsight_leadId_idx",
    "WebhookReceipt_integrationId_idx",
    "WebhookReceipt_organizationId_receivedAt_idx",
    "OutboxEvent_receiptId_idx",
  ]) {
    assert.match(integrityMigration, new RegExp(`CREATE INDEX IF NOT EXISTS "${index}"`));
  }

  for (const schemaIndex of [
    "@@index([organizationId, status, createdAt])",
    "@@index([leadId])",
    "@@index([organizationId, updatedAt])",
    "@@index([authorUserId, createdAt])",
    "@@index([subscriptionId])",
    "@@index([integrationId])",
    "@@index([organizationId, receivedAt])",
    "@@index([receiptId])",
  ]) {
    assert.ok(schema.includes(schemaIndex), `Missing schema index ${schemaIndex}`);
  }
});

test("PMS appointment statuses are normalized before database constraints apply", async () => {
  const { normalizePmsWebhookPayload } = await import("../../src/server/pms-sync");
  const headers = new Headers({
    "x-pms-provider": "cliniko",
    "x-clinic-id": "clinic-1",
  });

  const booked = normalizePmsWebhookPayload(
    {
      event: "appointment.updated",
      appointment: {
        id: "apt-1",
        start_at: "2026-06-01T12:00:00.000Z",
        status: "Booked",
      },
    },
    headers,
  );
  assert.equal(booked.appointment.status, "confirmed");

  const unknown = normalizePmsWebhookPayload(
    {
      event: "appointment.updated",
      appointment: {
        id: "apt-2",
        start_at: "2026-06-01T13:00:00.000Z",
        status: "vendor private custom state",
      },
    },
    headers,
  );
  assert.equal(unknown.appointment.status, "scheduled");
});

test("sensitive credential persistence uses application encryption", () => {
  const guidedOnboarding = readFileSync(join(root, "src/server/guided-onboarding.ts"), "utf8");
  const phoneCapture = readFileSync(join(root, "src/server/phone-capture.ts"), "utf8");
  const integrationSecrets = readFileSync(join(root, "src/server/integration-secrets.ts"), "utf8");

  assert.match(integrationSecrets, /createCipheriv\("aes-256-gcm"/);
  assert.match(guidedOnboarding, /apiKeyEncrypted:\s*encryptIntegrationSecret\(\{ apiKey, baseUrl, webhookSecret \}\)/);
  assert.doesNotMatch(guidedOnboarding, /apiKeyEncrypted:\s*apiKey/);
  assert.match(phoneCapture, /encryptedCredentials:\s*encryptIntegrationSecret\(credentials\)/);
});

test("analytics persistence failures do not log raw database errors", () => {
  const productAnalytics = readFileSync(join(root, "src/server/product-analytics.ts"), "utf8");
  assert.match(productAnalytics, /captureError\(error/);
  assert.doesNotMatch(productAnalytics, /error\.message/);
});
