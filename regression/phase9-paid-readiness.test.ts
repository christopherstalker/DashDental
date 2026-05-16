import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { ApiError } from "../../src/server/api-error";
import {
  assertPublicAuthBotProtection,
  isPublicAuthBotProtectionRequired,
} from "../../src/server/public-auth-bot-protection";
import { buildStripeLiveModeRehearsalPlan } from "../../src/server/stripe-rehearsal";

test("public auth bot protection fails closed when explicitly required", async () => {
  assert.equal(
    isPublicAuthBotProtectionRequired({
      REQUIRE_PUBLIC_AUTH_BOT_PROTECTION: "true",
    }),
    true,
  );

  await assert.rejects(
    () =>
      assertPublicAuthBotProtection({
        action: "register",
        env: {
          REQUIRE_PUBLIC_AUTH_BOT_PROTECTION: "true",
          TURNSTILE_SECRET_KEY: "",
        },
        request: new Request("https://dashdental.space/api/v1/auth/register"),
        token: "",
      }),
    (error) =>
      error instanceof ApiError &&
      error.status === 503 &&
      error.code === "bot_protection_not_configured",
  );
});

test("public auth bot protection verifies token before allowing protected auth", async () => {
  const result = await assertPublicAuthBotProtection({
    action: "login",
    env: {
      REQUIRE_PUBLIC_AUTH_BOT_PROTECTION: "true",
      TURNSTILE_SECRET_KEY: "turnstile-secret",
    },
    request: new Request("https://dashdental.space/api/v1/auth/session", {
      headers: {
        "cf-connecting-ip": "203.0.113.20",
      },
    }),
    token: "token-ok",
    verifyToken: async ({ remoteIp, secret, token }) => ({
      ok: secret === "turnstile-secret" && token === "token-ok" && remoteIp === "203.0.113.20",
    }),
  });

  assert.deepEqual(result, { checked: true });
});

test("stripe live-mode rehearsal blocks self-serve billing until live env is complete", () => {
  const blocked = buildStripeLiveModeRehearsalPlan({
    APP_URL: "http://localhost:3000",
    BILLING_PROVIDER: "manual",
    STRIPE_PRICE_GROWTH: "price_test_growth",
    STRIPE_SECRET_KEY: "sk_test_123",
  });

  assert.equal(blocked.status, "blocked");
  assert.ok(blocked.checks.some((check) => check.id === "stripe_secret_key_live" && !check.ok));
  assert.ok(blocked.checks.some((check) => check.id === "app_url_https" && !check.ok));

  const ready = buildStripeLiveModeRehearsalPlan({
    APP_URL: "https://dashdental.space",
    BILLING_PROVIDER: "hybrid",
    STRIPE_PRICE_GROWTH: "price_live_growth",
    STRIPE_PRICE_SCALE: "price_live_scale",
    STRIPE_PRICE_STARTER: "price_live_starter",
    STRIPE_SECRET_KEY: "sk_live_123",
    STRIPE_WEBHOOK_SECRET: "whsec_live_123",
  });

  assert.equal(ready.status, "ready");
  assert.equal(ready.checks.every((check) => check.ok), true);
});

test("paid self-serve readiness assets exist without fake compliance claims", async () => {
  const packageJson = await readFile("package.json", "utf8");
  const runbook = await readFile("docs/production-runbook.md", "utf8");
  const edgeProtection = await readFile("docs/edge-protection.md", "utf8");
  const dpa = await readFile("docs/legal/dpa-template.md", "utf8");
  const subprocessors = await readFile("docs/legal/subprocessors.md", "utf8");
  const orderForm = await readFile("docs/legal/order-form-template.md", "utf8");
  const refundPolicy = await readFile("docs/legal/cancellation-refund-policy.md", "utf8");
  const firstClinicPlan = await readFile("docs/first-clinic-launch-plan.md", "utf8");
  const manualBilling = await readFile("docs/runbooks/manual-billing.md", "utf8");
  const dataHandling = await readFile("docs/runbooks/data-handling.md", "utf8");
  const supportOps = await readFile("docs/runbooks/support-operations.md", "utf8");
  const monitoring = await readFile("docs/runbooks/monitoring.md", "utf8");
  const syntheticSpec = await readFile("tests/e2e/synthetic-launch.spec.ts", "utf8");

  assert.match(packageJson, /"stripe:rehearsal"/);
  assert.match(packageJson, /"monitor:synthetic"/);
  assert.match(packageJson, /"rehearsal:first-clinic"/);
  assert.match(runbook, /Stripe live-mode rehearsal/i);
  assert.match(edgeProtection, /Turnstile/i);
  assert.match(edgeProtection, /\/api\/v1\/auth\/register/);
  assert.match(dpa, /Data Processing Addendum/i);
  assert.match(subprocessors, /Subprocessor Register/i);
  assert.match(orderForm, /Order Form/i);
  assert.match(refundPolicy, /Cancellation and Refund Policy/i);
  assert.match(firstClinicPlan, /First Clinic Launch Plan/i);
  assert.match(firstClinicPlan, /fake clinic/i);
  assert.match(manualBilling, /read-only hold/i);
  assert.match(dataHandling, /AI does not make clinical/i);
  assert.match(supportOps, /Every replay, retry, reconcile, or subscription change/i);
  assert.match(monitoring, /Health endpoints must not expose/i);
  assert.match(syntheticSpec, /public routes, registration, inbox reply, billing lock, and health secrecy/i);

  const combined = [
    dpa,
    subprocessors,
    orderForm,
    refundPolicy,
    firstClinicPlan,
    manualBilling,
    dataHandling,
    supportOps,
    monitoring,
  ].join("\n");
  assert.doesNotMatch(combined, /SOC 2 certified|HIPAA compliant|ISO 27001 certified/i);
});
