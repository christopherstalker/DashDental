import {
  isSubscriptionPeriodCurrent,
} from "@/domain/business-rules";
import type { AppState, Subscription } from "@/domain/types";
import { ApiError } from "./api-error";
import { structuredLog } from "./observability";

type EntitlementDecision = {
  allowed: boolean;
  reason?: string;
  current?: number;
  limit?: number;
};

type FeatureKey =
  | "billing_admin"
  | "inbox_read"
  | "lead_read"
  | "setup_read"
  | "send_message"
  | "use_ai"
  | "add_seat"
  | "connect_channel";

const readableFeatures = new Set<FeatureKey>([
  "billing_admin",
  "inbox_read",
  "lead_read",
  "setup_read",
]);

function activeSubscriptionForOrganization(
  state: AppState,
  organizationId: string,
): Subscription | undefined {
  return state.subscriptions
    .filter((subscription) => subscription.organizationId === organizationId)
    .toSorted((left, right) => {
      const leftTime = Date.parse(left.currentPeriodEnd);
      const rightTime = Date.parse(right.currentPeriodEnd);
      return rightTime - leftTime;
    })
    .at(0);
}

export function getBillingAccessPolicy(
  state: AppState,
  organizationId: string,
  nowIso = new Date().toISOString(),
) {
  const subscription = activeSubscriptionForOrganization(state, organizationId);
  const periodCurrent = isSubscriptionPeriodCurrent(subscription, nowIso);
  const status = subscription?.status ?? "not_configured";
  const canReadData = Boolean(subscription) && periodCurrent;
  const paidActionsAllowed =
    periodCurrent && (status === "active" || status === "trialing");

  return {
    status,
    subscription,
    periodCurrent,
    canReadData,
    paidActionsAllowed,
    readOnly: canReadData && !paidActionsAllowed,
    reason: !subscription
      ? "subscription_missing"
      : !periodCurrent
        ? "subscription_period_expired"
        : paidActionsAllowed
          ? undefined
          : "billing_read_only",
  };
}

function usageForOrganization(state: AppState, organizationId: string) {
  return state.usageLimits.find((usage) => usage.organizationId === organizationId);
}

function paidActionAllowed(
  state: AppState,
  organizationId: string,
  nowIso?: string,
): EntitlementDecision {
  const policy = getBillingAccessPolicy(state, organizationId, nowIso);
  return policy.paidActionsAllowed
    ? { allowed: true }
    : { allowed: false, reason: policy.reason ?? "billing_read_only" };
}

function underLimit(
  current: number,
  limit: number,
  reason = "usage_limit_exceeded",
): EntitlementDecision {
  return current < limit
    ? { allowed: true, current, limit }
    : { allowed: false, reason, current, limit };
}

export function canSendMessage(
  state: AppState,
  organizationId: string,
  nowIso?: string,
): EntitlementDecision {
  const billing = paidActionAllowed(state, organizationId, nowIso);
  if (!billing.allowed) {
    return billing;
  }

  const usage = usageForOrganization(state, organizationId);
  if (!usage) {
    return { allowed: false, reason: "usage_limits_missing" };
  }

  return underLimit(usage.periodUsageJson.messages, usage.monthlyMessages);
}

export function canUseAI(
  state: AppState,
  organizationId: string,
  nowIso?: string,
): EntitlementDecision {
  const billing = paidActionAllowed(state, organizationId, nowIso);
  if (!billing.allowed) {
    return billing;
  }

  const usage = usageForOrganization(state, organizationId);
  if (!usage) {
    return { allowed: false, reason: "usage_limits_missing" };
  }

  return underLimit(usage.periodUsageJson.aiRuns, usage.monthlyAiRuns);
}

export function canAddSeat(
  state: AppState,
  organizationId: string,
  nowIso?: string,
): EntitlementDecision {
  const billing = paidActionAllowed(state, organizationId, nowIso);
  if (!billing.allowed) {
    return billing;
  }

  const usage = usageForOrganization(state, organizationId);
  if (!usage) {
    return { allowed: false, reason: "usage_limits_missing" };
  }
  const activeSeats = state.memberships.filter(
    (membership) =>
      membership.organizationId === organizationId &&
      membership.status === "active",
  ).length;

  return underLimit(activeSeats, usage.maxUsers);
}

export function canConnectChannel(
  state: AppState,
  organizationId: string,
  nowIso?: string,
): EntitlementDecision {
  const billing = paidActionAllowed(state, organizationId, nowIso);
  if (!billing.allowed) {
    return billing;
  }

  const usage = usageForOrganization(state, organizationId);
  if (!usage) {
    return { allowed: false, reason: "usage_limits_missing" };
  }
  const currentConnections = Math.max(
    usage.periodUsageJson.integrations,
    state.integrations.filter(
      (integration) =>
        integration.organizationId === organizationId &&
        integration.status !== "disconnected",
    ).length,
  );

  return underLimit(currentConnections, usage.maxIntegrations);
}

export function canAccessFeature(
  state: AppState,
  organizationId: string,
  feature: FeatureKey,
  nowIso?: string,
): EntitlementDecision {
  if (readableFeatures.has(feature)) {
    const policy = getBillingAccessPolicy(state, organizationId, nowIso);
    return policy.canReadData || feature === "billing_admin" || feature === "setup_read"
      ? { allowed: true }
      : { allowed: false, reason: policy.reason };
  }

  if (feature === "send_message") {
    return canSendMessage(state, organizationId, nowIso);
  }
  if (feature === "use_ai") {
    return canUseAI(state, organizationId, nowIso);
  }
  if (feature === "add_seat") {
    return canAddSeat(state, organizationId, nowIso);
  }

  return canConnectChannel(state, organizationId, nowIso);
}

export function assertEntitlement(decision: EntitlementDecision) {
  if (!decision.allowed) {
    structuredLog("warn", "entitlement.denied", {
      status: "denied",
      reason: decision.reason ?? "billing_action_blocked",
      current: decision.current,
      limit: decision.limit,
    });
    throw new ApiError(
      decision.reason === "usage_limit_exceeded" ? 429 : 402,
      decision.reason === "usage_limit_exceeded"
        ? "Plan usage limit reached"
        : "Billing status is read-only for this action",
      decision.reason ?? "billing_action_blocked",
      {
        current: decision.current,
        limit: decision.limit,
      },
    );
  }
}
