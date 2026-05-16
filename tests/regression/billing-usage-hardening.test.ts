import assert from "node:assert/strict";
import test from "node:test";
import { defaultOrganizationId } from "../../src/domain/seed-data";
import type { AppState, Subscription } from "../../src/domain/types";
import { getRuntimeSeedState } from "../../src/server/runtime-state";

function cloneState(): AppState {
  return structuredClone(getRuntimeSeedState());
}

function withSubscription(
  state: AppState,
  patch: Partial<Subscription> & Pick<Subscription, "status">,
): AppState {
  const existing = state.subscriptions.find(
    (subscription) => subscription.organizationId === defaultOrganizationId,
  );
  const subscription: Subscription = {
    id: existing?.id ?? "sub-test",
    organizationId: defaultOrganizationId,
    provider: "stripe",
    plan: "starter",
    currentPeriodStart: patch.currentPeriodStart ?? "2026-05-01T00:00:00.000Z",
    currentPeriodEnd: patch.currentPeriodEnd ?? "2026-06-01T00:00:00.000Z",
    externalCustomerId: patch.externalCustomerId ?? "cus_test",
    externalSubscriptionId: patch.externalSubscriptionId ?? "sub_test",
    ...patch,
  };

  return {
    ...state,
    subscriptions: [
      subscription,
      ...state.subscriptions.filter((item) => item.organizationId !== defaultOrganizationId),
    ],
  };
}

test("duplicate Stripe billing event is ledgered once and does not double-apply", async () => {
  const { applyStripeBillingEventToState } = await import("../../src/server/billing-ledger");
  const state = withSubscription(cloneState(), { status: "active", plan: "starter" });
  const input = {
    eventId: "evt_duplicate_subscription_update",
    eventType: "customer.subscription.updated",
    organizationId: defaultOrganizationId,
    customerId: "cus_test",
    subscriptionId: "sub_test",
    stripeObject: {
      id: "sub_test",
      customer: "cus_test",
      status: "active",
      metadata: { organization_id: defaultOrganizationId, plan: "growth" },
      current_period_start: 1_777_593_600,
      current_period_end: 1_780_272_000,
    },
    receivedAt: "2026-05-01T10:00:00.000Z",
  };

  const first = applyStripeBillingEventToState(state, input);
  const second = applyStripeBillingEventToState(first.state, input);

  assert.equal(first.duplicate, false);
  assert.equal(second.duplicate, true);
  assert.equal(
    second.state.billingEvents.filter((event) => event.providerEventId === input.eventId).length,
    1,
  );
  assert.equal(
    second.state.auditLogs.filter(
      (log) => log.metadataJson.sourceProviderEventId === input.eventId,
    ).length,
    1,
  );
  assert.equal(
    second.state.subscriptions.filter(
      (subscription) => subscription.organizationId === defaultOrganizationId,
    ).length,
    1,
  );
});

test("invoice payment failure makes subscription past_due with read-only data policy", async () => {
  const { applyStripeBillingEventToState } = await import("../../src/server/billing-ledger");
  const { canAccessFeature, canSendMessage, getBillingAccessPolicy } = await import(
    "../../src/server/entitlements"
  );
  const state = withSubscription(cloneState(), { status: "active", plan: "growth" });

  const result = applyStripeBillingEventToState(state, {
    eventId: "evt_invoice_failed",
    eventType: "invoice.payment_failed",
    organizationId: defaultOrganizationId,
    customerId: "cus_test",
    subscriptionId: "sub_test",
    stripeObject: {
      id: "in_failed",
      customer: "cus_test",
      subscription: "sub_test",
      metadata: { organization_id: defaultOrganizationId },
    },
    receivedAt: "2026-05-01T11:00:00.000Z",
  });

  const subscription = result.state.subscriptions.find(
    (item) => item.organizationId === defaultOrganizationId,
  );
  const policy = getBillingAccessPolicy(result.state, defaultOrganizationId, "2026-05-02T00:00:00.000Z");

  assert.equal(subscription?.status, "past_due");
  assert.equal(policy.canReadData, true);
  assert.equal(policy.paidActionsAllowed, false);
  assert.equal(canAccessFeature(result.state, defaultOrganizationId, "inbox_read").allowed, true);
  assert.equal(canSendMessage(result.state, defaultOrganizationId).allowed, false);
});

