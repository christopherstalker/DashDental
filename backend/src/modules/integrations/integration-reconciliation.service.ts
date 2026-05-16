import { randomUUID } from 'node:crypto';
import { Prisma, type IntegrationStatus, type Provider } from '@prisma/client';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma/prisma.service';
import { AuditService } from '@app/modules/audit/audit.service';

const RECONCILIATION_LEASE_KEY = 'runtime.reconciliation.sweep';
const RECONCILIATION_LEASE_TTL_MS = 2 * 60 * 1000;
const DEFAULT_SWEEP_LIMIT = 50;
const LATE_RECEIPT_THRESHOLD_MS = 5 * 60 * 1000;
const BASELINE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000;
const SILENCE_ERROR_PREFIX = 'reconciliation_silence:';
const DEGRADED_HEALTH_SCORE = 34;
const HEALTHY_HEALTH_SCORE = 98;

type MonitoredProvider = 'telegram' | 'whatsapp' | 'instagram' | 'clinic_database';

interface ProviderPolicy {
  silenceThresholdMs: number;
  requiresBaseline: boolean;
  minBaselineReceipts: number;
}

interface IntegrationActivity {
  id: string;
  organizationId: string;
  provider: MonitoredProvider;
  status: IntegrationStatus;
  externalAccountId: string;
  healthScore: number;
  errorState: string | null;
  lastSyncAt: Date | null;
  updatedAt: Date;
  baselineReceipts: number;
  lastReceiptAt: Date | null;
}

const PROVIDER_POLICIES: Record<MonitoredProvider, ProviderPolicy> = {
  telegram: {
    silenceThresholdMs: 24 * 60 * 60 * 1000,
    requiresBaseline: true,
    minBaselineReceipts: 2,
  },
  whatsapp: {
    silenceThresholdMs: 24 * 60 * 60 * 1000,
    requiresBaseline: true,
    minBaselineReceipts: 2,
  },
  instagram: {
    silenceThresholdMs: 24 * 60 * 60 * 1000,
    requiresBaseline: true,
    minBaselineReceipts: 2,
  },
  clinic_database: {
    silenceThresholdMs: 12 * 60 * 60 * 1000,
    requiresBaseline: false,
    minBaselineReceipts: 0,
  },
};

function isMonitoredProvider(provider: Provider): provider is MonitoredProvider {
  return (
    provider === 'telegram' ||
    provider === 'whatsapp' ||
    provider === 'instagram' ||
    provider === 'clinic_database'
  );
}

function minutesSince(from: Date, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 60_000));
}

