import { Injectable, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@app/infra/prisma/prisma.service';

type UsageMetric = 'users' | 'integrations' | 'messages' | 'aiRuns';

function periodFor(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));

  return { start, end };
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

function idempotencyKey(input: {
  organizationId: string;
  metric: UsageMetric;
  sourceEntityType: string;
  sourceEntityId: string;
}) {
  return [
    input.organizationId,
    input.metric,
    input.sourceEntityType,
    input.sourceEntityId,
  ].join(':');
}

@Injectable()
export class UsageService {
  constructor(private readonly prisma: PrismaService) {}

  async assertPlanAllowsAction(input: {
    organizationId: string;
    metric: UsageMetric;
  }) {
    const [subscription, usage] = await Promise.all([
      this.prisma.subscription.findFirst({
        where: { organizationId: input.organizationId },
        orderBy: { currentPeriodEnd: 'desc' },
      }),
      this.prisma.usageLimit.findUnique({
        where: { organizationId: input.organizationId },
      }),
    ]);
    const now = Date.now();
    const periodCurrent =
      subscription &&
      subscription.currentPeriodStart.getTime() <= now &&
      now < subscription.currentPeriodEnd.getTime();
    const paidActionsAllowed =
      periodCurrent &&
      (subscription.status === 'active' || subscription.status === 'trialing');

    if (!paidActionsAllowed) {
      throw new ForbiddenException('Billing status is read-only for this action.');
    }
    if (!usage) {
      throw new ForbiddenException('Usage limits are not configured.');
    }

    const snapshot = usage.periodUsageJson as {
      users?: number;
      integrations?: number;
      messages?: number;
      aiRuns?: number;
    };
    const limits = {
      users: usage.maxUsers,
      integrations: usage.maxIntegrations,
      messages: usage.monthlyMessages,
      aiRuns: usage.monthlyAiRuns,
    };

    if ((snapshot[input.metric] ?? 0) >= limits[input.metric]) {
      throw new ForbiddenException('Plan usage limit reached.');
    }

    return {
      organizationId: input.organizationId,
      metric: input.metric,
      current: snapshot[input.metric] ?? 0,
      limit: limits[input.metric],
    };
  }

  async incrementCounter(input: {
    organizationId: string;
    metric: UsageMetric;
    delta?: number;
    sourceEntityType?: string;
    sourceEntityId?: string;
    metadataJson?: Record<string, unknown>;
  }) {
    const quantity = Math.max(0, Math.trunc(input.delta ?? 1));
    const occurredAt = new Date();
    const period = periodFor(occurredAt);
    const sourceEntityType = input.sourceEntityType ?? 'usage_counter';
    const sourceEntityId =
      input.sourceEntityId ??
      `${input.metric}:${occurredAt.toISOString()}:${quantity}`;
    const key = idempotencyKey({
      organizationId: input.organizationId,
      metric: input.metric,
      sourceEntityType,
      sourceEntityId,
    });

    const created = await this.prisma.$transaction(async (tx) => {
      const usageEvent = await tx.usageEvent.createMany({
        data: [
          {
            organizationId: input.organizationId,
            idempotencyKey: key,
            metric: input.metric,
            quantity,
            sourceEntityType,
            sourceEntityId,
            periodStart: period.start,
            periodEnd: period.end,
            occurredAt,
            metadataJson: input.metadataJson
              ? toJsonValue(input.metadataJson)
              : Prisma.JsonNull,
          },
        ],
        skipDuplicates: true,
      });

      if (usageEvent.count === 0) {
        return false;
      }

      await tx.usageRollup.upsert({
        where: {
          organizationId_metric_periodStart: {
            organizationId: input.organizationId,
            metric: input.metric,
            periodStart: period.start,
          },
        },
        create: {
          organizationId: input.organizationId,
          metric: input.metric,
          periodStart: period.start,
          periodEnd: period.end,
          quantity,
          lastEventAt: occurredAt,
        },
        update: {
          quantity: { increment: quantity },
          periodEnd: period.end,
          lastEventAt: occurredAt,
        },
      });

      const usage = await tx.usageLimit.findUnique({
        where: { organizationId: input.organizationId },
      });
      if (usage) {
        const snapshot = usage.periodUsageJson as Record<string, unknown>;
        const current = Number(snapshot[input.metric] ?? 0);
        await tx.usageLimit.update({
          where: { organizationId: input.organizationId },
          data: {
            periodUsageJson: toJsonValue({
              ...snapshot,
              [input.metric]: current + quantity,
            }),
          },
        });
      }

      return true;
    });

    return { organizationId: input.organizationId, metric: input.metric, created };
  }
}
