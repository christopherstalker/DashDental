import { Prisma } from "@/generated/prisma/client";
import {
  getCurrentCalendarMonthPeriod,
  getPlanLimits,
} from "@/domain/business-rules";
import type { AppState, BillingEvent, Subscription } from "@/domain/types";
import { buildUsageIdempotencyKey } from "./usage-metering";
import { captureError, structuredLog } from "./observability";
import { prisma } from "./prisma";

type BillingPlan = Subscription["plan"];
type BillingStatus = Subscription["status"];

export interface StripeBillingEventInput {
  eventId: string;
  eventType: string;
  organizationId?: string;
  customerId?: string;
  subscriptionId?: string;
  stripeObject: Record<string, unknown>;
  receivedAt?: string;
  outboxEventId?: string;
  rawEvent?: Record<string, unknown>;
}

function createRuntimeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

function isBillingPlan(value: unknown): value is BillingPlan {
  return value === "starter" || value === "growth" || value === "scale";
}

function normalizeStatus(value: string | undefined, eventType: string): BillingStatus {
  if (eventType === "invoice.payment_failed") {
    return "past_due";
  }
  if (eventType === "invoice.payment_succeeded") {
    return "active";
  }
  if (eventType === "customer.subscription.deleted") {
    return "canceled";
  }
  if (eventType === "customer.subscription.trial_will_end") {
    return "trialing";
  }
  if (
    value === "active" ||
    value === "trialing" ||
    value === "past_due" ||
    value === "canceled" ||
    value === "unpaid" ||
    value === "read_only"
  ) {
    return value;
  }

  return "past_due";
}

function inferPlan(object: Record<string, unknown>, fallback: BillingPlan = "growth"): BillingPlan {
  const metadata = asRecord(object.metadata) ?? {};
  const metadataPlan = readString(metadata.plan);
  if (isBillingPlan(metadataPlan)) {
    return metadataPlan;
  }

  const items = asRecord(object.items);
  const firstItem = asRecord(asArray(items?.data)[0]);
  const price = asRecord(firstItem?.price);
  const lookupKey = readString(price?.lookup_key);
  if (isBillingPlan(lookupKey)) {
    return lookupKey;
  }

  const priceId = readString(price?.id);
  const envMatchedPlan = (["starter", "growth", "scale"] as BillingPlan[]).find(
    (plan) => process.env[`STRIPE_PRICE_${plan.toUpperCase()}`]?.trim() === priceId,
  );

  return envMatchedPlan ?? fallback;
}

function readOrganizationId(object: Record<string, unknown>): string | undefined {
  const metadata = asRecord(object.metadata);
  return readString(metadata?.organization_id) ?? readString(object.client_reference_id);
}

function readCustomerId(object: Record<string, unknown>): string | undefined {
  return readString(object.customer);
}

function readSubscriptionId(object: Record<string, unknown>, eventType: string): string | undefined {
  if (eventType === "checkout.session.completed" || eventType.startsWith("invoice.")) {
    return readString(object.subscription);
  }

  return readString(object.id) ?? readString(object.subscription);
}

function toIsoFromUnix(value: unknown, fallbackIso: string): string {
  const unixSeconds = readNumber(value);
  return unixSeconds ? new Date(unixSeconds * 1000).toISOString() : fallbackIso;
}

function resolvePeriod(input: {
  object: Record<string, unknown>;
  existing?: Subscription;
  receivedAt: string;
}) {
  const fallback = getCurrentCalendarMonthPeriod(input.receivedAt);

  return {
    currentPeriodStart: toIsoFromUnix(
      input.object.current_period_start,
      input.existing?.currentPeriodStart ?? fallback.startIso,
    ),
    currentPeriodEnd: toIsoFromUnix(
      input.object.current_period_end,
      input.existing?.currentPeriodEnd ?? fallback.endIso,
    ),
  };
}

function createBillingEvent(input: StripeBillingEventInput): BillingEvent {
  const receivedAt = input.receivedAt ?? new Date().toISOString();

  return {
    id: createRuntimeId("billing-event"),
    organizationId: input.organizationId ?? readOrganizationId(input.stripeObject),
    outboxEventId: input.outboxEventId,
    provider: "stripe",
    providerEventId: input.eventId,
    providerEventType: input.eventType,
    providerObjectId: readString(input.stripeObject.id),
    externalCustomerId: input.customerId ?? readCustomerId(input.stripeObject),
    externalSubscriptionId: input.subscriptionId ?? readSubscriptionId(input.stripeObject, input.eventType),
    status: "processing",
    eventCreatedAt: receivedAt,
    rawPayloadJson: input.rawEvent ?? {
      id: input.eventId,
      type: input.eventType,
      data: { object: input.stripeObject },
    },
    retryCount: 0,
    createdAt: receivedAt,
    updatedAt: receivedAt,
  };
}