test("manual admin grant can put a clinic on read-only hold and audit the change", async () => {
  const { activateManualSubscription } = await import("../../src/server/state-mutations");
  const { canAccessFeature, canSendMessage, getBillingAccessPolicy } = await import(
    "../../src/server/entitlements"
  );
  const state = withSubscription(cloneState(), { status: "active", plan: "growth" });

  const result = activateManualSubscription(state, {
    actorUserId: "user-super-admin",
    externalReference: "INV-READONLY-001",
    organizationId: defaultOrganizationId,
    periodDays: 30,
    plan: "growth",
    status: "read_only",
    nowIso: "2026-05-09T10:00:00.000Z",
  });
  const subscription = result.subscriptions.find(
    (item) => item.organizationId === defaultOrganizationId,
  );
  const policy = getBillingAccessPolicy(result, defaultOrganizationId, "2026-05-10T10:00:00.000Z");

  assert.equal(subscription?.status, "read_only");
  assert.equal(policy.canReadData, true);
  assert.equal(policy.paidActionsAllowed, false);
  assert.equal(canAccessFeature(result, defaultOrganizationId, "inbox_read").allowed, true);
  assert.equal(canSendMessage(result, defaultOrganizationId).allowed, false);
  assert.ok(
    result.auditLogs.some(
      (log) =>
        log.action === "subscription.manual_status_changed" &&
        log.metadataJson.externalReference === "INV-READONLY-001",
    ),
  );
});

test("subscription update changes entitlement limits without changing pricing logic", async () => {
  const { applyStripeBillingEventToState } = await import("../../src/server/billing-ledger");
  const { canSendMessage } = await import("../../src/server/entitlements");
  const state = {
    ...withSubscription(cloneState(), { status: "active", plan: "starter" }),
    usageLimits: cloneState().usageLimits.map((usage) =>
      usage.organizationId === defaultOrganizationId
        ? {
            ...usage,
            maxUsers: 4,
            maxIntegrations: 2,
            monthlyMessages: 2000,
            monthlyAiRuns: 120,
            periodUsageJson: { ...usage.periodUsageJson, messages: 2000 },
          }
        : usage,
    ),
  };

  assert.equal(canSendMessage(state, defaultOrganizationId).allowed, false);

  const result = applyStripeBillingEventToState(state, {
    eventId: "evt_upgrade_to_growth",
    eventType: "customer.subscription.updated",
    organizationId: defaultOrganizationId,
    customerId: "cus_test",
    subscriptionId: "sub_test",
    stripeObject: {
      id: "sub_test",
      customer: "cus_test",
      status: "active",
      metadata: { organization_id: defaultOrganizationId, plan: "growth" },
      current_period_start: 1_777_593_600,
      current_period_end: 1_780_272_000,
    },
    receivedAt: "2026-05-01T12:00:00.000Z",
  });

  const usage = result.state.usageLimits.find((item) => item.organizationId === defaultOrganizationId);
  assert.equal(usage?.monthlyMessages, 10000);
  assert.equal(canSendMessage(result.state, defaultOrganizationId).allowed, true);
});

