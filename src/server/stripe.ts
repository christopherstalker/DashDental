import crypto from "node:crypto";
import { getPlanLimits } from "@/domain/business-rules";
import type { AppState, Subscription } from "@/domain/types";
import { ApiError } from "./api-error";

const stripeApiBase = "https://api.stripe.com/v1";
const stripeApiVersion = "2026-02-25.clover";
const stripeWebhookToleranceSeconds = 5 * 60;

type StripePlan = Subscription["plan"];

interface StripeRequestOptions {
  idempotencyKey?: string;
}

interface StripeSessionResponse {
  id?: string;
  url?: string;
  customer?: string;
  subscription?: string;
  metadata?: Record<string, string>;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

function getStripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new ApiError(501, "Stripe is not configured", "stripe_not_configured");
  }

  return key;
}

function getAppUrl(requestUrl: string): string {
  return (
    process.env.APP_URL?.replace(/\/$/, "") ??
    new URL(requestUrl).origin
  );
}

function getPriceId(plan: StripePlan): string {
  const envKey = `STRIPE_PRICE_${plan.toUpperCase()}`;
  const priceId = process.env[envKey]?.trim();
  if (!priceId) {
    throw new ApiError(501, `${envKey} is not configured`, "stripe_price_not_configured", {
      plan,
      envKey,
    });
  }

  return priceId;
}

function toIsoFromUnix(value?: number): string {
  return value ? new Date(value * 1000).toISOString() : new Date().toISOString();
}

