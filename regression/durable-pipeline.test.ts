import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { defaultOrganizationId } from "../../src/domain/seed-data";

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

test("webhook dedupe key includes provider account and external event id", async () => {
  const { createWebhookDedupeKey } = await import("../../src/server/webhook-pipeline");

  assert.equal(
    createWebhookDedupeKey({
      provider: "telegram",
      channelProvider: "telegram",
      providerAccountKey: "bot-a",
      externalEventId: "update-1",
    }),
    createWebhookDedupeKey({
      provider: "telegram",
      channelProvider: "telegram",
      providerAccountKey: "bot-a",
      externalEventId: "update-1",
    }),
  );
  assert.notEqual(
    createWebhookDedupeKey({
      provider: "telegram",
      channelProvider: "telegram",
      providerAccountKey: "bot-a",
      externalEventId: "update-1",
    }),
    createWebhookDedupeKey({
      provider: "telegram",
      channelProvider: "telegram",
      providerAccountKey: "bot-b",
      externalEventId: "update-1",
    }),
  );
});

test("webhook external event id falls back to raw payload hash", async () => {
  const { resolveWebhookExternalEventId } = await import("../../src/server/webhook-pipeline");
  const rawBody = JSON.stringify({ message: "hello" });

  assert.equal(
    resolveWebhookExternalEventId(undefined, rawBody),
    `hash-${createHash("sha256").update(rawBody).digest("hex").slice(0, 40)}`,
  );
});

test("queue runtime fails closed in production when REDIS_URL is missing", async () => {
  const { assertQueueRuntimeConfigured } = await import("../../src/server/queue-runtime");

  withEnv(
    {
      NODE_ENV: "production",
      NEXT_PHASE: undefined,
      REDIS_URL: undefined,
    },
    () => {
      assert.throws(
        () => assertQueueRuntimeConfigured(),
        /REDIS_URL/i,
      );
    },
  );
});

test("outbound outbox payload keeps local message durable before provider send", async () => {
  const { buildOutboundOutboxPayload } = await import("../../src/server/outbox-pipeline");

  const payload = buildOutboundOutboxPayload({
    organizationId: defaultOrganizationId,
    conversationId: "conv-1",
    leadId: "lead-1",
    localProviderMessageId: "local-msg-1",
    provider: "telegram",
    providerThreadId: "chat-1",
    providerContactId: "chat-1",
    text: "Hello",
    actorUserId: "user-manager",
  });

  assert.equal(payload.eventName, "messaging.outbound.requested");
  assert.equal(payload.payloadJson.localProviderMessageId, "local-msg-1");
  assert.equal(payload.payloadJson.deliveryState, "pending");
});

test("live webhook routes are wired through durable receipt services", async () => {
  const routes = await Promise.all(
    [
      "src/app/api/v1/webhooks/telegram/route.ts",
      "src/app/api/v1/webhooks/meta/route.ts",
      "src/app/api/v1/webhooks/web-form/route.ts",
      "src/app/api/v1/webhooks/stripe/route.ts",
    ].map((file) => readFile(file, "utf8")),
  );

  for (const source of routes.slice(0, 3)) {
    assert.match(source, /acceptInboundWebhook/);
    assert.doesNotMatch(source, /createLeadFromInbound/);
  }

  assert.match(routes[3], /acceptStripeWebhook/);
});
