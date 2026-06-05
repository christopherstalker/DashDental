import crypto from "node:crypto";
import { getCurrentCalendarMonthPeriod, getPlanLimits } from "@/domain/business-rules";
import type { AppState, BillingEvent, Subscription } from "@/domain/types";
import { ApiError } from "./api-error";

const paddleWebhookToleranceSeconds = 5 * 60;
const paddleApiVersion = "1";

export type PaddleEnvironment = "sandbox" | "live";
export type PaddlePlan = Subscription["plan"];
export type PaddleBillingInterval = "monthly" | "yearly";

export interface PaddleEvent {
  event_id?: string;
  id?: string;
  event_type?: string;
  type?: string;
  occurred_at?: string;
  data: Record<string, unknown>;
}

interface PaddleApiResponse<T> {
  data?: T;
  error?: {
    code?: string;
    detail?: string;
    message?: string;
    type?: string;
  };
}

interface PaddleTransactionResponse {
  id?: string;
  status?: string;
  customer_id?: string | null;
  subscription_id?: string | null;
  checkout?: {
    url?: string | null;
  } | null;
}

interface PaddlePortalSessionResponse {
  id?: string;
  urls?: {
    general?: { overview?: string | null } | null;
    subscriptions?: Array<{
      id?: string;
      overview?: string | null;
      update_payment_method?: string | null;
      cancel?: string | null;
    }>;
  };
}

function createRuntimeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readEnv(key: string): string {
  return process.env[key]?.trim() ?? "";
}

function getPaddleApiKey(): string {
  const key = readEnv("PADDLE_API_KEY");
  if (!key) {
    throw new ApiError(501, "Paddle is not configured", "paddle_not_configured");
  }

  return key;
}

function getAppUrl(requestUrl: string): string {
  return process.env.APP_URL?.replace(/\/$/, "") ?? new URL(requestUrl).origin;
}

export function getPaddleEnvironment(): PaddleEnvironment {
  const configured = readEnv("PADDLE_ENV").toLowerCase();
  if (configured === "sandbox" || configured === "live") {
    return configured;
  }

  const key = readEnv("PADDLE_API_KEY");
  return key.includes("_sdbx_") ? "sandbox" : "live";
}

function getPaddleApiBaseUrl(): string {
  return getPaddleEnvironment() === "sandbox"
    ? "https://sandbox-api.paddle.com"
    : "https://api.paddle.com";
}

export function isPaddleConfigured(): boolean {
  return Boolean(readEnv("PADDLE_API_KEY"));
}

export function isPaddleCheckoutConfigured(): boolean {
  return Boolean(readEnv("PADDLE_API_KEY") && readEnv("NEXT_PUBLIC_PADDLE_CLIENT_TOKEN"));
}

function getPriceId(plan: PaddlePlan, interval: PaddleBillingInterval = "monthly"): string {
  const planKey = plan.toUpperCase();
  const intervalKey = interval.toUpperCase();
  const priceId =
    readEnv(`PADDLE_PRICE_${planKey}_${intervalKey}`) ||
    readEnv(`PADDLE_PRICE_${planKey}`);

  if (!priceId) {
    throw new ApiError(501, `PADDLE_PRICE_${planKey}_${intervalKey} is not configured`, "paddle_price_not_configured", {
      envKey: `PADDLE_PRICE_${planKey}_${intervalKey}`,
      plan,
      interval,
    });
  }

  return priceId;
}

export function hasPaddlePriceId(
  plan: PaddlePlan,
  interval: PaddleBillingInterval = "monthly",
): boolean {
  const planKey = plan.toUpperCase();
  const intervalKey = interval.toUpperCase();
  return Boolean(
    readEnv(`PADDLE_PRICE_${planKey}_${intervalKey}`) ||
      readEnv(`PADDLE_PRICE_${planKey}`),
  );
}