function formatDurationMinutes(totalMinutes: number): string {
  if (totalMinutes < 60) {
    return `${totalMinutes} minute(s)`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  if (hours < 24) {
    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}m`
      : `${hours} hour(s)`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days} day(s)`;
}

function buildSilenceError(input: {
  provider: MonitoredProvider;
  minutesSinceActivity: number;
  baselineReceipts: number;
}): string {
  return (
    `${SILENCE_ERROR_PREFIX}No inbound provider activity detected for ${input.provider} ` +
    `for ${formatDurationMinutes(input.minutesSinceActivity)}. ` +
    `Historical receipts in the last 7 days: ${input.baselineReceipts}.`
  );
}

function isSilenceError(errorState?: string | null): boolean {
  return Boolean(errorState?.startsWith(SILENCE_ERROR_PREFIX));
}

@Injectable()
export class IntegrationReconciliationService {
  private readonly logger = new Logger(IntegrationReconciliationService.name);
  private readonly leaseOwnerId = `reconcile-${process.pid}-${randomUUID()}`;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getPlatformReconciliationSnapshot() {
    const now = new Date();
    const recentCutoff = new Date(now.getTime() - RECENT_WINDOW_MS);
    const activities = await this.loadIntegrationActivities();
    const [lateReceipts24h, providerGaps] = await Promise.all([
      this.countLateReceipts(recentCutoff),
      this.getProviderGapSnapshot(recentCutoff),
    ]);
    const unresolvedRecentReceipts = await this.prisma.webhookReceipt.count({
      where: {
        organizationId: null,
        receivedAt: { gte: recentCutoff },
        processingStatus: {
          not: 'ignored',
        },
      },
    });
    const evaluations = activities.map((activity) =>
      this.evaluateIntegrationActivity(activity, now),
    );
    const stale = evaluations.filter((evaluation) => evaluation.isSilenceStale);

    return {
      checkedAt: now.toISOString(),
      monitoredIntegrations: activities.length,
      staleIntegrations: stale.length,
      degradedBySilence: stale.filter((evaluation) => evaluation.nextStatus === 'degraded')
        .length,
      lateReceipts24h,
      unresolvedRecentReceipts,
      providerGaps,
      stalePreview: stale
        .sort((left, right) => right.minutesSinceActivity - left.minutesSinceActivity)
        .slice(0, 8)
        .map((evaluation) => ({
          integrationId: evaluation.integrationId,
          organizationId: evaluation.organizationId,
          provider: evaluation.provider,
          status: evaluation.currentStatus,
          minutesSinceActivity: evaluation.minutesSinceActivity,
          silenceThresholdMinutes: evaluation.silenceThresholdMinutes,
          baselineReceipts: evaluation.baselineReceipts,
          errorState: evaluation.errorState,
        })),
    };
  }

  async getTenantReconciliationSnapshot(organizationId: string) {
    const now = new Date();
    const recentCutoff = new Date(now.getTime() - RECENT_WINDOW_MS);
    const activities = (await this.loadIntegrationActivities()).filter(
      (activity) => activity.organizationId === organizationId,
    );
    const evaluations = activities.map((activity) =>
      this.evaluateIntegrationActivity(activity, now),
    );
    const [lateReceipts24h, lateReceiptSamples] = await Promise.all([
      this.countLateReceipts(recentCutoff, organizationId),
      this.getLateReceiptSamples(recentCutoff, organizationId),
    ]);
    const failedReceipts24h = await this.prisma.webhookReceipt.count({
      where: {
        organizationId,
        receivedAt: { gte: recentCutoff },
        processingStatus: {
          in: ['failed', 'dead_letter'],
        },
      },
    });

    return {
      checkedAt: now.toISOString(),
      staleIntegrations: evaluations.filter((evaluation) => evaluation.isSilenceStale).length,
      lateReceipts24h,
      lateReceiptSamples,
      failedReceipts24h,
      integrations: evaluations.map((evaluation) => ({
        integrationId: evaluation.integrationId,
        provider: evaluation.provider,
        currentStatus: evaluation.currentStatus,
        nextStatus: evaluation.nextStatus,
        healthScore: evaluation.healthScore,
        errorState: evaluation.errorState,
        isSilenceStale: evaluation.isSilenceStale,
        minutesSinceActivity: evaluation.minutesSinceActivity,
        silenceThresholdMinutes: evaluation.silenceThresholdMinutes,
        baselineReceipts: evaluation.baselineReceipts,
        lastSyncAt: evaluation.lastSyncAt?.toISOString() ?? null,
        lastReceiptAt: evaluation.lastReceiptAt?.toISOString() ?? null,
      })),
    };
  }

  async runReconciliationSweep(limit = DEFAULT_SWEEP_LIMIT) {
    const lease = await this.acquireLease();
    if (!lease.acquired) {
      return {
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: 0,
        skipped: true,
        reason: 'lease-held',
        leaseOwnerId: lease.ownerId,
        scanned: 0,
        staleDetected: 0,
        degraded: 0,
        restored: 0,
      };
    }

    const startedAt = new Date();

    try {
      const activities = await this.loadIntegrationActivities();
      const evaluations = activities
        .map((activity) => this.evaluateIntegrationActivity(activity, startedAt))
        .filter(
          (evaluation) =>
            evaluation.shouldDegrade ||
            evaluation.shouldRestore,
        )
        .sort((left, right) => right.minutesSinceActivity - left.minutesSinceActivity)
        .slice(0, limit);

      let degraded = 0;
      let restored = 0;

      for (const evaluation of evaluations) {
        if (evaluation.shouldDegrade) {
          await this.prisma.integration.update({
            where: { id: evaluation.integrationId },
            data: {
              status: 'degraded',
              healthScore: DEGRADED_HEALTH_SCORE,
              errorState: evaluation.nextErrorState,
            },
          });
          degraded += 1;
          await this.appendAuditSafely({
            organizationId: evaluation.organizationId,
            actorUserId: 'system',
            action: 'reconciliation_marked_integration_degraded',
            entityType: 'integration',
            entityId: evaluation.integrationId,
            ip: 'system',
            metadataJson: {
              provider: evaluation.provider,
              reason: 'provider_silence',
              minutesSinceActivity: evaluation.minutesSinceActivity,
              baselineReceipts: evaluation.baselineReceipts,
              silenceThresholdMinutes: evaluation.silenceThresholdMinutes,
            },
          });
        } else if (evaluation.shouldRestore) {
          await this.prisma.integration.update({
            where: { id: evaluation.integrationId },
            data: {
              status: 'active',
              healthScore: HEALTHY_HEALTH_SCORE,
              errorState: null,
            },
          });
          restored += 1;
          await this.appendAuditSafely({
            organizationId: evaluation.organizationId,
            actorUserId: 'system',
            action: 'reconciliation_restored_integration_health',
            entityType: 'integration',
            entityId: evaluation.integrationId,
            ip: 'system',
            metadataJson: {
              provider: evaluation.provider,
              reason: 'provider_activity_resumed',
              minutesSinceActivity: evaluation.minutesSinceActivity,
              baselineReceipts: evaluation.baselineReceipts,
              silenceThresholdMinutes: evaluation.silenceThresholdMinutes,
            },
          });
        }
      }

      const completedAt = new Date();
      const summary = {
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        durationMs: completedAt.getTime() - startedAt.getTime(),
        skipped: false,
        leaseOwnerId: this.leaseOwnerId,
        scanned: activities.length,
        staleDetected: evaluations.filter((evaluation) => evaluation.isSilenceStale).length,
        degraded,
        restored,
      };

      if (degraded > 0 || restored > 0) {
        this.logger.warn(
          `Reconciliation sweep changed ${degraded} integration(s) to degraded and restored ${restored} integration(s).`,
        );
      }

      return summary;
    } finally {
      await this.releaseLease();
    }
  }

  private async loadIntegrationActivities(): Promise<IntegrationActivity[]> {
    const baselineStart = new Date(Date.now() - BASELINE_WINDOW_MS);
    const integrations = await this.prisma.integration.findMany({
      where: {
        provider: {
          in: ['telegram', 'whatsapp', 'instagram', 'clinic_database'],
        },
        status: {
          in: ['active', 'degraded'],
        },
      },
      select: {
        id: true,
        organizationId: true,
        provider: true,
        status: true,
        externalAccountId: true,
        healthScore: true,
        errorState: true,
        lastSyncAt: true,
        updatedAt: true,
      },
    });
    const integrationIds = integrations.map((integration) => integration.id);

    const receiptBuckets =
      integrationIds.length > 0
        ? await this.prisma.webhookReceipt.groupBy({
            by: ['integrationId'],
            where: {
              integrationId: { in: integrationIds },
              receivedAt: { gte: baselineStart },
            },
            _count: { _all: true },
            _max: { receivedAt: true },
          })
        : [];

    const receiptMap = new Map(
      receiptBuckets
        .filter((bucket) => bucket.integrationId)
        .map((bucket) => [
          bucket.integrationId as string,
          {
            baselineReceipts: bucket._count._all,
            lastReceiptAt: bucket._max.receivedAt ?? null,
          },
        ]),
    );

    return integrations.flatMap((integration) => {
      if (!isMonitoredProvider(integration.provider)) {
        return [];
      }

      const receiptStats = receiptMap.get(integration.id);
      return [
        {
          id: integration.id,
          organizationId: integration.organizationId,
          provider: integration.provider,
          status: integration.status,
          externalAccountId: integration.externalAccountId,
          healthScore: integration.healthScore,
          errorState: integration.errorState,
          lastSyncAt: integration.lastSyncAt,
          updatedAt: integration.updatedAt,
          baselineReceipts: receiptStats?.baselineReceipts ?? 0,
          lastReceiptAt: receiptStats?.lastReceiptAt ?? null,
        },
      ];
    });
  }

  private evaluateIntegrationActivity(activity: IntegrationActivity, now: Date) {
    const policy = PROVIDER_POLICIES[activity.provider];
    const activityAnchor =
      activity.lastSyncAt ??
      activity.lastReceiptAt ??
      activity.updatedAt;
    const minutesSinceActivity = minutesSince(activityAnchor, now);
    const silenceThresholdMinutes = Math.floor(policy.silenceThresholdMs / 60_000);
    const baselineSatisfied =
      !policy.requiresBaseline ||
      activity.baselineReceipts >= policy.minBaselineReceipts;
    const isSilenceStale =
      baselineSatisfied &&
      now.getTime() - activityAnchor.getTime() > policy.silenceThresholdMs;
    const canRewriteStatus =
      activity.status === 'active' || isSilenceError(activity.errorState);
    const nextErrorState = isSilenceStale
      ? buildSilenceError({
          provider: activity.provider,
          minutesSinceActivity,
          baselineReceipts: activity.baselineReceipts,
        })
      : null;

    return {
      integrationId: activity.id,
      organizationId: activity.organizationId,
      provider: activity.provider,
      currentStatus: activity.status,
      nextStatus: isSilenceStale ? 'degraded' : 'active',
      shouldDegrade: isSilenceStale && activity.status === 'active' && canRewriteStatus,
      shouldRestore:
        !isSilenceStale &&
        activity.status === 'degraded' &&
        isSilenceError(activity.errorState),
      isSilenceStale,
      minutesSinceActivity,
      silenceThresholdMinutes,
      baselineReceipts: activity.baselineReceipts,
      lastSyncAt: activity.lastSyncAt,
      lastReceiptAt: activity.lastReceiptAt,
      healthScore: activity.healthScore,
      errorState: activity.errorState,
      nextErrorState,
    };
  }

  private async countLateReceipts(cutoff: Date, organizationId?: string) {
    const organizationFilter = organizationId
      ? Prisma.sql`AND "organizationId" = ${organizationId}`
      : Prisma.empty;
    const rows = await this.prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM "WebhookReceipt"
      WHERE "occurredAt" IS NOT NULL
        AND "receivedAt" >= ${cutoff}
        ${organizationFilter}
        AND EXTRACT(EPOCH FROM ("receivedAt" - "occurredAt")) * 1000 > ${LATE_RECEIPT_THRESHOLD_MS}
    `);

    return rows[0]?.count ?? 0;
  }

  private async getProviderGapSnapshot(cutoff: Date) {
    const unresolvedBuckets = await this.prisma.webhookReceipt.groupBy({
      by: ['provider', 'providerAccountKey', 'processingStatus'],
      where: {
        organizationId: null,
        receivedAt: { gte: cutoff },
        processingStatus: {
          not: 'ignored',
        },
      },
      _count: { _all: true },
      _max: { receivedAt: true },
    });

    const unresolvedMap = new Map<
      string,
      {
        provider: string;
        providerAccountKey: string;
        receipts: number;
        latestReceivedAt: Date | null;
        statuses: Record<string, number>;
      }
    >();

    for (const bucket of unresolvedBuckets) {
      const accountKey = bucket.providerAccountKey || '(empty-account-key)';
      const key = `${bucket.provider}:${accountKey}`;
      const current = unresolvedMap.get(key) ?? {
        provider: bucket.provider,
        providerAccountKey: accountKey,
        receipts: 0,
        latestReceivedAt: null,
        statuses: {},
      };
      current.receipts += bucket._count._all;
      current.statuses[bucket.processingStatus] =
        (current.statuses[bucket.processingStatus] ?? 0) + bucket._count._all;
      if (
        bucket._max.receivedAt &&
        (!current.latestReceivedAt ||
          bucket._max.receivedAt.getTime() > current.latestReceivedAt.getTime())
      ) {
        current.latestReceivedAt = bucket._max.receivedAt;
      }
      unresolvedMap.set(key, current);
    }

    const lateByProvider = await this.countLateReceiptsByProvider(cutoff);

    return {
      unresolvedByProviderAccount: [...unresolvedMap.values()]
        .sort((left, right) => {
          const latestSort =
            (right.latestReceivedAt?.getTime() ?? 0) -
            (left.latestReceivedAt?.getTime() ?? 0);
          return latestSort || right.receipts - left.receipts;
        })
        .slice(0, 12)
        .map((bucket) => ({
          provider: bucket.provider,
          providerAccountKey: bucket.providerAccountKey,
          receipts: bucket.receipts,
          latestReceivedAt: bucket.latestReceivedAt?.toISOString() ?? null,
          statuses: bucket.statuses,
          suspectedReason: this.describeUnresolvedProviderGap(
            bucket.provider,
            bucket.providerAccountKey,
          ),
        })),
      lateByProvider,
    };
  }

  private async countLateReceiptsByProvider(cutoff: Date) {
    const rows = await this.prisma.$queryRaw<
      Array<{
        provider: string;
        channelProvider: string | null;
        receipts: number;
        maxDelayMinutes: number;
        latestReceivedAt: Date | null;
      }>
    >(Prisma.sql`
      SELECT
        "provider"::text AS provider,
        "channelProvider"::text AS "channelProvider",
        COUNT(*)::int AS receipts,
        FLOOR(MAX(EXTRACT(EPOCH FROM ("receivedAt" - "occurredAt"))) / 60)::int AS "maxDelayMinutes",
        MAX("receivedAt") AS "latestReceivedAt"
      FROM "WebhookReceipt"
      WHERE "occurredAt" IS NOT NULL
        AND "receivedAt" >= ${cutoff}
        AND EXTRACT(EPOCH FROM ("receivedAt" - "occurredAt")) * 1000 > ${LATE_RECEIPT_THRESHOLD_MS}
      GROUP BY "provider", "channelProvider"
      ORDER BY receipts DESC, "latestReceivedAt" DESC
      LIMIT 12
    `);

    return rows.map((row) => ({
      provider: row.provider,
      channelProvider: row.channelProvider,
      receipts: row.receipts,
      maxDelayMinutes: row.maxDelayMinutes,
      latestReceivedAt: row.latestReceivedAt?.toISOString() ?? null,
    }));
  }

  private async getLateReceiptSamples(cutoff: Date, organizationId: string) {
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        provider: string;
        channelProvider: string | null;
        externalEventId: string;
        receivedAt: Date;
        occurredAt: Date;
        delayMinutes: number;
        processingStatus: string;
      }>
    >(Prisma.sql`
      SELECT
        "id",
        "provider"::text AS provider,
        "channelProvider"::text AS "channelProvider",
        "externalEventId",
        "receivedAt",
        "occurredAt",
        FLOOR(EXTRACT(EPOCH FROM ("receivedAt" - "occurredAt")) / 60)::int AS "delayMinutes",
        "processingStatus"::text AS "processingStatus"
      FROM "WebhookReceipt"
      WHERE "organizationId" = ${organizationId}
        AND "occurredAt" IS NOT NULL
        AND "receivedAt" >= ${cutoff}
        AND EXTRACT(EPOCH FROM ("receivedAt" - "occurredAt")) * 1000 > ${LATE_RECEIPT_THRESHOLD_MS}
      ORDER BY "receivedAt" DESC
      LIMIT 8
    `);

    return rows.map((row) => ({
      id: row.id,
      provider: row.provider,
      channelProvider: row.channelProvider,
      externalEventId: row.externalEventId,
      receivedAt: row.receivedAt.toISOString(),
      occurredAt: row.occurredAt.toISOString(),
      delayMinutes: row.delayMinutes,
      processingStatus: row.processingStatus,
    }));
  }

  private describeUnresolvedProviderGap(provider: string, providerAccountKey: string) {
    if (provider === 'telegram') {
      return providerAccountKey === '(empty-account-key)'
        ? 'missing_telegram_secret_header'
        : 'telegram_secret_not_mapped_to_integration';
    }

    if (provider === 'meta') {
      return providerAccountKey === '(empty-account-key)'
        ? 'meta_account_not_resolved_from_payload'
        : 'meta_account_not_mapped_to_whatsapp_or_instagram';
    }

    if (provider === 'stripe') {
      return 'stripe_event_missing_organization_metadata';
    }

    return 'tenant_or_integration_not_resolved';
  }

  private async acquireLease() {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + RECONCILIATION_LEASE_TTL_MS);

    await this.prisma.runtimeLease.upsert({
      where: {
        key: RECONCILIATION_LEASE_KEY,
      },
      update: {},
      create: {
        key: RECONCILIATION_LEASE_KEY,
        ownerId: '',
        expiresAt: new Date(0),
      },
    });

    const claimed = await this.prisma.runtimeLease.updateMany({
      where: {
        key: RECONCILIATION_LEASE_KEY,
        OR: [
          {
            expiresAt: {
              lte: now,
            },
          },
          {
            ownerId: this.leaseOwnerId,
          },
        ],
      },
      data: {
        ownerId: this.leaseOwnerId,
        expiresAt,
      },
    });

    if (claimed.count > 0) {
      return {
        acquired: true as const,
        ownerId: this.leaseOwnerId,
      };
    }

    const existing = await this.prisma.runtimeLease.findUnique({
      where: {
        key: RECONCILIATION_LEASE_KEY,
      },
      select: {
        ownerId: true,
        expiresAt: true,
      },
    });

    return {
      acquired: false as const,
      ownerId: existing?.ownerId ?? null,
      expiresAt: existing?.expiresAt?.toISOString() ?? null,
    };
  }

  private async releaseLease() {
    await this.prisma.runtimeLease.updateMany({
      where: {
        key: RECONCILIATION_LEASE_KEY,
        ownerId: this.leaseOwnerId,
      },
      data: {
        expiresAt: new Date(0),
      },
    });
  }

  private async appendAuditSafely(input: Parameters<AuditService['append']>[0]) {
    try {
      await this.auditService.append(input);
    } catch (error) {
      this.logger.warn(
        `Audit append failed for ${input.action} on ${input.entityType}:${input.entityId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