test("usage events are immutable and idempotent while maintaining monthly snapshot", async () => {
  const { recordUsageEventInState } = await import("../../src/server/usage-metering");
  const state = withSubscription(cloneState(), { status: "active", plan: "growth" });
  const before = state.usageLimits.find((usage) => usage.organizationId === defaultOrganizationId)
    ?.periodUsageJson.aiRuns;

  const first = recordUsageEventInState(state, {
    organizationId: defaultOrganizationId,
    metric: "aiRuns",
    quantity: 1,
    sourceEntityType: "conversation",
    sourceEntityId: "conv-usage-test",
    occurredAt: "2026-05-02T09:00:00.000Z",
    metadataJson: { model: "gpt-5.4-mini" },
  });
  const second = recordUsageEventInState(first.state, {
    organizationId: defaultOrganizationId,
    metric: "aiRuns",
    quantity: 1,
    sourceEntityType: "conversation",
    sourceEntityId: "conv-usage-test",
    occurredAt: "2026-05-02T09:00:00.000Z",
    metadataJson: { model: "gpt-5.4-mini" },
  });

  const after = second.state.usageLimits.find((usage) => usage.organizationId === defaultOrganizationId)
    ?.periodUsageJson.aiRuns;

  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(second.state.usageEvents.filter((event) => event.metric === "aiRuns").length, 1);
  assert.equal(after, (before ?? 0) + 1);
});

test("quota service blocks paid actions over limit and canceled tenants keep read access", async () => {
  const { canAccessFeature, canConnectChannel, canSendMessage } = await import(
    "../../src/server/entitlements"
  );
  const activeOverLimit = {
    ...withSubscription(cloneState(), { status: "active", plan: "starter" }),
    usageLimits: cloneState().usageLimits.map((usage) =>
      usage.organizationId === defaultOrganizationId
        ? {
            ...usage,
            monthlyMessages: 1,
            maxIntegrations: 1,
            periodUsageJson: { ...usage.periodUsageJson, messages: 1, integrations: 1 },
          }
        : usage,
    ),
  };
  const canceled = withSubscription(cloneState(), { status: "canceled", plan: "growth" });

  assert.equal(canSendMessage(activeOverLimit, defaultOrganizationId).allowed, false);
  assert.equal(canConnectChannel(activeOverLimit, defaultOrganizationId).allowed, false);
  assert.equal(canAccessFeature(canceled, defaultOrganizationId, "inbox_read").allowed, true);
  assert.equal(canSendMessage(canceled, defaultOrganizationId).allowed, false);
});

test("tenant A billing event cannot mutate tenant B subscription", async () => {
  const { applyStripeBillingEventToState } = await import("../../src/server/billing-ledger");
  const state: AppState = {
    ...withSubscription(cloneState(), { status: "active", plan: "starter" }),
    organizations: [
      ...cloneState().organizations,
      {
        id: "org-tenant-b",
        name: "Tenant B",
        timezone: "UTC",
        currency: "USD",
        averagePatientValue: 500,
        businessHours: { start: "09:00", end: "17:00", weekdays: [1, 2, 3, 4, 5] },
        status: "active",
      },
    ],
    subscriptions: [
      ...withSubscription(cloneState(), { status: "active", plan: "starter" }).subscriptions,
      {
        id: "sub-tenant-b",
        organizationId: "org-tenant-b",
        provider: "stripe",
        plan: "scale",
        status: "active",
        currentPeriodStart: "2026-05-01T00:00:00.000Z",
        currentPeriodEnd: "2026-06-01T00:00:00.000Z",
        externalCustomerId: "cus_tenant_b",
        externalSubscriptionId: "sub_tenant_b",
      },
    ],
  };

  const result = applyStripeBillingEventToState(state, {
    eventId: "evt_tenant_a_update",
    eventType: "customer.subscription.updated",
    organizationId: defaultOrganizationId,
    customerId: "cus_test",
    subscriptionId: "sub_test",
    stripeObject: {
      id: "sub_test",
      customer: "cus_test",
      status: "active",
      metadata: { organization_id: defaultOrganizationId, plan: "growth" },
      current_period_start: 1_777_593_600,
      current_period_end: 1_780_272_000,
    },
    receivedAt: "2026-05-01T13:00:00.000Z",
  });

  const tenantBSubscription = result.state.subscriptions.find(
    (subscription) => subscription.organizationId === "org-tenant-b",
  );

  assert.equal(tenantBSubscription?.plan, "scale");
  assert.equal(tenantBSubscription?.status, "active");
  assert.equal(
    result.state.billingEvents.every(
      (event) => event.organizationId !== "org-tenant-b",
    ),
    true,
  );
});