export function getPaddleCheckoutReadiness() {
  const plans: PaddlePlan[] = ["starter", "growth", "scale"];

  return {
    apiKeyConfigured: Boolean(readEnv("PADDLE_API_KEY")),
    clientTokenConfigured: Boolean(readEnv("NEXT_PUBLIC_PADDLE_CLIENT_TOKEN")),
    webhookSecretConfigured: Boolean(readEnv("PADDLE_WEBHOOK_SECRET")),
    monthlyPriceIdsConfigured: plans.every((plan) => hasPaddlePriceId(plan, "monthly")),
    yearlyPriceIdsConfigured: plans.every((plan) => hasPaddlePriceId(plan, "yearly")),
  };
}

function priceIdPlan(priceId: string | undefined): PaddlePlan | undefined {
  if (!priceId) {
    return undefined;
  }

  return (["starter", "growth", "scale"] as PaddlePlan[]).find((plan) => {
    const key = plan.toUpperCase();
    return (
      readEnv(`PADDLE_PRICE_${key}_MONTHLY`) === priceId ||
      readEnv(`PADDLE_PRICE_${key}_YEARLY`) === priceId ||
      readEnv(`PADDLE_PRICE_${key}`) === priceId
    );
  });
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function isPaddlePlan(value: unknown): value is PaddlePlan {
  return value === "starter" || value === "growth" || value === "scale";
}

function toIso(value: unknown): string | undefined {
  const stringValue = readString(value);
  if (!stringValue) {
    return undefined;
  }
  const date = new Date(stringValue);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

async function paddlePost<T>(
  path: string,
  body: Record<string, unknown>,
  options: {
    fetchImpl?: typeof fetch;
  } = {},
): Promise<T> {
  const response = await (options.fetchImpl ?? fetch)(`${getPaddleApiBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${getPaddleApiKey()}`,
      "content-type": "application/json",
      "paddle-version": paddleApiVersion,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as PaddleApiResponse<T>;

  if (!response.ok) {
    throw new ApiError(
      response.status >= 500 ? 502 : response.status,
      payload.error?.detail ?? payload.error?.message ?? "Paddle request failed",
      payload.error?.code ?? "paddle_request_failed",
      { paddleType: payload.error?.type },
    );
  }

  if (!payload.data) {
    throw new ApiError(502, "Paddle response did not include a data object", "paddle_response_invalid");
  }

  return payload.data;
}

export async function createPaddleCheckoutSession(input: {
  requestUrl: string;
  organizationId: string;
  organizationName: string;
  userEmail: string;
  plan: PaddlePlan;
  interval?: PaddleBillingInterval;
  fetchImpl?: typeof fetch;
}): Promise<{ url: string; transactionId: string; provider: "paddle"; interval: PaddleBillingInterval }> {
  const appUrl = getAppUrl(input.requestUrl);
  const interval = input.interval ?? "monthly";
  const transaction = await paddlePost<PaddleTransactionResponse>(
    "/transactions?include=checkout",
    {
      collection_mode: "automatic",
      checkout: {
        url: `${appUrl}/checkout/paddle`,
      },
      custom_data: {
        organization_id: input.organizationId,
        organization_name: input.organizationName,
        plan: input.plan,
        billing_interval: interval,
        user_email: input.userEmail,
      },
      items: [
        {
          price_id: getPriceId(input.plan, interval),
          quantity: 1,
        },
      ],
    },
    { fetchImpl: input.fetchImpl },
  );

  if (!transaction.id) {
    throw new ApiError(502, "Paddle did not return a transaction ID", "paddle_transaction_id_missing");
  }

  return {
    provider: "paddle",
    interval,
    transactionId: transaction.id,
    url:
      transaction.checkout?.url ??
      `${appUrl}/checkout/paddle?transactionId=${encodeURIComponent(transaction.id)}`,
  };
}

export async function createPaddlePortalSession(input: {
  customerId?: string;
  subscriptionId?: string;
  fetchImpl?: typeof fetch;
}): Promise<{ url: string }> {
  if (!input.customerId || !input.customerId.startsWith("ctm_")) {
    throw new ApiError(409, "No live Paddle customer exists for this organization", "paddle_customer_missing");
  }

  const body =
    input.subscriptionId && input.subscriptionId.startsWith("sub_")
      ? { subscription_ids: [input.subscriptionId] }
      : {};
  const session = await paddlePost<PaddlePortalSessionResponse>(
    `/customers/${encodeURIComponent(input.customerId)}/portal-sessions`,
    body,
    { fetchImpl: input.fetchImpl },
  );
  const subscriptionUrl = session.urls?.subscriptions?.[0]?.overview;
  const url = subscriptionUrl ?? session.urls?.general?.overview;
  if (!url) {
    throw new ApiError(502, "Paddle did not return a customer portal URL", "paddle_portal_url_missing");
  }

  return { url };
}

export function verifyPaddleWebhook(input: {
  body: string;
  signature: string | null;
  secret?: string;
  nowMs?: number;
}): boolean {
  const secret = input.secret?.trim() || readEnv("PADDLE_WEBHOOK_SECRET");
  if (!secret || !input.signature) {
    return false;
  }

  const parsed = new Map(
    input.signature
      .split(";")
      .map((part) => part.trim().split("="))
      .filter((part): part is [string, string] => part.length === 2 && Boolean(part[0] && part[1])),
  );
  const timestamp = parsed.get("ts");
  const signature = parsed.get("h1");
  if (!timestamp || !signature) {
    return false;
  }

  const timestampSeconds = Number(timestamp);
  const nowSeconds = (input.nowMs ?? Date.now()) / 1000;
  if (
    !Number.isFinite(timestampSeconds) ||
    Math.abs(nowSeconds - timestampSeconds) > paddleWebhookToleranceSeconds
  ) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}:${input.body}`)
    .digest("hex");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);

  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function normalizePaddleEvent(payload: Record<string, unknown>): PaddleEvent {
  const data = asRecord(payload.data);
  const eventId = readString(payload.event_id) ?? readString(payload.id);
  const eventType = readString(payload.event_type) ?? readString(payload.type);

  if (!eventId || !eventType || !data) {
    throw new ApiError(400, "Paddle webhook payload is invalid", "validation_error");
  }

  return {
    event_id: eventId,
    event_type: eventType,
    occurred_at: readString(payload.occurred_at),
    data,
  };
}

export function readPaddleEventId(event: PaddleEvent): string {
  return readString(event.event_id) ?? readString(event.id) ?? createRuntimeId("paddle-event");
}

export function readPaddleEventType(event: PaddleEvent): string {
  return readString(event.event_type) ?? readString(event.type) ?? "paddle.unknown";
}

export function readPaddleOrganizationId(object: Record<string, unknown>): string | undefined {
  const customData = asRecord(object.custom_data) ?? asRecord(object.metadata);
  return (
    readString(customData?.organization_id) ??
    readString(customData?.organizationId) ??
    readString(customData?.client_reference_id)
  );
}

export function readPaddleCustomerId(object: Record<string, unknown>): string | undefined {
  return readString(object.customer_id) ?? readString(asRecord(object.customer)?.id);
}

export function readPaddleSubscriptionId(object: Record<string, unknown>): string | undefined {
  const id = readString(object.id);
  return (
    readString(object.subscription_id) ??
    readString(asRecord(object.subscription)?.id) ??
    (id?.startsWith("sub_") ? id : undefined)
  );
}

export function inferPlanFromPaddleObject(
  object: Record<string, unknown>,
  fallback: PaddlePlan = "growth",
): PaddlePlan {
  const customData = asRecord(object.custom_data) ?? asRecord(object.metadata);
  const customPlan = readString(customData?.plan);
  if (isPaddlePlan(customPlan)) {
    return customPlan;
  }

  const firstItem = asRecord(asArray(object.items)[0]);
  const price = asRecord(firstItem?.price);
  const priceCustomData = asRecord(price?.custom_data);
  const pricePlan = readString(priceCustomData?.plan);
  if (isPaddlePlan(pricePlan)) {
    return pricePlan;
  }

  return priceIdPlan(readString(firstItem?.price_id) ?? readString(price?.id)) ?? fallback;
}

export function normalizePaddleSubscriptionStatus(
  status: unknown,
  eventType: string,
): Subscription["status"] {
  const normalized = readString(status);
  if (
    normalized === "active" ||
    normalized === "trialing" ||
    normalized === "past_due" ||
    normalized === "canceled" ||
    normalized === "unpaid" ||
    normalized === "read_only"
  ) {
    return normalized;
  }
  if (normalized === "paused") {
    return "read_only";
  }
  if (eventType.includes("payment_failed") || eventType.includes("past_due")) {
    return "past_due";
  }
  if (eventType.includes("canceled") || eventType.includes("cancelled")) {
    return "canceled";
  }
  if (eventType.includes("paused")) {
    return "read_only";
  }
  if (eventType === "transaction.completed" || eventType.includes("activated") || eventType.includes("resumed")) {
    return "active";
  }

  return "past_due";
}

export function resolvePaddleBillingPeriod(input: {
  object: Record<string, unknown>;
  existing?: Subscription;
  receivedAt: string;
}) {
  const currentBillingPeriod = asRecord(input.object.current_billing_period);
  const billingPeriod = asRecord(input.object.billing_period);
  const fallback = getCurrentCalendarMonthPeriod(input.receivedAt);

  return {
    currentPeriodStart:
      toIso(currentBillingPeriod?.starts_at) ??
      toIso(billingPeriod?.starts_at) ??
      input.existing?.currentPeriodStart ??
      fallback.startIso,
    currentPeriodEnd:
      toIso(currentBillingPeriod?.ends_at) ??
      toIso(billingPeriod?.ends_at) ??
      input.existing?.currentPeriodEnd ??
      fallback.endIso,
  };
}

export function applyPaddleBillingEventToState(
  state: AppState,
  input: {
    event: PaddleEvent;
    receivedAt?: string;
  },
): { state: AppState; duplicate: boolean; billingEvent: BillingEvent } {
  const eventId = readPaddleEventId(input.event);
  const eventType = readPaddleEventType(input.event);
  const object = input.event.data;
  const existingEvent = state.billingEvents.find((event) => event.providerEventId === eventId);
  if (existingEvent?.status === "processed" || existingEvent?.status === "skipped") {
    return { state, duplicate: true, billingEvent: existingEvent };
  }

  const receivedAt = input.receivedAt ?? input.event.occurred_at ?? new Date().toISOString();
  const customerId = readPaddleCustomerId(object);
  const subscriptionId = readPaddleSubscriptionId(object);
  const organizationId =
    readPaddleOrganizationId(object) ??
    state.subscriptions.find(
      (subscription) =>
        subscription.provider === "paddle" &&
        ((subscriptionId && subscription.externalSubscriptionId === subscriptionId) ||
          (customerId && subscription.externalCustomerId === customerId)),
    )?.organizationId;
  const existingSubscription =
    state.subscriptions.find(
      (subscription) =>
        subscription.organizationId === organizationId &&
        subscription.provider === "paddle" &&
        ((subscriptionId && subscription.externalSubscriptionId === subscriptionId) ||
          (customerId && subscription.externalCustomerId === customerId)),
    ) ?? state.subscriptions.find((subscription) => subscription.organizationId === organizationId);
  const plan = inferPlanFromPaddleObject(object, existingSubscription?.plan);
  const status = normalizePaddleSubscriptionStatus(readString(object.status), eventType);
  const period = resolvePaddleBillingPeriod({
    object,
    existing: existingSubscription,
    receivedAt,
  });
  const billingEvent: BillingEvent = {
    id: existingEvent?.id ?? createRuntimeId("billing-event"),
    organizationId,
    subscriptionId: existingSubscription?.id,
    outboxEventId: existingEvent?.outboxEventId,
    provider: "paddle",
    providerEventId: eventId,
    providerEventType: eventType,
    providerObjectId: readString(object.id),
    externalCustomerId: customerId,
    externalSubscriptionId: subscriptionId,
    status: organizationId ? "processed" : "skipped",
    decision: organizationId ? "applied" : "organization_unresolved",
    eventCreatedAt: receivedAt,
    rawPayloadJson: input.event as unknown as Record<string, unknown>,
    processedAt: receivedAt,
    retryCount: existingEvent?.retryCount ?? 0,
    resultJson: organizationId ? { plan, status, externalCustomerId: customerId, externalSubscriptionId: subscriptionId } : { reason: "organization_unresolved" },
    createdAt: existingEvent?.createdAt ?? receivedAt,
    updatedAt: receivedAt,
  };

  if (!organizationId) {
    return {
      duplicate: false,
      billingEvent,
      state: {
        ...state,
        billingEvents: [
          billingEvent,
          ...state.billingEvents.filter((event) => event.providerEventId !== eventId),
        ],
      },
    };
  }

  const limits = getPlanLimits(plan);
  const nextSubscription: Subscription = {
    id: existingSubscription?.id ?? `sub-${organizationId}`,
    organizationId,
    provider: "paddle",
    plan,
    status,
    currentPeriodStart: period.currentPeriodStart,
    currentPeriodEnd: period.currentPeriodEnd,
    externalCustomerId: customerId ?? existingSubscription?.externalCustomerId ?? "",
    externalSubscriptionId: subscriptionId ?? existingSubscription?.externalSubscriptionId ?? eventId,
  };
  const resolvedBillingEvent = {
    ...billingEvent,
    subscriptionId: nextSubscription.id,
  };

  return {
    duplicate: false,
    billingEvent: resolvedBillingEvent,
    state: {
      ...state,
      subscriptions: [
        nextSubscription,
        ...state.subscriptions.filter(
          (subscription) =>
            subscription.organizationId !== organizationId || subscription.id !== nextSubscription.id,
        ),
      ],
      usageLimits: state.usageLimits
        .map((usage) =>
          usage.organizationId === organizationId
            ? {
                ...usage,
                maxUsers: limits.maxUsers,
                maxIntegrations: limits.maxIntegrations,
                monthlyMessages: limits.monthlyMessages,
                monthlyAiRuns: limits.monthlyAiRuns,
              }
            : usage,
        )
        .concat(
          state.usageLimits.some((usage) => usage.organizationId === organizationId)
            ? []
            : [
                {
                  id: `usage-${organizationId}`,
                  organizationId,
                  ...limits,
                  periodUsageJson: {
                    users: 0,
                    integrations: 0,
                    messages: 0,
                    aiRuns: 0,
                  },
                },
              ],
        ),
      billingEvents: [
        resolvedBillingEvent,
        ...state.billingEvents.filter((event) => event.providerEventId !== eventId),
      ],
      auditLogs: [
        {
          id: createRuntimeId("audit"),
          organizationId,
          actorUserId: "system",
          action: "billing.subscription_changed",
          entityType: "subscription",
          entityId: nextSubscription.id,
          metadataJson: {
            source: "paddle",
            sourceProviderEventId: eventId,
            sourceProviderEventType: eventType,
            previous: existingSubscription
              ? {
                  plan: existingSubscription.plan,
                  status: existingSubscription.status,
                  externalCustomerId: existingSubscription.externalCustomerId,
                  externalSubscriptionId: existingSubscription.externalSubscriptionId,
                }
              : null,
            next: {
              plan,
              status,
              externalCustomerId: nextSubscription.externalCustomerId,
              externalSubscriptionId: nextSubscription.externalSubscriptionId,
            },
          },
          ip: "paddle-webhook",
          createdAt: receivedAt,
        },
        ...state.auditLogs,
      ],
    },
  };
}
