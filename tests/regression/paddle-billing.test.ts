import crypto from "node:crypto";
import assert from "node:assert/strict";
import test from "node:test";
import { createEmptyAppState } from "../../src/domain/empty-app-state";
import { getBillingProviderDiagnostics } from "../../src/server/billing-diagnostics";
import { getBillingProvider } from "../../src/server/manual-billing";
import { buildGoLiveReadinessPlan, requiredLaunchDocs, requiredLegalDocs } from "../../src/server/go-live-readiness";
import {
  applyPaddleBillingEventToState,
  createPaddleCheckoutSession,
  verifyPaddleWebhook,
  type PaddleEvent,
} from "../../src/server/paddle";

async function withEnv<T>(
  values: Record<string, string | undefined>,
  run: () => T | Promise<T>,
): Promise<T> {
  const previous = new Map(Object.keys(values).map((key) => [key, process.env[key]]));
  try {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }

    return await run();
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

test("Paddle webhook signatures use timestamp, raw body, and endpoint secret", () => {
  const body = JSON.stringify({ data: { id: "sub_test" }, event_id: "evt_1", event_type: "subscription.activated" });
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const secret = "pdl_ntfset_secret_for_test";
  const signature = crypto.createHmac("sha256", secret).update(`${timestamp}:${body}`).digest("hex");

  assert.equal(
    verifyPaddleWebhook({
      body,
      secret,
      signature: `ts=${timestamp};h1=${signature}`,
      nowMs: Number(timestamp) * 1000,
    }),
    true,
  );
  assert.equal(
    verifyPaddleWebhook({
      body: `${body} `,
      secret,
      signature: `ts=${timestamp};h1=${signature}`,
      nowMs: Number(timestamp) * 1000,
    }),
    false,
  );
});

test("Paddle checkout creates a transaction with tenant custom data and price ID", async () => {
  await withEnv(
    {
      APP_URL: "https://dashdental.space",
      PADDLE_API_KEY: "test-paddle-sandbox-api-key",
      PADDLE_ENV: "sandbox",
      PADDLE_PRICE_GROWTH_MONTHLY: "pri_01growthmonthly00000000000",
    },
    async () => {
      let requestedUrl = "";
      let requestedBody: Record<string, unknown> = {};
      const fetchImpl = (async (url, init) => {
        requestedUrl = String(url);
        requestedBody = JSON.parse(String(init?.body)) as Record<string, unknown>;

        return Response.json({
          data: {
            id: "txn_01testtransaction000000000",
            checkout: {
              url: "https://dashdental.space/checkout/paddle?_ptxn=txn_01testtransaction000000000",
            },
          },
        });
      }) as typeof fetch;

      const session = await createPaddleCheckoutSession({
        requestUrl: "https://dashdental.space/billing",
        organizationId: "org_123",
        organizationName: "Bright Bite",
        userEmail: "owner@example.com",
        plan: "growth",
        fetchImpl,
      });

      assert.match(requestedUrl, /^https:\/\/sandbox-api\.paddle\.com\/transactions/);
      assert.equal(session.transactionId, "txn_01testtransaction000000000");
      assert.equal(session.provider, "paddle");
      assert.equal(session.interval, "monthly");
      assert.equal(session.url.includes("/checkout/paddle"), true);
      assert.deepEqual(requestedBody.items, [
        { price_id: "pri_01growthmonthly00000000000", quantity: 1 },
      ]);
      assert.deepEqual(requestedBody.custom_data, {
        organization_id: "org_123",
        organization_name: "Bright Bite",
        billing_interval: "monthly",
        plan: "growth",
        user_email: "owner@example.com",
      });
    },
  );
});

test("Paddle checkout can create annual transactions with yearly price IDs", async () => {
  await withEnv(
    {
      APP_URL: "https://dashdental.space",
      PADDLE_API_KEY: "test-paddle-sandbox-api-key",
      PADDLE_ENV: "sandbox",
      PADDLE_PRICE_GROWTH_MONTHLY: "pri_01growthmonthly00000000000",
      PADDLE_PRICE_GROWTH_YEARLY: "pri_01growthyearly000000000000",
    },
    async () => {
      let requestedBody: Record<string, unknown> = {};
      const fetchImpl = (async (_url, init) => {
        requestedBody = JSON.parse(String(init?.body)) as Record<string, unknown>;

        return Response.json({
          data: {
            id: "txn_01annualtransaction00000000",
            checkout: {
              url: "https://dashdental.space/checkout/paddle?_ptxn=txn_01annualtransaction00000000",
            },
          },
        });
      }) as typeof fetch;

      const session = await createPaddleCheckoutSession({
        requestUrl: "https://dashdental.space/billing",
        organizationId: "org_123",
        organizationName: "Bright Bite",
        userEmail: "owner@example.com",
        plan: "growth",
        interval: "yearly",
        fetchImpl,
      });

      assert.equal(session.interval, "yearly");
      assert.deepEqual(requestedBody.items, [
        { price_id: "pri_01growthyearly000000000000", quantity: 1 },
      ]);
      assert.deepEqual(requestedBody.custom_data, {
        organization_id: "org_123",
        organization_name: "Bright Bite",
        billing_interval: "yearly",
        plan: "growth",
        user_email: "owner@example.com",
      });
    },
  );
});

test("Paddle billing event activates a tenant subscription in app state", () => {
  const state = createEmptyAppState();
  const event: PaddleEvent = {
    event_id: "evt_subscription_activated",
    event_type: "subscription.activated",
    occurred_at: "2026-06-05T10:00:00Z",
    data: {
      id: "sub_01activatedsubscription0000",
      customer_id: "ctm_01customer0000000000000000",
      status: "active",
      custom_data: {
        organization_id: "org_clinic",
        plan: "starter",
      },
      current_billing_period: {
        starts_at: "2026-06-05T10:00:00Z",
        ends_at: "2026-07-05T10:00:00Z",
      },
    },
  };
  const result = applyPaddleBillingEventToState(state, { event });
  const subscription = result.state.subscriptions.find((item) => item.organizationId === "org_clinic");

  assert.equal(result.duplicate, false);
  assert.equal(subscription?.provider, "paddle");
  assert.equal(subscription?.plan, "starter");
  assert.equal(subscription?.status, "active");
  assert.equal(subscription?.externalCustomerId, "ctm_01customer0000000000000000");
  assert.equal(result.state.billingEvents[0]?.provider, "paddle");
  assert.equal(result.state.usageLimits[0]?.monthlyMessages, 2000);
});

test("billing diagnostics expose self-serve Paddle readiness without secret values", async () => {
  await withEnv(
    {
      BILLING_PROVIDER: "paddle",
      NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: "live_client_token",
      PADDLE_API_KEY: "test-paddle-live-api-key",
      PADDLE_PRICE_GROWTH_MONTHLY: "pri_01growthmonthly00000000000",
      PADDLE_PRICE_GROWTH_YEARLY: "pri_01growthyearly000000000000",
      PADDLE_PRICE_SCALE_MONTHLY: "pri_01scalemonthly000000000000",
      PADDLE_PRICE_SCALE_YEARLY: "pri_01scaleyearly0000000000000",
      PADDLE_PRICE_STARTER_MONTHLY: "pri_01startermonthly000000000",
      PADDLE_PRICE_STARTER_YEARLY: "pri_01starteryearly0000000000",
      PADDLE_WEBHOOK_SECRET: "pdl_ntfset_live_secret",
    },
    () => {
      const diagnostics = getBillingProviderDiagnostics();

      assert.equal(diagnostics.onlineProvider, "paddle");
      assert.equal(diagnostics.selfServeCheckoutReady, true);
      assert.equal(diagnostics.customerPortalReady, true);
      assert.equal(
        diagnostics.checks.some(
          (check) => check.id === "paddle_yearly_prices" && check.level === "pass",
        ),
        true,
      );
      assert.equal(JSON.stringify(diagnostics).includes("pdl_ntfset_live_secret"), false);
    },
  );
});

test("launch billing defaults to manual even when online provider secrets exist", async () => {
  await withEnv(
    {
      BILLING_PROVIDER: undefined,
      MANUAL_BILLING_IBAN: "UA123456789",
      MANUAL_BILLING_RECIPIENT_NAME: "Dash Dental LLC",
      PADDLE_API_KEY: "test-paddle-live-api-key",
      STRIPE_SECRET_KEY: "sk_live_123",
    },
    () => {
      const diagnostics = getBillingProviderDiagnostics();

      assert.equal(getBillingProvider(), "manual");
      assert.equal(diagnostics.providerMode, "manual");
      assert.equal(diagnostics.onlineProvider, undefined);
      assert.equal(diagnostics.selfServeCheckoutReady, false);
      assert.equal(diagnostics.manualFallbackReady, true);
      assert.ok(
        diagnostics.checks.some(
          (check) => check.id === "billing_provider" && check.level === "pass",
        ),
      );
      assert.equal(diagnostics.checks.some((check) => check.level === "block"), false);
    },
  );
});

test("hybrid billing prefers Paddle checkout while keeping manual invoices visible", async () => {
  await withEnv(
    {
      BILLING_PROVIDER: "hybrid",
      PADDLE_API_KEY: "test-paddle-live-api-key",
      STRIPE_SECRET_KEY: "sk_live_123",
    },
    async () => {
      const { getOnlineBillingProvider, shouldShowManualBilling } = await import(
        "../../src/server/manual-billing"
      );

      assert.equal(getOnlineBillingProvider(), "paddle");
      assert.equal(shouldShowManualBilling(), true);
    },
  );
});

test("billing diagnostics warn when annual Paddle prices are missing", async () => {
  await withEnv(
    {
      BILLING_PROVIDER: "paddle",
      NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: "live_client_token",
      PADDLE_API_KEY: "test-paddle-live-api-key",
      PADDLE_PRICE_GROWTH_MONTHLY: "pri_01growthmonthly00000000000",
      PADDLE_PRICE_GROWTH_YEARLY: undefined,
      PADDLE_PRICE_SCALE_MONTHLY: "pri_01scalemonthly000000000000",
      PADDLE_PRICE_SCALE_YEARLY: undefined,
      PADDLE_PRICE_STARTER_MONTHLY: "pri_01startermonthly000000000",
      PADDLE_PRICE_STARTER_YEARLY: undefined,
      PADDLE_WEBHOOK_SECRET: "pdl_ntfset_live_secret",
    },
    () => {
      const diagnostics = getBillingProviderDiagnostics();

      assert.equal(diagnostics.selfServeCheckoutReady, true);
      assert.equal(
        diagnostics.checks.some(
          (check) => check.id === "paddle_yearly_prices" && check.level === "warn",
        ),
        true,
      );
    },
  );
});

test("go-live readiness accepts Paddle billing when Paddle secrets and price IDs are configured", () => {
  const env = {
    APP_URL: "https://staging.dashdental.space",
    BILLING_PROVIDER: "paddle",
    CANCELLATION_POLICY_APPROVED: "true",
    DATABASE_BACKUPS_CONFIRMED: "true",
    DATABASE_URL: "postgresql://prod-db/dental_recovery?sslmode=require",
    DATA_HANDLING_POLICY_APPROVED: "true",
    DPA_APPROVED: "true",
    EDGE_PROTECTION_DEPLOYED: "true",
    EDGE_RATE_LIMIT_PROFILE: "launch",
    EMAIL_FROM: "Dash Dental <noreply@dashdental.space>",
    ENABLE_DEV_BILLING: "false",
    ENABLE_DEV_LOGIN: "false",
    FIRST_CLINIC_REHEARSAL_APPROVED: "true",
    INTEGRATION_SECRET: "prod-integration-secret-with-more-than-32-characters",
    INCIDENT_ESCALATION_EMAIL: "incidents@dashdental.space",
    JWT_ACCESS_SECRET: "prod-access-secret-with-more-than-32-characters",
    JWT_REFRESH_SECRET: "prod-refresh-secret-with-more-than-32-characters",
    LEGAL_REVIEW_APPROVED: "true",
    NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: "live_client_token",
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: "0x4AAAA",
    ORDER_FORM_APPROVED: "true",
    PADDLE_API_KEY: "test-paddle-live-api-key",
    PADDLE_PRICE_GROWTH_MONTHLY: "pri_01growthmonthly00000000000",
    PADDLE_PRICE_SCALE_MONTHLY: "pri_01scalemonthly000000000000",
    PADDLE_PRICE_STARTER_MONTHLY: "pri_01startermonthly000000000",
    PADDLE_WEBHOOK_SECRET: "pdl_ntfset_live_secret",
    PRODUCTION_MONITOR_POLICY_APPROVED: "true",
    REDIS_URL: "redis://prod-redis:6379",
    REQUIRE_PUBLIC_AUTH_BOT_PROTECTION: "true",
    RESEND_API_KEY: "re_live_key_with_more_than_12_chars",
    SECURITY_CONTACT_EMAIL: "security@dashdental.space",
    SESSION_SECRET: "prod-session-secret-with-more-than-32-characters",
    SUBPROCESSORS_APPROVED: "true",
    SUPPORT_OWNER_EMAIL: "support@dashdental.space",
    SUPPORT_OWNER_NAME: "Launch Support Lead",
    SYNTHETIC_MONITOR_BASE_URL: "https://staging.dashdental.space",
    SYNTHETIC_MONITOR_SCHEDULED: "true",
    TURNSTILE_SECRET_KEY: "turnstile-secret",
  };
  const plan = buildGoLiveReadinessPlan({
    env,
    legalDocs: new Set(requiredLegalDocs),
    launchDocs: new Set(requiredLaunchDocs),
  });

  assert.equal(plan.status, "ready");
  assert.ok(plan.checks.some((check) => check.id === "paddle_api_key_configured" && check.level === "pass"));
  assert.equal(plan.checks.some((check) => check.level === "block"), false);
});