export function applyStripeBillingEventToState(
  state: AppState,
  input: StripeBillingEventInput,
): { state: AppState; duplicate: boolean; billingEvent: BillingEvent } {
  const existingEvent = state.billingEvents.find(
    (event) => event.providerEventId === input.eventId,
  );
  if (existingEvent?.status === "processed" || existingEvent?.status === "skipped") {
    return { state, duplicate: true, billingEvent: existingEvent };
  }

  const receivedAt = input.receivedAt ?? new Date().toISOString();
  const organizationId =
    input.organizationId ?? readOrganizationId(input.stripeObject);
  const customerId = input.customerId ?? readCustomerId(input.stripeObject);
  const subscriptionId =
    input.subscriptionId ?? readSubscriptionId(input.stripeObject, input.eventType);
  const existingSubscription = state.subscriptions.find(
    (subscription) =>
      subscription.organizationId === organizationId &&
      ((subscriptionId &&
        subscription.externalSubscriptionId === subscriptionId) ||
        (customerId && subscription.externalCustomerId === customerId)),
  ) ?? state.subscriptions.find((subscription) => subscription.organizationId === organizationId);
  const plan = inferPlan(input.stripeObject, existingSubscription?.plan);
  const limits = getPlanLimits(plan);
  const status = normalizeStatus(readString(input.stripeObject.status), input.eventType);
  const period = resolvePeriod({
    object: input.stripeObject,
    existing: existingSubscription,
    receivedAt,
  });
  const nextBillingEvent: BillingEvent = {
    ...(existingEvent ?? createBillingEvent(input)),
    organizationId,
    subscriptionId: existingSubscription?.id,
    externalCustomerId: customerId,
    externalSubscriptionId: subscriptionId,
    status: organizationId ? "processed" : "skipped",
    decision: organizationId ? "applied" : "organization_unresolved",
    processedAt: receivedAt,
    resultJson: organizationId
      ? { plan, status, externalCustomerId: customerId, externalSubscriptionId: subscriptionId }
      : { reason: "organization_unresolved" },
    errorCode: undefined,
    errorMessage: undefined,
    lastErrorCode: undefined,
    lastErrorMessage: undefined,
    updatedAt: receivedAt,
  };

  if (!organizationId) {
    return {
      duplicate: false,
      billingEvent: nextBillingEvent,
      state: {
        ...state,
        billingEvents: [
          nextBillingEvent,
          ...state.billingEvents.filter((event) => event.providerEventId !== input.eventId),
        ],
      },
    };
  }

  const nextSubscription: Subscription = {
    id: existingSubscription?.id ?? `sub-${organizationId}`,
    organizationId,
    provider: "stripe",
    plan,
    status,
    currentPeriodStart: period.currentPeriodStart,
    currentPeriodEnd: period.currentPeriodEnd,
    externalCustomerId: customerId ?? existingSubscription?.externalCustomerId ?? "",
    externalSubscriptionId:
      subscriptionId ?? existingSubscription?.externalSubscriptionId ?? input.eventId,
  };
  const resolvedBillingEvent = {
    ...nextBillingEvent,
    subscriptionId: nextSubscription.id,
  };
  const activeStatuses: BillingStatus[] = [
    "active",
    "trialing",
    "past_due",
    "unpaid",
    "read_only",
  ];
  const auditId = createRuntimeId("audit");

  return {
    duplicate: false,
    billingEvent: resolvedBillingEvent,
    state: {
      ...state,
      subscriptions: [
        nextSubscription,
        ...state.subscriptions
          .filter((subscription) => subscription.organizationId !== organizationId)
          .concat(
            state.subscriptions
              .filter(
                (subscription) =>
                  subscription.organizationId === organizationId &&
                  subscription.id !== nextSubscription.id &&
                  !activeStatuses.includes(subscription.status),
              )
              .map((subscription) => ({
                ...subscription,
                status: "canceled" as BillingStatus,
              })),
          ),
      ],
      usageLimits: state.usageLimits.map((usage) =>
        usage.organizationId === organizationId
          ? {
              ...usage,
              maxUsers: limits.maxUsers,
              maxIntegrations: limits.maxIntegrations,
              monthlyMessages: limits.monthlyMessages,
              monthlyAiRuns: limits.monthlyAiRuns,
            }
          : usage,
      ).concat(
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
        ...state.billingEvents.filter((event) => event.providerEventId !== input.eventId),
      ],
      auditLogs: [
        {
          id: auditId,
          organizationId,
          actorUserId: "system",
          action: "billing.subscription_changed",
          entityType: "subscription",
          entityId: nextSubscription.id,
          metadataJson: {
            source: "stripe",
            sourceProviderEventId: input.eventId,
            sourceProviderEventType: input.eventType,
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
          ip: "stripe-webhook",
          createdAt: receivedAt,
        },
        ...state.auditLogs,
      ],
    },
  };
}

function normalizedInputFromOutboxPayload(
  payload: Record<string, unknown>,
  occurredAt: Date,
): StripeBillingEventInput | undefined {
  const stripeObject = asRecord(payload.stripeObject) ?? {};
  const eventId = readString(payload.externalEventId);
  const eventType = readString(payload.eventType);
  if (!eventId || !eventType) {
    return undefined;
  }

  return {
    eventId,
    eventType,
    organizationId: readString(payload.organizationId) ?? readOrganizationId(stripeObject),
    customerId: readCustomerId(stripeObject),
    subscriptionId: readSubscriptionId(stripeObject, eventType),
    stripeObject,
    receivedAt: occurredAt.toISOString(),
    rawEvent: asRecord(payload.rawEvent) ?? {
      id: eventId,
      type: eventType,
      data: { object: stripeObject },
    },
  };
}

export async function processStripeBillingOutboxEvent(outboxEventId: string) {
  const outboxEvent = await prisma.outboxEvent.findUnique({
    where: { id: outboxEventId },
  });
  if (!outboxEvent || outboxEvent.status === "dispatched") {
    return { outboxEventId, state: outboxEvent ? "already-dispatched" : "missing" };
  }

  await prisma.outboxEvent.update({
    where: { id: outboxEventId },
    data: {
      status: "dispatching",
      claimedAt: new Date(),
      claimExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
      attemptCount: { increment: 1 },
    },
  });

  const payload = (outboxEvent.payloadJson ?? {}) as Record<string, unknown>;
  const normalized = normalizedInputFromOutboxPayload(payload, outboxEvent.occurredAt);
  if (!normalized?.organizationId) {
    if (normalized?.eventId) {
      await prisma.billingEvent.updateMany({
        where: { providerEventId: normalized.eventId },
        data: {
          status: "skipped",
          decision: "organization_unresolved",
          processedAt: new Date(),
          resultJson: toJsonValue({ outboxEventId, state: "organization-unresolved" }),
        },
      });
    }
    await prisma.outboxEvent.update({
      where: { id: outboxEventId },
      data: {
        status: "dispatched",
        dispatchedAt: new Date(),
        claimedAt: null,
        claimExpiresAt: null,
        lastErrorCode: null,
        lastErrorMessage: null,
      },
    });
    structuredLog("warn", "stripe.event.skipped", {
      outboxEventId,
      eventId: normalized?.eventId,
      eventType: normalized?.eventType,
      status: "skipped",
      reason: "organization_unresolved",
    });
    return { outboxEventId, state: "invalid-or-unmapped-billing-event" };
  }
  const organizationId = normalized.organizationId;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existingEvent = await tx.billingEvent.findUnique({
        where: { providerEventId: normalized.eventId },
      });

      if (existingEvent?.status === "processed" || existingEvent?.status === "skipped") {
        await tx.outboxEvent.update({
          where: { id: outboxEventId },
          data: {
            status: "dispatched",
            dispatchedAt: new Date(),
            claimedAt: null,
            claimExpiresAt: null,
            lastErrorCode: null,
            lastErrorMessage: null,
          },
        });
        return {
          outboxEventId,
          state: "billing-event-already-recorded",
          billingEventId: existingEvent.id,
        };
      }

      const existingSubscription =
        normalized.subscriptionId
          ? await tx.subscription.findUnique({
              where: {
                organizationId_externalSubscriptionId: {
                  organizationId,
                  externalSubscriptionId: normalized.subscriptionId,
                },
              },
            })
          : await tx.subscription.findFirst({
              where: { organizationId },
              orderBy: { updatedAt: "desc" },
            });
      const latestAppliedSubscription = await tx.subscription.findFirst({
        where: {
          organizationId,
          lastProviderEventAt: { not: null },
        },
        orderBy: { lastProviderEventAt: "desc" },
        select: { id: true, lastProviderEventAt: true, lastProviderEventId: true },
      });

      if (
        latestAppliedSubscription?.lastProviderEventAt &&
        latestAppliedSubscription.lastProviderEventAt.getTime() >
          outboxEvent.occurredAt.getTime()
      ) {
        const skipped = {
          outboxEventId,
          state: "stale-event-skipped",
          latestProviderEventId: latestAppliedSubscription.lastProviderEventId,
          incomingProviderEventId: normalized.eventId,
        };
        const billingEvent = existingEvent
          ? await tx.billingEvent.update({
              where: { id: existingEvent.id },
              data: {
                status: "skipped",
                decision: "stale_event",
                processedAt: new Date(),
                resultJson: toJsonValue(skipped),
                errorCode: null,
                errorMessage: null,
                lastErrorCode: null,
                lastErrorMessage: null,
              },
            })
          : await tx.billingEvent.create({
              data: {
                organizationId,
                outboxEventId,
                provider: "stripe",
                providerEventId: normalized.eventId,
                providerEventType: normalized.eventType,
                providerObjectId: readString(normalized.stripeObject.id),
                externalCustomerId: normalized.customerId,
                externalSubscriptionId: normalized.subscriptionId,
                status: "skipped",
                decision: "stale_event",
                eventCreatedAt: outboxEvent.occurredAt,
                rawPayloadJson: toJsonValue(normalized.rawEvent),
                processedAt: new Date(),
                resultJson: toJsonValue(skipped),
              },
            });
        await tx.outboxEvent.update({
          where: { id: outboxEventId },
          data: { status: "dispatched", dispatchedAt: new Date() },
        });
        return { ...skipped, billingEventId: billingEvent.id };
      }

      const plan = inferPlan(normalized.stripeObject, existingSubscription?.plan);
      const limits = getPlanLimits(plan);
      const status = normalizeStatus(
        readString(normalized.stripeObject.status),
        normalized.eventType,
      );
      const period = resolvePeriod({
        object: normalized.stripeObject,
        existing: existingSubscription
          ? {
              id: existingSubscription.id,
              organizationId: existingSubscription.organizationId,
              provider: existingSubscription.provider as Subscription["provider"],
              plan: existingSubscription.plan,
              status: existingSubscription.status as BillingStatus,
              currentPeriodStart: existingSubscription.currentPeriodStart.toISOString(),
              currentPeriodEnd: existingSubscription.currentPeriodEnd.toISOString(),
              externalCustomerId: existingSubscription.externalCustomerId,
              externalSubscriptionId: existingSubscription.externalSubscriptionId,
            }
          : undefined,
        receivedAt: outboxEvent.occurredAt.toISOString(),
      });
      const subscription = existingSubscription
        ? await tx.subscription.update({
            where: { id: existingSubscription.id },
            data: {
              plan,
              status,
              externalCustomerId:
                normalized.customerId ?? existingSubscription.externalCustomerId,
              externalSubscriptionId:
                normalized.subscriptionId ?? existingSubscription.externalSubscriptionId,
              currentPeriodStart: new Date(period.currentPeriodStart),
              currentPeriodEnd: new Date(period.currentPeriodEnd),
              lastProviderEventId: normalized.eventId,
              lastProviderEventType: normalized.eventType,
              lastProviderEventAt: outboxEvent.occurredAt,
              lastSyncedAt: new Date(),
            },
          })
        : await tx.subscription.create({
            data: {
              organizationId,
              provider: "stripe",
              plan,
              status,
              externalCustomerId: normalized.customerId ?? "",
              externalSubscriptionId: normalized.subscriptionId ?? normalized.eventId,
              currentPeriodStart: new Date(period.currentPeriodStart),
              currentPeriodEnd: new Date(period.currentPeriodEnd),
              lastProviderEventId: normalized.eventId,
              lastProviderEventType: normalized.eventType,
              lastProviderEventAt: outboxEvent.occurredAt,
              lastSyncedAt: new Date(),
            },
          });

      await tx.subscription.updateMany({
        where: {
          organizationId,
          id: { not: subscription.id },
          status: { in: ["active", "trialing", "past_due", "unpaid", "read_only"] },
        },
        data: {
          status: "canceled",
          lastProviderEventId: normalized.eventId,
          lastProviderEventType: normalized.eventType,
          lastProviderEventAt: outboxEvent.occurredAt,
          lastSyncedAt: new Date(),
        },
      });

      await tx.usageLimit.upsert({
        where: { organizationId },
        create: {
          organizationId,
          ...limits,
          periodUsageJson: { users: 0, integrations: 0, messages: 0, aiRuns: 0 },
        },
        update: limits,
      });

      const usagePeriod = getCurrentCalendarMonthPeriod(outboxEvent.occurredAt.toISOString());
      await tx.usageEvent.createMany({
        data: [
          {
            organizationId,
            idempotencyKey: buildUsageIdempotencyKey({
              organizationId,
              metric: "messages",
              sourceEntityType: "billing_event",
              sourceEntityId: normalized.eventId,
            }).replace(":messages:", ":billing_sync:"),
            metric: "billing_sync",
            quantity: 1,
            sourceEntityType: "billing_event",
            sourceEntityId: normalized.eventId,
            periodStart: new Date(usagePeriod.startIso),
            periodEnd: new Date(usagePeriod.endIso),
            occurredAt: outboxEvent.occurredAt,
            metadataJson: toJsonValue({
              eventType: normalized.eventType,
              plan,
              status,
            }),
          },
        ],
        skipDuplicates: true,
      });

      const resultJson = {
        outboxEventId,
        state: "billing-synced",
        subscriptionId: subscription.id,
        status,
        plan,
      };
      const billingEvent = existingEvent
        ? await tx.billingEvent.update({
            where: { id: existingEvent.id },
            data: {
              organizationId,
              subscriptionId: subscription.id,
              outboxEventId,
              providerEventType: normalized.eventType,
              providerObjectId: readString(normalized.stripeObject.id),
              externalCustomerId: normalized.customerId,
              externalSubscriptionId: normalized.subscriptionId,
              status: "processed",
              decision: "applied",
              eventCreatedAt: outboxEvent.occurredAt,
              rawPayloadJson: toJsonValue(normalized.rawEvent),
              processedAt: new Date(),
              resultJson: toJsonValue(resultJson),
              errorCode: null,
              errorMessage: null,
              lastErrorCode: null,
              lastErrorMessage: null,
            },
          })
        : await tx.billingEvent.create({
            data: {
              organizationId,
              subscriptionId: subscription.id,
              outboxEventId,
              provider: "stripe",
              providerEventId: normalized.eventId,
              providerEventType: normalized.eventType,
              providerObjectId: readString(normalized.stripeObject.id),
              externalCustomerId: normalized.customerId,
              externalSubscriptionId: normalized.subscriptionId,
              status: "processed",
              decision: "applied",
              eventCreatedAt: outboxEvent.occurredAt,
              rawPayloadJson: toJsonValue(normalized.rawEvent),
              processedAt: new Date(),
              resultJson: toJsonValue(resultJson),
            },
          });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: "system",
          action: "billing.subscription_changed",
          entityType: "subscription",
          entityId: subscription.id,
          metadataJson: toJsonValue({
            source: "stripe",
            sourceProviderEventId: normalized.eventId,
            sourceProviderEventType: normalized.eventType,
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
              externalCustomerId: subscription.externalCustomerId,
              externalSubscriptionId: subscription.externalSubscriptionId,
            },
          }),
          ip: "stripe-webhook",
        },
      });

      await tx.outboxEvent.update({
        where: { id: outboxEventId },
        data: {
          status: "dispatched",
          dispatchedAt: new Date(),
          claimedAt: null,
          claimExpiresAt: null,
          lastErrorCode: null,
          lastErrorMessage: null,
        },
      });

      return { ...resultJson, billingEventId: billingEvent.id };
    });

    structuredLog("info", "stripe.event.processed", {
      organizationId,
      outboxEventId,
      eventId: normalized.eventId,
      eventType: normalized.eventType,
      status: result.state,
      billingEventId: result.billingEventId,
    });

    return result;
  } catch (error) {
    const errorCode = error instanceof Error ? error.name : "billing_sync_error";
    const errorMessage = error instanceof Error ? error.message : String(error);
    const providerEventId = normalized.eventId;

    await prisma.billingEvent.updateMany({
      where: { providerEventId },
      data: {
        status: "failed",
        decision: "processing_error",
        processedAt: new Date(),
        retryCount: { increment: 1 },
        errorCode,
        errorMessage,
        lastErrorCode: errorCode,
        lastErrorMessage: errorMessage,
      },
    });
    await prisma.outboxEvent.update({
      where: { id: outboxEventId },
      data: {
        status: outboxEvent.attemptCount + 1 >= 8 ? "dead_letter" : "failed",
        claimedAt: null,
        claimExpiresAt: null,
        lastErrorCode: errorCode,
        lastErrorMessage: errorMessage,
      },
    });
    captureError(error, {
      event: "stripe.event.failed",
      organizationId,
      outboxEventId,
      eventId: providerEventId,
      eventType: normalized.eventType,
      status: outboxEvent.attemptCount + 1 >= 8 ? "dead_letter" : "failed",
    });
    throw error;
  }
}
