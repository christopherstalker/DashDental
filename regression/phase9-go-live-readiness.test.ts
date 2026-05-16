import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGoLiveReadinessPlan,
  requiredLaunchDocs,
  requiredLegalDocs,
} from "../../src/server/go-live-readiness";

const readyManualEnv = {
  APP_URL: "https://staging.dashdental.space",
  BILLING_PROVIDER: "manual",
  CANCELLATION_POLICY_APPROVED: "true",
  DATABASE_BACKUPS_CONFIRMED: "true",
  DATABASE_URL: "postgresql://prod-db/dental_recovery?sslmode=require",
  DATA_HANDLING_POLICY_APPROVED: "true",
  DPA_APPROVED: "true",
  EDGE_PROTECTION_DEPLOYED: "true",
  EDGE_RATE_LIMIT_PROFILE: "launch",
  ENABLE_DEV_BILLING: "false",
  ENABLE_DEV_LOGIN: "false",
  FIRST_CLINIC_REHEARSAL_APPROVED: "true",
  INTEGRATION_SECRET: "prod-integration-secret-with-more-than-32-characters",
  INCIDENT_ESCALATION_EMAIL: "incidents@dashdental.space",
  JWT_ACCESS_SECRET: "prod-access-secret-with-more-than-32-characters",
  JWT_REFRESH_SECRET: "prod-refresh-secret-with-more-than-32-characters",
  LEGAL_REVIEW_APPROVED: "true",
  MANUAL_BILLING_INSTRUCTIONS: "Send payment with the invoice reference.",
  MANUAL_INVOICE_TEMPLATE_APPROVED: "true",
  MANUAL_BILLING_RECIPIENT_NAME: "Dash Dental LLC",
  MANUAL_BILLING_SUPPORT_EMAIL: "support@dashdental.space",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "0x4AAAA",
  ORDER_FORM_APPROVED: "true",
  PRODUCTION_MONITOR_POLICY_APPROVED: "true",
  REDIS_URL: "redis://prod-redis:6379",
  REQUIRE_PUBLIC_AUTH_BOT_PROTECTION: "true",
  SECURITY_CONTACT_EMAIL: "security@dashdental.space",
  SESSION_SECRET: "prod-session-secret-with-more-than-32-characters",
  SUBPROCESSORS_APPROVED: "true",
  SUPPORT_OWNER_EMAIL: "support@dashdental.space",
  SUPPORT_OWNER_NAME: "Launch Support Lead",
  SYNTHETIC_MONITOR_BASE_URL: "https://staging.dashdental.space",
  SYNTHETIC_MONITOR_SCHEDULED: "true",
  TURNSTILE_SECRET_KEY: "turnstile-secret",
};

test("go-live readiness blocks broad launch when external controls are missing", () => {
  const plan = buildGoLiveReadinessPlan({
    env: {
      APP_URL: "http://localhost:3000",
      BILLING_PROVIDER: "manual",
      DATABASE_URL: "postgresql://local",
      REDIS_URL: "redis://local",
      SESSION_SECRET: "dev-secret",
    },
    legalDocs: new Set(),
  });

  assert.equal(plan.status, "blocked");
  assert.ok(plan.checks.some((check) => check.id === "edge_protection_deployed"));
  assert.ok(
    plan.checks.some((check) => check.id === "public_auth_bot_protection_required"),
  );
  assert.ok(plan.checks.some((check) => check.id === "legal_review_approved"));
  assert.ok(plan.checks.some((check) => check.id === "synthetic_monitor_scheduled"));
});

test("go-live readiness is ready for manual billing when launch guardrails are confirmed", () => {
  const plan = buildGoLiveReadinessPlan({
    env: readyManualEnv,
    legalDocs: new Set(requiredLegalDocs),
    launchDocs: new Set(requiredLaunchDocs),
  });

  assert.equal(plan.status, "ready");
  assert.ok(
    plan.checks.some(
      (check) => check.id === "stripe_rehearsal_not_required" && check.level === "warn",
    ),
  );
  assert.equal(plan.checks.some((check) => check.level === "block"), false);
});

test("hybrid billing remains blocked until Stripe live-mode rehearsal values are present", () => {
  const blocked = buildGoLiveReadinessPlan({
    env: {
      ...readyManualEnv,
      BILLING_PROVIDER: "hybrid",
      STRIPE_PRICE_GROWTH: "price_test_growth",
      STRIPE_SECRET_KEY: "sk_test_123",
    },
    legalDocs: new Set(requiredLegalDocs),
    launchDocs: new Set(requiredLaunchDocs),
  });

  assert.equal(blocked.status, "blocked");
  assert.ok(blocked.checks.some((check) => check.id === "stripe_stripe_secret_key_live"));

  const ready = buildGoLiveReadinessPlan({
    env: {
      ...readyManualEnv,
      BILLING_PROVIDER: "hybrid",
      STRIPE_PRICE_GROWTH: "price_live_growth",
      STRIPE_PRICE_SCALE: "price_live_scale",
      STRIPE_PRICE_STARTER: "price_live_starter",
      STRIPE_SECRET_KEY: "sk_live_123",
      STRIPE_WEBHOOK_SECRET: "whsec_live_123",
    },
    legalDocs: new Set(requiredLegalDocs),
    launchDocs: new Set(requiredLaunchDocs),
  });

  assert.equal(ready.status, "ready");
});

test("repository wires launch monitors and Turnstile-ready auth forms", async () => {
  const packageJson = await readFile("package.json", "utf8");
  const workflow = await readFile(".github/workflows/synthetic-monitor.yml", "utf8");
  const loginForm = await readFile("src/features/auth/components/login-form.tsx", "utf8");
  const registerForm = await readFile(
    "src/features/auth/components/register-form.tsx",
    "utf8",
  );
  const turnstile = await readFile(
    "src/features/auth/components/turnstile-challenge.tsx",
    "utf8",
  );

  assert.match(packageJson, /"go-live:check"/);
  assert.match(workflow, /SYNTHETIC_MONITOR_BASE_URL/);
  assert.match(workflow, /npm run monitor:synthetic/);
  assert.match(loginForm, /turnstileToken/);
  assert.match(registerForm, /turnstileToken/);
  assert.match(turnstile, /challenges.cloudflare.com\/turnstile/);
});