function normalizeSubscriptionStatus(status?: string): Subscription["status"] {
  if (
    status === "active" ||
    status === "trialing" ||
    status === "past_due" ||
    status === "canceled" ||
    status === "unpaid" ||
    status === "read_only"
  ) {
    return status;
  }

  return "past_due";
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function isStripePlan(value: unknown): value is StripePlan {
  return value === "starter" || value === "growth" || value === "scale";
}

async function stripePost<T>(
  path: string,
  body: URLSearchParams,
  options: StripeRequestOptions = {},
): Promise<T> {
  const response = await fetch(`${stripeApiBase}${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${getStripeSecretKey()}`,
      "content-type": "application/x-www-form-urlencoded",
      "stripe-version": stripeApiVersion,
      ...(options.idempotencyKey ? { "idempotency-key": options.idempotencyKey } : {}),
    },
    body,
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as {
    error?: { message?: string; type?: string };
  };

  if (!response.ok) {
    throw new ApiError(502, payload.error?.message ?? "Stripe request failed", "stripe_request_failed", {
      stripeType: payload.error?.type,
    });
  }

  return payload as T;
}

export async function createStripeCheckoutSession(input: {
  requestUrl: string;
  organizationId: string;
  organizationName: string;
  userEmail: string;
  plan: StripePlan;
  customerId?: string;
}): Promise<{ url: string }> {
  const appUrl = getAppUrl(input.requestUrl);
  const body = new URLSearchParams({
    mode: "subscription",
    success_url: `${appUrl}/?billing=success`,
    cancel_url: `${appUrl}/?billing=cancelled`,
    allow_promotion_codes: "true",
    billing_address_collection: "auto",
    client_reference_id: input.organizationId,
    customer_email: input.userEmail,
    "line_items[0][price]": getPriceId(input.plan),
    "line_items[0][quantity]": "1",
    "metadata[organization_id]": input.organizationId,
    "metadata[organization_name]": input.organizationName,
    "metadata[plan]": input.plan,
    "subscription_data[metadata][organization_id]": input.organizationId,
    "subscription_data[metadata][plan]": input.plan,
    "subscription_data[description]": `Dash Dental ${input.plan} plan for ${input.organizationName}`,
    "tax_id_collection[enabled]": "true",
  });

  if (input.customerId && !input.customerId.startsWith("cus_demo")) {
    body.delete("customer_email");
    body.set("customer", input.customerId);
  }

  const session = await stripePost<StripeSessionResponse>("/checkout/sessions", body, {
    idempotencyKey: `checkout:${input.organizationId}:${input.plan}:${Date.now()}`,
  });

  if (!session.url) {
    throw new ApiError(502, "Stripe did not return a Checkout URL", "stripe_checkout_url_missing");
  }

  return { url: session.url };
}

export async function createStripePortalSession(input: {
  requestUrl: string;
  customerId?: string;
}): Promise<{ url: string }> {
  if (!input.customerId || input.customerId.startsWith("cus_demo")) {
    throw new ApiError(409, "No live Stripe customer exists for this organization", "stripe_customer_missing");
  }

  const body = new URLSearchParams({
    customer: input.customerId,
    return_url: `${getAppUrl(input.requestUrl)}/?billing=portal`,
  });
  const session = await stripePost<StripeSessionResponse>("/billing_portal/sessions", body);

  if (!session.url) {
    throw new ApiError(502, "Stripe did not return a portal URL", "stripe_portal_url_missing");
  }

  return { url: session.url };
}

export function verifyStripeWebhook(input: {
  body: string;
  signature: string | null;
}): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret || !input.signature) {
    return false;
  }

  const timestamp = input.signature
    .split(",")
    .find((part) => part.startsWith("t="))
    ?.slice(2);
  const signature = input.signature
    .split(",")
    .find((part) => part.startsWith("v1="))
    ?.slice(3);
  if (!timestamp || !signature) {
    return false;
  }
  const timestampSeconds = Number(timestamp);
  if (
    !Number.isFinite(timestampSeconds) ||
    Math.abs(Date.now() / 1000 - timestampSeconds) > stripeWebhookToleranceSeconds
  ) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${input.body}`)
    .digest("hex");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);

  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function inferPlanFromStripeSubscription(
  subscription: Record<string, unknown>,
): StripePlan {
  const metadataPlan = readString(asRecord(subscription.metadata)?.plan);
  if (isStripePlan(metadataPlan)) {
    return metadataPlan;
  }

  const items = asRecord(subscription.items);
  const data = Array.isArray(items?.data) ? items.data : [];
  const price = asRecord(asRecord(data[0])?.price);
  const lookupKey = readString(price?.lookup_key);
  if (isStripePlan(lookupKey)) {
    return lookupKey;
  }

  const priceId = readString(price?.id);
  const planFromEnv = (["starter", "growth", "scale"] as StripePlan[]).find(
    (plan) => process.env[`STRIPE_PRICE_${plan.toUpperCase()}`]?.trim() === priceId,
  );

  return planFromEnv ?? "growth";
}

export function applyStripeSubscriptionToState(
  state: AppState,
  input: {
    organizationId: string;
    customerId?: string;
    subscriptionId?: string;
    plan: StripePlan;
    status: Subscription["status"];
    currentPeriodStart?: string;
    currentPeriodEnd?: string;
  },
): AppState {
  const limits = getPlanLimits(input.plan);
  const existing = state.subscriptions.find(
    (subscription) => subscription.organizationId === input.organizationId,
  );
  const subscription: Subscription = {
    id: existing?.id ?? `sub-${input.organizationId}`,
    organizationId: input.organizationId,
    provider: "stripe",
    plan: input.plan,
    status: input.status,
    currentPeriodStart: input.currentPeriodStart ?? existing?.currentPeriodStart ?? new Date().toISOString(),
    currentPeriodEnd: input.currentPeriodEnd ?? existing?.currentPeriodEnd ?? new Date().toISOString(),
    externalCustomerId: input.customerId ?? existing?.externalCustomerId ?? "",
    externalSubscriptionId: input.subscriptionId ?? existing?.externalSubscriptionId ?? "",
  };

  return {
    ...state,
    subscriptions: existing
      ? state.subscriptions.map((item) => (item.id === existing.id ? subscription : item))
      : [subscription, ...state.subscriptions],
    usageLimits: state.usageLimits.map((usage) =>
      usage.organizationId === input.organizationId
        ? {
            ...usage,
            maxUsers: limits.maxUsers,
            maxIntegrations: limits.maxIntegrations,
            monthlyMessages: limits.monthlyMessages,
            monthlyAiRuns: limits.monthlyAiRuns,
          }
        : usage,
    ),
  };
}

export function subscriptionFromStripeObject(subscription: Record<string, unknown>): {
  plan: StripePlan;
  status: Subscription["status"];
  currentPeriodStart: string;
  currentPeriodEnd: string;
  customerId?: string;
  subscriptionId?: string;
} {
  return {
    plan: inferPlanFromStripeSubscription(subscription),
    status: normalizeSubscriptionStatus(readString(subscription.status)),
    currentPeriodStart: toIsoFromUnix(readNumber(subscription.current_period_start)),
    currentPeriodEnd: toIsoFromUnix(readNumber(subscription.current_period_end)),
    customerId: readString(subscription.customer),
    subscriptionId: readString(subscription.id),
  };
}
