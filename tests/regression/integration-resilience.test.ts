import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { join } from "node:path";
import { ApiError } from "../../src/server/api-error";
import { parseTwilioWebhookPayload } from "../../src/server/phone-capture";

const root = process.cwd();

async function withEnv<T>(values: Record<string, string | undefined>, callback: () => T | Promise<T>): Promise<T> {
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

test("Twilio malformed JSON is a validation error, not an unexpected 500", () => {
  assert.throws(
    () => parseTwilioWebhookPayload("{not-json", "application/json"),
    (error) =>
      error instanceof ApiError &&
      error.status === 400 &&
      error.code === "validation_error",
  );
});

test("Twilio invalid signatures are rejected before inbound materialization", () => {
  const source = readFileSync(join(root, "src/server/phone-capture.ts"), "utf8");
  const invalidSignatureCheck = source.indexOf('signatureStatus === "invalid"');
  const acceptInboundCall = source.indexOf("acceptInboundWebhook({");

  assert.ok(invalidSignatureCheck > 0, "missing invalid signature check");
  assert.ok(acceptInboundCall > invalidSignatureCheck, "signature must be checked before acceptInboundWebhook");
  assert.match(source, /throw new ApiError\(403,\s*"Invalid Twilio signature"/);
});

test("Twilio auto-reply sends use timeout and bounded retries without PHI logs", () => {
  const source = readFileSync(join(root, "src/server/phone-capture.ts"), "utf8");
  assert.match(source, /const twilioSmsAttempts = 3/);
  assert.match(source, /const twilioSmsTimeoutMs = 5000/);
  assert.match(source, /AbortController/);
  assert.doesNotMatch(source, /phone\.auto_reply_failed[\s\S]*error\.message/);
});

test("PMS polling uses a Redis SET NX EX lease and bounded API retries", () => {
  const lockSource = readFileSync(join(root, "src/server/redis-lock.ts"), "utf8");
  const pmsSource = readFileSync(join(root, "src/server/pms-sync.ts"), "utf8");

  assert.match(lockSource, /client\.set\(input\.key,\s*token,\s*"EX",\s*input\.ttlSeconds,\s*"NX"\)/);
  assert.match(pmsSource, /withRedisLease\(\{/);
  assert.match(pmsSource, /const pmsApiTimeoutMs = 5000/);
  assert.match(pmsSource, /const pmsApiAttempts = 2/);
});

test("PMS webhook acknowledges after signature verification and processes with Next after", () => {
  const source = readFileSync(join(root, "src/app/api/pms/webhook/route.ts"), "utf8");
  const verification = source.indexOf("verifyPmsWebhookSignature");
  const afterCall = source.indexOf("after(async () =>");
  const response = source.indexOf("received: true");

  assert.ok(verification > 0, "missing PMS signature verification");
  assert.ok(afterCall > verification, "PMS work must be scheduled after verification");
  assert.ok(response > afterCall, "route should return an immediate acknowledgement");
  assert.match(source, /status:\s*200/);
});

test("Stripe webhook handling stays idempotent before subscription mutation", () => {
  const source = readFileSync(join(root, "src/server/billing-ledger.ts"), "utf8");
  const existingEventCheck = source.indexOf("tx.billingEvent.findUnique");
  const subscriptionMutation = source.indexOf("tx.subscription.update");

  assert.ok(existingEventCheck > 0, "missing provider event idempotency lookup");
  assert.ok(subscriptionMutation > existingEventCheck, "event idempotency must happen before subscription mutation");
  assert.match(source, /status === "processed" \|\| existingEvent\?\.status === "skipped"/);
});

test("email delivery never throws on missing production provider config", async () => {
  await withEnv(
    {
      EMAIL_FROM: undefined,
      NEXT_PHASE: undefined,
      NODE_ENV: "production",
      RESEND_API_KEY: undefined,
    },
    async () => {
      const { sendEmailWithResend } = await import("../../src/server/email-delivery");
      const result = await sendEmailWithResend({
        html: "<p>Verify</p>",
        subject: "Verify your Dash Dental account",
        text: "Verify",
        to: "owner@example.com",
      });

      assert.equal(result.status, "failed");
      assert.equal(result.error, "email_delivery_not_configured");
    },
  );
});

test("email subjects with patient data are blocked before provider calls", async () => {
  await withEnv(
    {
      EMAIL_FROM: "Dash Dental <noreply@example.com>",
      NODE_ENV: "production",
      RESEND_API_KEY: "test-key",
    },
    async () => {
      const { sendEmailWithResend } = await import("../../src/server/email-delivery");
      const result = await sendEmailWithResend({
        html: "<p>Blocked</p>",
        subject: "Patient DOB 1990-01-01",
        text: "Blocked",
        to: "owner@example.com",
      });

      assert.equal(result.status, "failed");
      assert.equal(result.error, "email_subject_contains_patient_data");
    },
  );
});
