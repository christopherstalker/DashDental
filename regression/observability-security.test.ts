import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getRuntimeSeedState } from "../../src/server/runtime-state";

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

function stripeSignature(secret: string, body: string, timestamp: number): string {
  const digest = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");

  return `t=${timestamp},v1=${digest}`;
}

test("structured logger redacts secrets tokens signatures and patient text", async () => {
  const { redactForLog } = await import("../../src/server/observability");

  const redacted = redactForLog({
    accessToken: "token-live-secret",
    webhookSecret: "webhook-secret",
    stripeSignature: "t=123,v1=abc",
    authorization: "Bearer secret",
    email: "patient@example.com",
    phone: "+15555550123",
    text: "My tooth hurts and I need pricing",
    nested: {
      botToken: "bot-token",
      safeStatus: "failed",
    },
  });

  const serialized = JSON.stringify(redacted);
  assert.equal(serialized.includes("token-live-secret"), false);
  assert.equal(serialized.includes("webhook-secret"), false);
  assert.equal(serialized.includes("patient@example.com"), false);
  assert.equal(serialized.includes("My tooth hurts"), false);
  assert.match(serialized, /__redacted__/);
  assert.match(serialized, /safeStatus/);
});

test("Stripe webhook verification rejects stale replay timestamps", async () => {
  const { verifyStripeWebhook } = await import("../../src/server/stripe");
  const secret = "whsec_test_secret";
  const body = JSON.stringify({ id: "evt_stale", type: "invoice.payment_failed" });
  const staleTimestamp = Math.floor(Date.now() / 1000) - 3600;

  withEnv({ STRIPE_WEBHOOK_SECRET: secret }, () => {
    assert.equal(
      verifyStripeWebhook({
        body,
        signature: stripeSignature(secret, body, staleTimestamp),
      }),
      false,
    );
  });
});

test("runtime health summary distinguishes app up from degraded dependencies", async () => {
  const { summarizeRuntimeHealth } = await import("../../src/server/runtime-health");

  const summary = summarizeRuntimeHealth({
    productionRuntime: true,
    storage: { ok: true, status: "reachable" },
    queue: { configured: false, required: true },
    stripe: { configured: false, provider: "stripe", required: true },
    metrics: {
      outboxFailed: 1,
      webhookFailed: 0,
      billingFailed: 0,
      entitlementDenials: 2,
    },
  });

  assert.equal(summary.app.status, "ok");
  assert.equal(summary.status, "unhealthy");
  assert.equal(summary.dependencies.queue.status, "unhealthy");
  assert.equal(summary.signals.entitlementDenials, 2);
});

test("runtime health does not degrade manual-only launches when Stripe is absent", async () => {
  const { summarizeRuntimeHealth } = await import("../../src/server/runtime-health");

  const summary = summarizeRuntimeHealth({
    productionRuntime: true,
    storage: { ok: true, status: "reachable" },
    queue: { configured: true, required: true },
    stripe: { configured: false, provider: "manual", required: false },
    metrics: {
      outboxFailed: 0,
      webhookFailed: 0,
      billingFailed: 0,
      entitlementDenials: 0,
      usageIngestionFailures: 0,
    },
  });

  assert.equal(summary.status, "ok");
  assert.equal(summary.dependencies.stripe.status, "not_required");
  assert.equal(summary.dependencies.stripe.required, false);
});

test("backfill dry-run plan is idempotent and non-destructive", async () => {
  const { planBackfillFromState } = await import("../../src/server/backfill-readiness");
  const state = getRuntimeSeedState();

  const first = planBackfillFromState(state, { dryRun: true });
  const second = planBackfillFromState(state, { dryRun: true });

  assert.deepEqual(first, second);
  assert.equal(first.dryRun, true);
  assert.equal(first.destructive, false);
  assert.ok(first.tasks.conversationProjections >= 0);
  assert.ok(first.tasks.messageDeliveries >= 0);
  assert.ok(first.tasks.usageRollups >= 0);
});

test("stuck runtime record detection reports webhook outbox and billing failures", async () => {
  const { detectStuckRuntimeRecords } = await import("../../src/server/runtime-reconciliation");
  const now = new Date("2026-05-02T12:00:00.000Z");
  const summary = detectStuckRuntimeRecords(
    {
      webhookReceipts: [
        {
          id: "receipt-stuck",
          processingStatus: "processing",
          receivedAt: new Date("2026-05-02T11:00:00.000Z"),
          retryCount: 0,
        },
      ],
      outboxEvents: [
        {
          id: "outbox-failed",
          status: "failed",
          availableAt: new Date("2026-05-02T11:55:00.000Z"),
          attemptCount: 1,
        },
      ],
      billingEvents: [
        {
          id: "billing-failed",
          status: "failed",
          updatedAt: new Date("2026-05-02T11:58:00.000Z"),
          retryCount: 2,
        },
      ],
    },
    { now, stuckAfterMs: 5 * 60 * 1000 },
  );

  assert.equal(summary.stuckWebhookReceipts.length, 1);
  assert.equal(summary.retryableOutboxEvents.length, 1);
  assert.equal(summary.failedBillingEvents.length, 1);
});

test("support routes require super admin and mutating actions call support audit", async () => {
  const routePaths = [
    "src/app/api/v1/admin/support/outbox/[outboxEventId]/replay/route.ts",
    "src/app/api/v1/admin/support/receipts/[receiptId]/replay/route.ts",
    "src/app/api/v1/admin/support/runtime/reconcile/route.ts",
    "src/app/api/v1/admin/support/runtime/recover/route.ts",
    "src/app/api/v1/admin/support/runtime/projections/rebuild/route.ts",
    "src/app/api/v1/admin/support/runtime/data-lifecycle/sweep/route.ts",
    "src/app/api/v1/admin/support/runtime/drills/[scenario]/run/route.ts",
  ];
  const sources = await Promise.all(routePaths.map((path) => readFile(path, "utf8")));

  for (const source of sources) {
    assert.match(source, /super_admin/);
    assert.match(source, /auditSupportActionFromRequest/);
  }
});
