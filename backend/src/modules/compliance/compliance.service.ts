import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@app/infra/prisma/prisma.service';

const DEFAULT_OPERATIONAL_RETENTION_DAYS = 180;
const DEFAULT_BILLING_RETENTION_DAYS = 730;
const DEFAULT_REPLAY_RETENTION_DAYS = 365;
const DEFAULT_INTEGRATION_EVENT_RETENTION_DAYS = 365;

function readRetentionDays(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function truncateError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.length > 500 ? `${message.slice(0, 497)}...` : message;
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async approveClinicDbContract(input: {
    organizationId: string;
    actorUserId: string;
    approvedByName: string;
    approvedByEmail: string;
  }) {
    return input;
  }

  async exportOrganizationAuditBundle(organizationId: string) {
    const [
      organization,
      contracts,
      auditLogs,
      integrationEvents,
      billingEvents,
      replayAttempts,
      lifecycleRuns,
    ] = await Promise.all([
      this.prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
          id: true,
          name: true,
          timezone: true,
          currency: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.dataAccessContract.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      }),
      this.prisma.integrationEvent.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      }),
      this.prisma.billingEvent.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      this.prisma.replayAttempt.findMany({
        where: { organizationId },
        orderBy: { startedAt: 'desc' },
        take: 500,
      }),
      this.prisma.dataLifecycleRun.findMany({
        where: { organizationId },
        orderBy: { startedAt: 'desc' },
        take: 100,
      }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      organization,
      contracts,
      auditLogs,
      integrationEvents,
      billingEvents,
      replayAttempts,
      lifecycleRuns,
    };
  }

  async getDataLifecycleSnapshot(organizationId?: string) {
    const policies = this.getRetentionPolicies();
    const whereOrganization = organizationId ? { organizationId } : {};
    const [
      purgeableOutboxEvents,
      purgeableWebhookReceipts,
      purgeableBillingEvents,
      purgeableReplayAttempts,
      purgeableIntegrationEvents,
      latestRuns,
    ] = await Promise.all([
      this.prisma.outboxEvent.count({
        where: {
          ...whereOrganization,
          status: 'dispatched',
          dispatchedAt: { lt: policies.operationalCutoff },
        },
      }),
      this.prisma.webhookReceipt.count({
        where: {
          ...whereOrganization,
          processingStatus: { in: ['processed', 'ignored'] },
          receivedAt: { lt: policies.operationalCutoff },
          outboxEvents: { none: {} },
        },
      }),
      this.prisma.billingEvent.count({
        where: {
          ...whereOrganization,
          status: { in: ['processed', 'skipped'] },
          processedAt: { lt: policies.billingCutoff },
        },
      }),
      this.prisma.replayAttempt.count({
        where: {
          ...whereOrganization,
          status: { in: ['completed', 'skipped'] },
          completedAt: { lt: policies.replayCutoff },
        },
      }),
      this.prisma.integrationEvent.count({
        where: {
          ...whereOrganization,
          processedAt: { lt: policies.integrationEventCutoff },
        },
      }),
      this.prisma.dataLifecycleRun.findMany({
        where: whereOrganization,
        orderBy: { startedAt: 'desc' },
        take: 5,
      }),
    ]);

    return {
      checkedAt: new Date().toISOString(),
      organizationId: organizationId ?? null,
      policies: {
        operationalRetentionDays: policies.operationalRetentionDays,
        billingRetentionDays: policies.billingRetentionDays,
        replayRetentionDays: policies.replayRetentionDays,
        integrationEventRetentionDays: policies.integrationEventRetentionDays,
      },
      purgeable: {
        outboxEvents: purgeableOutboxEvents,
        webhookReceipts: purgeableWebhookReceipts,
        billingEvents: purgeableBillingEvents,
        replayAttempts: purgeableReplayAttempts,
        integrationEvents: purgeableIntegrationEvents,
        total:
          purgeableOutboxEvents +
          purgeableWebhookReceipts +
          purgeableBillingEvents +
          purgeableReplayAttempts +
          purgeableIntegrationEvents,
      },
      latestRuns: latestRuns.map((run) => ({
        id: run.id,
        organizationId: run.organizationId,
        dryRun: run.dryRun,
        source: run.source,
        status: run.status,
        startedAt: run.startedAt.toISOString(),
        completedAt: run.completedAt?.toISOString() ?? null,
        durationMs: run.durationMs,
        errorMessage: run.errorMessage,
        resultJson: run.resultJson,
      })),
    };
  }

  async runDataLifecycleSweep(input?: {
    organizationId?: string;
    dryRun?: boolean;
    source?: string;
  }) {
    const startedAt = new Date();
    const dryRun = input?.dryRun ?? true;
    const run = await this.prisma.dataLifecycleRun.create({
      data: {
        organizationId: input?.organizationId,
        dryRun,
        source: input?.source ?? 'manual',
        status: 'completed',
      },
      select: { id: true },
    });

    try {
      const snapshot = await this.getDataLifecycleSnapshot(input?.organizationId);
      const deleted = dryRun
        ? {
            outboxEvents: 0,
            webhookReceipts: 0,
            billingEvents: 0,
            replayAttempts: 0,
            integrationEvents: 0,
          }
        : await this.deletePurgeableOperationalData(input?.organizationId);
      const completedAt = new Date();
      const result = {
        runId: run.id,
        dryRun,
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        durationMs: completedAt.getTime() - startedAt.getTime(),
        before: snapshot.purgeable,
        deleted,
      };

      await this.prisma.dataLifecycleRun.update({
        where: { id: run.id },
        data: {
          status: 'completed',
          completedAt,
          durationMs: result.durationMs,
          resultJson: toJsonValue(result),
        },
      });

      if (!dryRun && Object.values(deleted).some((value) => value > 0)) {
        this.logger.warn(
          `Data lifecycle sweep deleted ${Object.values(deleted).reduce(
            (total, value) => total + value,
            0,
          )} operational record(s).`,
        );
      }

      return result;
    } catch (error) {
      const completedAt = new Date();
      await this.prisma.dataLifecycleRun.update({
        where: { id: run.id },
        data: {
          status: 'failed',
          completedAt,
          durationMs: completedAt.getTime() - startedAt.getTime(),
          errorCode: error instanceof Error ? error.name : 'data_lifecycle_error',
          errorMessage: truncateError(error),
        },
      });

      throw error;
    }
  }

  private getRetentionPolicies() {
    const operationalRetentionDays = readRetentionDays(
      'OPERATIONAL_EVENT_RETENTION_DAYS',
      DEFAULT_OPERATIONAL_RETENTION_DAYS,
    );
    const billingRetentionDays = readRetentionDays(
      'BILLING_EVENT_RETENTION_DAYS',
      DEFAULT_BILLING_RETENTION_DAYS,
    );
    const replayRetentionDays = readRetentionDays(
      'REPLAY_ATTEMPT_RETENTION_DAYS',
      DEFAULT_REPLAY_RETENTION_DAYS,
    );
    const integrationEventRetentionDays = readRetentionDays(
      'INTEGRATION_EVENT_RETENTION_DAYS',
      DEFAULT_INTEGRATION_EVENT_RETENTION_DAYS,
    );

    return {
      operationalRetentionDays,
      billingRetentionDays,
      replayRetentionDays,
      integrationEventRetentionDays,
      operationalCutoff: daysAgo(operationalRetentionDays),
      billingCutoff: daysAgo(billingRetentionDays),
      replayCutoff: daysAgo(replayRetentionDays),
      integrationEventCutoff: daysAgo(integrationEventRetentionDays),
    };
  }

  private async deletePurgeableOperationalData(organizationId?: string) {
    const policies = this.getRetentionPolicies();
    const whereOrganization = organizationId ? { organizationId } : {};

    return this.prisma.$transaction(async (tx) => {
      const outboxEvents = await tx.outboxEvent.deleteMany({
        where: {
          ...whereOrganization,
          status: 'dispatched',
          dispatchedAt: { lt: policies.operationalCutoff },
        },
      });
      const webhookReceipts = await tx.webhookReceipt.deleteMany({
        where: {
          ...whereOrganization,
          processingStatus: { in: ['processed', 'ignored'] },
          receivedAt: { lt: policies.operationalCutoff },
          outboxEvents: { none: {} },
        },
      });
      const billingEvents = await tx.billingEvent.deleteMany({
        where: {
          ...whereOrganization,
          status: { in: ['processed', 'skipped'] },
          processedAt: { lt: policies.billingCutoff },
        },
      });
      const replayAttempts = await tx.replayAttempt.deleteMany({
        where: {
          ...whereOrganization,
          status: { in: ['completed', 'skipped'] },
          completedAt: { lt: policies.replayCutoff },
        },
      });
      const integrationEvents = await tx.integrationEvent.deleteMany({
        where: {
          ...whereOrganization,
          processedAt: { lt: policies.integrationEventCutoff },
        },
      });

      return {
        outboxEvents: outboxEvents.count,
        webhookReceipts: webhookReceipts.count,
        billingEvents: billingEvents.count,
        replayAttempts: replayAttempts.count,
        integrationEvents: integrationEvents.count,
      };
    });
  }
}
