import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@app/infra/prisma/prisma.service';
import { StripeService } from './stripe.service';

type BillingPlan = 'starter' | 'growth' | 'scale';
type BillingStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'read_only';

interface StripeNormalizedPayload {
  organizationId?: string;
  eventType?: string;
  externalEventId?: string;
  stripeObject?: Record<string, unknown>;
  objectId?: string;
}

const PLAN_LIMITS: Record<
  BillingPlan,
  { maxUsers: number; maxIntegrations: number; monthlyMessages: number; monthlyAiRuns: number }
> = {
  starter: {
    maxUsers: 4,
    maxIntegrations: 2,
    monthlyMessages: 2000,
    monthlyAiRuns: 120,
  },
  growth: {
    maxUsers: 10,
    maxIntegrations: 5,
    monthlyMessages: 10000,
    monthlyAiRuns: 600,
  },
  scale: {
    maxUsers: 30,
    maxIntegrations: 12,
    monthlyMessages: 40000,
    monthlyAiRuns: 2500,
  },
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function normalizeStatus(value?: string): BillingStatus {
  if (
    value === 'trialing' ||
    value === 'active' ||
    value === 'past_due' ||
    value === 'canceled' ||
    value === 'unpaid' ||
    value === 'read_only'
  ) {
    return value;
  }

  return 'past_due';
}

function inferPlan(object: Record<string, unknown>): BillingPlan {
  const metadata = asRecord(object.metadata) ?? {};
  const metadataPlan = readString(metadata.plan);
  if (metadataPlan === 'starter' || metadataPlan === 'growth' || metadataPlan === 'scale') {
    return metadataPlan;
  }

  const items = asRecord(object.items);
  const firstItem = asRecord(asArray(items?.data)[0]);
  const price = asRecord(firstItem?.price);
  const lookupKey = readString(price?.lookup_key);
  if (lookupKey === 'starter' || lookupKey === 'growth' || lookupKey === 'scale') {
    return lookupKey;
  }

  const priceId = readString(price?.id);
  const envMatchedPlan = (['starter', 'growth', 'scale'] as BillingPlan[]).find(
    (plan) => process.env[`STRIPE_PRICE_${plan.toUpperCase()}`]?.trim() === priceId,
  );

  return envMatchedPlan ?? 'growth';
}

function toIsoFromUnix(value: unknown): Date {
  const unixSeconds = readNumber(value);
  return unixSeconds ? new Date(unixSeconds * 1000) : new Date();
}

function truncateError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.length > 500 ? `${message.slice(0, 497)}...` : message;
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly prisma: PrismaService,
  ) {}

  async openCheckout(organizationId: string, plan: string) {
    return this.stripeService.createCheckoutSession(organizationId, plan);
  }

  async openPortal(organizationId: string) {
    return this.stripeService.createCustomerPortalSession(organizationId);
  }

  async syncSubscriptionFromWebhook(eventId: string) {
    return { eventId, synced: true };
  }

  async getBillingHealthSnapshot() {
    const now = new Date();
    const cutoff24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const staleProcessingBefore = new Date(now.getTime() - 5 * 60 * 1000);

    const [
      processing,
      staleProcessing,
      failed,
      skipped24h,
      processed24h,
      latestFailures,
    ] = await Promise.all([
      this.prisma.billingEvent.count({
        where: { status: 'processing' },
      }),
      this.prisma.billingEvent.count({
        where: {
          status: 'processing',
          updatedAt: { lte: staleProcessingBefore },
        },
      }),
      this.prisma.billingEvent.count({
        where: { status: 'failed' },
      }),
      this.prisma.billingEvent.count({
        where: {
          status: 'skipped',
          processedAt: { gte: cutoff24h },
        },
      }),
      this.prisma.billingEvent.count({
        where: {
          status: 'processed',
          processedAt: { gte: cutoff24h },
        },
      }),
      this.prisma.billingEvent.findMany({
        where: { status: 'failed' },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          organizationId: true,
          providerEventId: true,
          providerEventType: true,
          errorMessage: true,
          updatedAt: true,
        },
      }),
    ]);

    return {
      checkedAt: now.toISOString(),
      processing,
      staleProcessing,
      failed,
      skipped24h,
      processed24h,
      latestFailures: latestFailures.map((event) => ({
        id: event.id,
        organizationId: event.organizationId,
        providerEventId: event.providerEventId,
        providerEventType: event.providerEventType,
        errorMessage: event.errorMessage,
        updatedAt: event.updatedAt.toISOString(),
      })),
    };
  }

  async syncSubscriptionFromOutboxEvent(outboxEventId: string) {
    const outboxEvent = await this.prisma.outboxEvent.findUnique({
      where: { id: outboxEventId },
    });
    if (!outboxEvent) {
      return { outboxEventId, state: 'missing-outbox-event' };
    }

    const payload = (asRecord(outboxEvent.payloadJson) ?? {}) as StripeNormalizedPayload;
    const organizationId = readString(payload.organizationId);
    const eventType = readString(payload.eventType);
    const providerEventId =
      readString(payload.externalEventId) ??
      readString(outboxEvent.causationId) ??
      outboxEvent.id;
    const stripeObject = asRecord(payload.stripeObject) ?? {};
    const providerObjectId =
      readString(payload.objectId) ??
      readString(stripeObject.id) ??
      readString(stripeObject.subscription);

    if (!organizationId || !eventType || !providerEventId) {
      return { outboxEventId, state: 'invalid-payload' };
    }

    const plan = inferPlan(stripeObject);
    const limits = PLAN_LIMITS[plan];
    const eventCreatedAt = outboxEvent.occurredAt;

    const subscriptionData =
      eventType === 'checkout.session.completed'
        ? {
            customerId: readString(stripeObject.customer),
            subscriptionId:
              readString(stripeObject.subscription) ?? providerObjectId,
            status: 'active' as BillingStatus,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          }
        : {
            customerId: readString(stripeObject.customer),
            subscriptionId: readString(stripeObject.id) ?? providerObjectId,
            status: normalizeStatus(readString(stripeObject.status)),
            currentPeriodStart: toIsoFromUnix(stripeObject.current_period_start),
            currentPeriodEnd: toIsoFromUnix(stripeObject.current_period_end),
          };

    const billingEvent = await this.claimBillingEvent({
      organizationId,
      outboxEventId,
      providerEventId,
      providerEventType: eventType,
      providerObjectId,
      externalCustomerId: subscriptionData.customerId,
      externalSubscriptionId: subscriptionData.subscriptionId,
      eventCreatedAt,
      rawPayloadJson: {
        eventType,
        externalEventId: providerEventId,
        stripeObject,
      },
    });

    if (!billingEvent.claimed) {
      return {
        outboxEventId,
        state: billingEvent.state,
        billingEventId: billingEvent.billingEventId,
      };
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
      const latestAppliedSubscription = await tx.subscription.findFirst({
        where: {
          organizationId,
          lastProviderEventAt: { not: null },
        },
        orderBy: { lastProviderEventAt: 'desc' },
        select: {
          id: true,
          lastProviderEventAt: true,
          lastProviderEventId: true,
        },
      });

      if (
        latestAppliedSubscription?.lastProviderEventAt &&
        latestAppliedSubscription.lastProviderEventAt.getTime() >
          eventCreatedAt.getTime()
      ) {
        const skipped = {
          outboxEventId,
          state: 'stale-event-skipped',
          billingEventId: billingEvent.billingEventId,
          latestProviderEventId: latestAppliedSubscription.lastProviderEventId,
          latestProviderEventAt:
            latestAppliedSubscription.lastProviderEventAt.toISOString(),
          incomingProviderEventId: providerEventId,
          incomingProviderEventAt: eventCreatedAt.toISOString(),
        };

        await tx.billingEvent.update({
          where: { id: billingEvent.billingEventId },
          data: {
            status: 'skipped',
            decision: 'stale_event',
            processedAt: new Date(),
            resultJson: toJsonValue(skipped),
          },
        });

        return skipped;
      }

      const existingSubscription = subscriptionData.subscriptionId
        ? await tx.subscription.findUnique({
            where: {
              organizationId_externalSubscriptionId: {
                organizationId,
                externalSubscriptionId: subscriptionData.subscriptionId,
              },
            },
          })
        : await tx.subscription.findFirst({
            where: { organizationId },
          });

      const nextSubscription = existingSubscription
        ? await tx.subscription.update({
            where: { id: existingSubscription.id },
            data: {
              plan,
              status: subscriptionData.status,
              externalCustomerId:
                subscriptionData.customerId ?? existingSubscription.externalCustomerId,
              externalSubscriptionId:
                subscriptionData.subscriptionId ?? existingSubscription.externalSubscriptionId,
              currentPeriodStart: subscriptionData.currentPeriodStart,
              currentPeriodEnd: subscriptionData.currentPeriodEnd,
              lastProviderEventId: providerEventId,
              lastProviderEventType: eventType,
              lastProviderEventAt: eventCreatedAt,
              lastSyncedAt: new Date(),
            },
            select: {
              id: true,
              status: true,
              plan: true,
            },
          })
        : await tx.subscription.create({
            data: {
              organizationId,
              provider: 'stripe',
              plan,
              status: subscriptionData.status,
              currentPeriodStart: subscriptionData.currentPeriodStart,
              currentPeriodEnd: subscriptionData.currentPeriodEnd,
              externalCustomerId: subscriptionData.customerId ?? '',
              externalSubscriptionId:
                subscriptionData.subscriptionId ?? payload.objectId ?? providerEventId,
              lastProviderEventId: providerEventId,
              lastProviderEventType: eventType,
              lastProviderEventAt: eventCreatedAt,
              lastSyncedAt: new Date(),
            },
            select: {
              id: true,
              status: true,
              plan: true,
            },
          });

      const existingUsage = await tx.usageLimit.findUnique({
        where: { organizationId },
      });

      if (existingUsage) {
        await tx.usageLimit.update({
          where: { organizationId },
          data: limits,
        });
      } else {
        await tx.usageLimit.create({
          data: {
            organizationId,
            ...limits,
            periodUsageJson: {
              users: 0,
              integrations: 0,
              messages: 0,
              aiRuns: 0,
            },
          },
        });
      }

      await tx.subscription.updateMany({
        where: {
          organizationId,
          id: { not: nextSubscription.id },
          status: { in: ['active', 'trialing', 'past_due', 'unpaid', 'read_only'] },
        },
        data: {
          status: 'canceled',
          lastProviderEventId: providerEventId,
          lastProviderEventType: eventType,
          lastProviderEventAt: eventCreatedAt,
          lastSyncedAt: new Date(),
        },
      });

      await tx.usageEvent.createMany({
        data: [
          {
            organizationId,
            idempotencyKey: `${organizationId}:billing_sync:billing_event:${providerEventId}`,
            metric: 'billing_sync',
            quantity: 1,
            sourceEntityType: 'outbox_event',
            sourceEntityId: outboxEvent.id,
            periodStart: new Date(
              Date.UTC(
                outboxEvent.occurredAt.getUTCFullYear(),
                outboxEvent.occurredAt.getUTCMonth(),
                1,
              ),
            ),
            occurredAt: outboxEvent.occurredAt,
            metadataJson: {
              eventType,
              plan,
              status: nextSubscription.status,
            },
          },
        ],
        skipDuplicates: true,
      });

      const synced = {
        outboxEventId,
        state: 'billing-synced',
        billingEventId: billingEvent.billingEventId,
        subscriptionId: nextSubscription.id,
        status: nextSubscription.status,
        plan: nextSubscription.plan,
      };

      await tx.billingEvent.update({
        where: { id: billingEvent.billingEventId },
        data: {
          subscriptionId: nextSubscription.id,
          externalCustomerId: subscriptionData.customerId,
          externalSubscriptionId: subscriptionData.subscriptionId,
          status: 'processed',
          decision: 'applied',
          processedAt: new Date(),
          resultJson: toJsonValue(synced),
          errorCode: null,
          errorMessage: null,
          lastErrorCode: null,
          lastErrorMessage: null,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: 'system',
          action: 'billing.subscription_changed',
          entityType: 'subscription',
          entityId: nextSubscription.id,
          metadataJson: toJsonValue({
            source: 'stripe',
            sourceProviderEventId: providerEventId,
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
              plan: nextSubscription.plan,
              status: nextSubscription.status,
              externalCustomerId:
                subscriptionData.customerId ?? existingSubscription?.externalCustomerId ?? '',
              externalSubscriptionId:
                subscriptionData.subscriptionId ??
                existingSubscription?.externalSubscriptionId ??
                providerEventId,
            },
          }),
          ip: 'stripe-webhook',
        },
      });

      return synced;
      });

      return result;
    } catch (error) {
      await this.markBillingEventFailed(providerEventId, error);
      throw error;
    }
  }

  private async claimBillingEvent(input: {
    organizationId: string;
    outboxEventId: string;
    providerEventId: string;
    providerEventType: string;
    providerObjectId?: string;
    externalCustomerId?: string;
    externalSubscriptionId?: string;
    eventCreatedAt: Date;
    rawPayloadJson?: Record<string, unknown>;
  }): Promise<
    | { claimed: true; billingEventId: string }
    | { claimed: false; billingEventId: string; state: string }
  > {
    const existing = await this.prisma.billingEvent.findUnique({
      where: { providerEventId: input.providerEventId },
      select: {
        id: true,
        status: true,
        updatedAt: true,
      },
    });
    const staleProcessingBefore = new Date(Date.now() - 5 * 60 * 1000);

    if (existing) {
      if (existing.status === 'processed' || existing.status === 'skipped') {
        return {
          claimed: false,
          billingEventId: existing.id,
          state: 'billing-event-already-recorded',
        };
      }

      if (
        existing.status === 'processing' &&
        existing.updatedAt.getTime() > staleProcessingBefore.getTime()
      ) {
        return {
          claimed: false,
          billingEventId: existing.id,
          state: 'billing-event-already-processing',
        };
      }

      const claimed = await this.prisma.billingEvent.update({
        where: { id: existing.id },
        data: {
          status: 'processing',
          decision: null,
          errorCode: null,
          errorMessage: null,
          lastErrorCode: null,
          lastErrorMessage: null,
        },
        select: { id: true },
      });

      return { claimed: true, billingEventId: claimed.id };
    }

    const created = await this.prisma.billingEvent.create({
      data: {
        organizationId: input.organizationId,
        outboxEventId: input.outboxEventId,
        providerEventId: input.providerEventId,
        providerEventType: input.providerEventType,
        providerObjectId: input.providerObjectId,
        externalCustomerId: input.externalCustomerId,
        externalSubscriptionId: input.externalSubscriptionId,
        eventCreatedAt: input.eventCreatedAt,
        rawPayloadJson: toJsonValue(input.rawPayloadJson ?? {}),
      },
      select: { id: true },
    });

    return { claimed: true, billingEventId: created.id };
  }

  async markBillingEventFailed(providerEventId: string, error: unknown) {
    await this.prisma.billingEvent.updateMany({
      where: { providerEventId },
      data: {
        status: 'failed',
        decision: 'processing_error',
        processedAt: new Date(),
        retryCount: { increment: 1 },
        errorCode: error instanceof Error ? error.name : 'billing_sync_error',
        errorMessage: truncateError(error),
        lastErrorCode: error instanceof Error ? error.name : 'billing_sync_error',
        lastErrorMessage: truncateError(error),
      },
    });

    this.logger.error(
      `Billing event ${providerEventId} failed: ${truncateError(error)}`,
    );
  }
}
