import { isPrismaStorageEnabled } from "./data-store";
import { structuredLog } from "./observability";
import { prisma } from "./prisma";

type WebhookRecord = {
  id: string;
  processingStatus: string;
  receivedAt: Date;
  retryCount: number;
};

type OutboxRecord = {
  id: string;
  status: string;
  availableAt: Date;
  attemptCount: number;
};

type BillingRecord = {
  id: string;
  status: string;
  updatedAt: Date;
  retryCount: number;
};

export function detectStuckRuntimeRecords(
  input: {
    webhookReceipts: WebhookRecord[];
    outboxEvents: OutboxRecord[];
    billingEvents: BillingRecord[];
  },
  options: { now?: Date; stuckAfterMs?: number } = {},
) {
  const now = options.now ?? new Date();
  const stuckAfterMs = options.stuckAfterMs ?? 10 * 60 * 1000;
  const isOld = (date: Date) => now.getTime() - date.getTime() >= stuckAfterMs;

  return {
    checkedAt: now.toISOString(),
    stuckWebhookReceipts: input.webhookReceipts.filter(
      (receipt) =>
        ["received", "processing", "failed"].includes(receipt.processingStatus) &&
        isOld(receipt.receivedAt),
    ),
    retryableOutboxEvents: input.outboxEvents.filter(
      (event) =>
        event.attemptCount < 8 &&
        (event.status === "failed" ||
          (["pending", "dispatching"].includes(event.status) && isOld(event.availableAt))),
    ),
    failedBillingEvents: input.billingEvents.filter(
      (event) =>
        event.retryCount < 8 &&
        (event.status === "failed" ||
          (event.status === "processing" && isOld(event.updatedAt))),
    ),
  };
}

export async function getRuntimeReconciliationSummary(input?: {
  organizationId?: string;
  stuckAfterMs?: number;
}) {
  if (!isPrismaStorageEnabled()) {
    return detectStuckRuntimeRecords({
      webhookReceipts: [],
      outboxEvents: [],
      billingEvents: [],
    });
  }

  const organizationWhere = input?.organizationId
    ? { organizationId: input.organizationId }
    : {};
  const [webhookReceipts, outboxEvents, billingEvents] = await Promise.all([
    prisma.webhookReceipt.findMany({
      where: organizationWhere,
      select: {
        id: true,
        processingStatus: true,
        receivedAt: true,
        retryCount: true,
      },
    }),
    prisma.outboxEvent.findMany({
      where: organizationWhere,
      select: {
        id: true,
        status: true,
        availableAt: true,
        attemptCount: true,
      },
    }),
    prisma.billingEvent.findMany({
      where: organizationWhere,
      select: {
        id: true,
        status: true,
        updatedAt: true,
        retryCount: true,
      },
    }),
  ]);

  return detectStuckRuntimeRecords(
    { webhookReceipts, outboxEvents, billingEvents },
    { stuckAfterMs: input?.stuckAfterMs },
  );
}

export async function runRuntimeReconciliation(input?: {
  dryRun?: boolean;
  organizationId?: string;
  stuckAfterMs?: number;
}) {
  const dryRun = input?.dryRun ?? true;
  const runtime = await getRuntimeReconciliationSummary(input);

  if (!isPrismaStorageEnabled()) {
    const summary = {
      dryRun,
      runtime,
      usageRollupsChecked: 0,
      stripeSubscriptionReconciliation: "placeholder_not_connected",
    };
    structuredLog("info", "runtime.reconciliation.completed", summary);
    return summary;
  }

  const usageRollups = await prisma.usageEvent.groupBy({
    by: ["organizationId", "metric", "periodStart"],
    where: input?.organizationId ? { organizationId: input.organizationId } : {},
    _sum: { quantity: true },
    _max: {
      periodEnd: true,
      occurredAt: true,
    },
  });

  if (!dryRun) {
    for (const rollup of usageRollups) {
      await prisma.usageRollup.upsert({
        where: {
          organizationId_metric_periodStart: {
            organizationId: rollup.organizationId,
            metric: rollup.metric,
            periodStart: rollup.periodStart,
          },
        },
        create: {
          organizationId: rollup.organizationId,
          metric: rollup.metric,
          periodStart: rollup.periodStart,
          periodEnd: rollup._max.periodEnd ?? rollup.periodStart,
          quantity: rollup._sum.quantity ?? 0,
          lastEventAt: rollup._max.occurredAt,
        },
        update: {
          periodEnd: rollup._max.periodEnd ?? rollup.periodStart,
          quantity: rollup._sum.quantity ?? 0,
          lastEventAt: rollup._max.occurredAt,
        },
      });
    }
  }

  const summary = {
    dryRun,
    runtime,
    usageRollupsChecked: usageRollups.length,
    stripeSubscriptionReconciliation: "placeholder_not_connected",
  };
  structuredLog("info", "runtime.reconciliation.completed", {
    ...summary,
    stuckWebhookReceiptCount: runtime.stuckWebhookReceipts.length,
    retryableOutboxEventCount: runtime.retryableOutboxEvents.length,
    failedBillingEventCount: runtime.failedBillingEvents.length,
  });

  return summary;
}
