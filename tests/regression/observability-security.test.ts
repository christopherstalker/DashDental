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

async function withEnvAsync<T>(
  values: Record<string, string | undefined>,
  callback: () => Promise<T>,
): Promise<T> {
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
    return await callback();
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
  const { captureError, redactForLog } = await import("../../src/server/observability");

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

  const captured = captureError(new Error("Patient Jane Doe SELECT * FROM users"));
  const capturedSerialized = JSON.stringify(captured);
  assert.equal(capturedSerialized.includes("Jane Doe"), false);
  assert.equal(capturedSerialized.includes("SELECT *"), false);
});

test("API error details are redacted before returning JSON", async () => {
  const { ApiError, errorResponse } = await import("../../src/server/api-helpers");

  const response = errorResponse(
    new ApiError(400, "Invalid patient payload", "validation_error", {
      patientName: "Jane Doe",
      phone: "+15555550123",
      field: "patientName",
    }),
  );
  const payload = await response.json();
  const serialized = JSON.stringify(payload);

  assert.equal(response.status, 400);
  assert.equal(serialized.includes("Jane Doe"), false);
  assert.equal(serialized.includes("+15555550123"), false);
  assert.match(serialized, /__redacted__/);
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

test("Stripe webhook route rejects malformed signed payloads without leaking parser errors", async () => {
  const { POST } = await import("../../src/app/api/v1/webhooks/stripe/route");
  const secret = "whsec_route_secret";
  const body = "{not-json";
  const timestamp = Math.floor(Date.now() / 1000);

  const response = await withEnvAsync({ STRIPE_WEBHOOK_SECRET: secret }, () =>
    POST(
      new Request("https://dashdental.space/api/v1/webhooks/stripe", {
        body,
        headers: {
          "stripe-signature": stripeSignature(secret, body, timestamp),
        },
        method: "POST",
      }),
    ),
  );
  const payload = await response.json();

  assert.equal(response.status, 400);
  assert.equal(payload.error, "Stripe webhook payload is invalid");
  assert.equal(JSON.stringify(payload).includes("SyntaxError"), false);
});

test("PMS webhook route rejects malformed JSON as validation error before DB work", async () => {
  const { POST } = await import("../../src/app/api/pms/webhook/route");

  const response = await POST(
    new Request("https://dashdental.space/api/pms/webhook", {
      body: "{not-json",
      method: "POST",
    }),
  );
  const payload = await response.json();

  assert.equal(response.status, 400);
  assert.equal(payload.error, "PMS webhook payload is invalid");
  assert.equal(JSON.stringify(payload).includes("SyntaxError"), false);
});

test("public health route uses generic unexpected error responses", async () => {
  const source = await readFile("src/app/api/v1/health/storage/route.ts", "utf8");

  assert.match(source, /captureError/);
  assert.match(source, /Storage health check failed/);
  assert.doesNotMatch(source, /error instanceof Error \\? error\\.message/);
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
