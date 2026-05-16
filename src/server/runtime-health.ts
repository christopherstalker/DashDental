import { isPrismaStorageEnabled } from "./data-store";
import { isProductionRuntime } from "./feature-flags";
import { prisma } from "./prisma";

type DependencyInput = {
  productionRuntime: boolean;
  storage: { ok: boolean; status: string; latencyMs?: number };
  queue: { configured: boolean; required: boolean; latencyMs?: number };
  stripe: { configured: boolean; provider?: string; required: boolean };
  metrics?: {
    outboxFailed?: number;
    webhookFailed?: number;
    billingFailed?: number;
    entitlementDenials?: number;
    usageIngestionFailures?: number;
  };
};

function dependencyStatus(ok: boolean, degraded = false) {
  return ok ? (degraded ? "degraded" : "ok") : "unhealthy";
}

export function summarizeRuntimeHealth(input: DependencyInput) {
  const queueOk = input.queue.configured || !input.queue.required;
  const stripeDegraded = input.stripe.required && !input.stripe.configured;
  const metrics = {
    outboxFailed: input.metrics?.outboxFailed ?? 0,
    webhookFailed: input.metrics?.webhookFailed ?? 0,
    billingFailed: input.metrics?.billingFailed ?? 0,
    entitlementDenials: input.metrics?.entitlementDenials ?? 0,
    usageIngestionFailures: input.metrics?.usageIngestionFailures ?? 0,
  };
  const dependencyUnhealthy = !input.storage.ok || !queueOk;
  const signalDegraded =
    metrics.outboxFailed > 0 ||
    metrics.webhookFailed > 0 ||
    metrics.billingFailed > 0 ||
    metrics.usageIngestionFailures > 0 ||
    stripeDegraded;

  return {
    status: dependencyUnhealthy ? "unhealthy" : signalDegraded ? "degraded" : "ok",
    app: { status: "ok" },
    dependencies: {
      storage: {
        status: dependencyStatus(input.storage.ok),
        detail: input.storage.status,
        latencyMs: input.storage.latencyMs,
      },
      queue: {
        status: dependencyStatus(queueOk),
        configured: input.queue.configured,
        required: input.queue.required,
        latencyMs: input.queue.latencyMs,
      },
      stripe: {
        status: input.stripe.required
          ? stripeDegraded
            ? "degraded"
            : "ok"
          : "not_required",
        configured: input.stripe.configured,
        provider: input.stripe.provider,
        required: input.stripe.required,
      },
    },
    signals: metrics,
    productionRuntime: input.productionRuntime,
  };
}

export async function collectRuntimeMetrics() {
  if (!isPrismaStorageEnabled()) {
    return {
      outboxFailed: 0,
      webhookFailed: 0,
      billingFailed: 0,
      entitlementDenials: 0,
      usageIngestionFailures: 0,
    };
  }

  const since = new Date(Date.now() - 60 * 60 * 1000);
  const [outboxFailed, webhookFailed, billingFailed, entitlementDenials] =
    await Promise.all([
      prisma.outboxEvent.count({
        where: { status: { in: ["failed", "dead_letter"] }, updatedAt: { gte: since } },
      }),
      prisma.webhookReceipt.count({
        where: {
          processingStatus: { in: ["failed", "dead_letter"] },
          lastProcessedAt: { gte: since },
        },
      }),
      prisma.billingEvent.count({
        where: { status: "failed", updatedAt: { gte: since } },
      }),
      prisma.auditLog.count({
        where: {
          action: "entitlement.denied",
          createdAt: { gte: since },
        },
      }),
    ]);

  return {
    outboxFailed,
    webhookFailed,
    billingFailed,
    entitlementDenials,
    usageIngestionFailures: 0,
  };
}

export function getQueueHealthInput() {
  return {
    configured: Boolean(process.env.REDIS_URL?.trim()),
    required: isProductionRuntime(),
  };
}
