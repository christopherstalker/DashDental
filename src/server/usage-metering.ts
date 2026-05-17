import {
  getCurrentCalendarMonthPeriod,
  getPlanLimits,
} from "@/domain/business-rules";
import type { AppState, UsageEvent } from "@/domain/types";
import { isPrismaStorageEnabled } from "./data-store";
import { captureError, structuredLog } from "./observability";
import { prisma } from "./prisma";
import { Prisma } from "@/generated/prisma";

export type UsageMetric = "messages" | "aiRuns" | "users" | "integrations";

interface UsageEventInput {
  organizationId: string;
  metric: UsageMetric;
  quantity?: number;
  sourceEntityType: string;
  sourceEntityId: string;
  occurredAt?: string;
  metadataJson?: Record<string, unknown>;
}

function createRuntimeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

export function buildUsageIdempotencyKey(input: {
  organizationId: string;
  metric: UsageMetric;
  sourceEntityType: string;
  sourceEntityId: string;
}): string {
  return [
    input.organizationId,
    input.metric,
    input.sourceEntityType,
    input.sourceEntityId,
  ].join(":");
}

function metricSnapshotKey(metric: UsageMetric): keyof AppState["usageLimits"][number]["periodUsageJson"] {
  return metric;
}

export function buildUsagePeriod(occurredAt = new Date().toISOString()) {
  return getCurrentCalendarMonthPeriod(occurredAt);
}

export function recordUsageEventInState(
  state: AppState,
  input: UsageEventInput,
): { state: AppState; created: boolean; event: UsageEvent } {
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const period = buildUsagePeriod(occurredAt);
  const quantity = Math.max(0, Math.trunc(input.quantity ?? 1));
  const idempotencyKey = buildUsageIdempotencyKey({
    organizationId: input.organizationId,
    metric: input.metric,
    sourceEntityType: input.sourceEntityType,
    sourceEntityId: input.sourceEntityId,
  });
  const existing = state.usageEvents.find(
    (event) => event.idempotencyKey === idempotencyKey,
  );

  if (existing) {
    return { state, created: false, event: existing };
  }

  const event: UsageEvent = {
    id: createRuntimeId("usage-event"),
    organizationId: input.organizationId,
    idempotencyKey,
    metric: input.metric,
    quantity,
    sourceEntityType: input.sourceEntityType,
    sourceEntityId: input.sourceEntityId,
    periodStart: period.startIso,
    periodEnd: period.endIso,
    occurredAt,
    metadataJson: input.metadataJson,
    createdAt: new Date().toISOString(),
  };
  const snapshotKey = metricSnapshotKey(input.metric);
  const existingUsage = state.usageLimits.find(
    (usage) => usage.organizationId === input.organizationId,
  );
  const fallbackPlan =
    state.subscriptions.find((subscription) => subscription.organizationId === input.organizationId)
      ?.plan ?? "growth";
  const fallbackLimits = getPlanLimits(fallbackPlan);
  const nextUsageLimits = existingUsage
    ? state.usageLimits.map((usage) =>
        usage.organizationId === input.organizationId
          ? {
              ...usage,
              periodUsageJson: {
                ...usage.periodUsageJson,
                [snapshotKey]: usage.periodUsageJson[snapshotKey] + quantity,
              },
            }
          : usage,
      )
    : [
        ...state.usageLimits,
        {
          id: `usage-${input.organizationId}`,
          organizationId: input.organizationId,
          ...fallbackLimits,
          periodUsageJson: {
            users: input.metric === "users" ? quantity : 0,
            integrations: input.metric === "integrations" ? quantity : 0,
            messages: input.metric === "messages" ? quantity : 0,
            aiRuns: input.metric === "aiRuns" ? quantity : 0,
          },
        },
      ];

  return {
    created: true,
    event,
    state: {
      ...state,
      usageEvents: [event, ...state.usageEvents],
      usageLimits: nextUsageLimits,
    },
  };
}

export async function recordUsageEvent(
  input: UsageEventInput,
): Promise<{ created: boolean; idempotencyKey: string }> {
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const period = buildUsagePeriod(occurredAt);
  const quantity = Math.max(0, Math.trunc(input.quantity ?? 1));
  const idempotencyKey = buildUsageIdempotencyKey({
    organizationId: input.organizationId,
    metric: input.metric,
    sourceEntityType: input.sourceEntityType,
    sourceEntityId: input.sourceEntityId,
  });

  if (!isPrismaStorageEnabled()) {
    return { created: false, idempotencyKey };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
    const created = await tx.usageEvent.createMany({
      data: [
        {
          organizationId: input.organizationId,
          idempotencyKey,
          metric: input.metric,
          quantity,
          sourceEntityType: input.sourceEntityType,
          sourceEntityId: input.sourceEntityId,
          periodStart: new Date(period.startIso),
          periodEnd: new Date(period.endIso),
          occurredAt: new Date(occurredAt),
          metadataJson: input.metadataJson
            ? toJsonValue(input.metadataJson)
            : Prisma.JsonNull,
        },
      ],
      skipDuplicates: true,
    });

    if (created.count === 0) {
      return false;
    }

    await tx.usageRollup.upsert({
      where: {
        organizationId_metric_periodStart: {
          organizationId: input.organizationId,
          metric: input.metric,
          periodStart: new Date(period.startIso),
        },
      },
      create: {
        organizationId: input.organizationId,
        metric: input.metric,
        periodStart: new Date(period.startIso),
        periodEnd: new Date(period.endIso),
        quantity,
        lastEventAt: new Date(occurredAt),
      },
      update: {
        quantity: { increment: quantity },
        periodEnd: new Date(period.endIso),
        lastEventAt: new Date(occurredAt),
      },
    });

    const usage = await tx.usageLimit.findUnique({
      where: { organizationId: input.organizationId },
    });
    if (usage) {
      const snapshot = (usage.periodUsageJson ?? {}) as Record<string, unknown>;
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

    structuredLog("info", result ? "usage.event.recorded" : "usage.event.duplicate", {
      organizationId: input.organizationId,
      metric: input.metric,
      quantity,
      sourceEntityType: input.sourceEntityType,
      sourceEntityId: input.sourceEntityId,
      idempotencyKey,
    });

    return { created: result, idempotencyKey };
  } catch (error) {
    captureError(error, {
      event: "usage.event.failed",
      organizationId: input.organizationId,
      metric: input.metric,
      sourceEntityType: input.sourceEntityType,
      sourceEntityId: input.sourceEntityId,
      idempotencyKey,
    });
    throw error;
  }
}
