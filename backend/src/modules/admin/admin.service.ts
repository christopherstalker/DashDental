import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type {
  OutboxStatus,
  Prisma,
  Provider,
  ReceiptProcessingStatus,
  SignatureStatus,
  WebhookProvider,
} from '@prisma/client';
import { QueueHealthService } from '@app/infra/queue/queue-health.service';
import { PrismaService } from '@app/infra/prisma/prisma.service';
import { AuditService } from '@app/modules/audit/audit.service';
import { BillingService } from '@app/modules/billing/billing.service';
import { ComplianceService } from '@app/modules/compliance/compliance.service';
import { IntegrationReconciliationService } from '@app/modules/integrations/integration-reconciliation.service';
import { ProjectionsService } from '@app/modules/projections/projections.service';
import { WebhookRecoveryService } from '@app/modules/webhooks/webhook-recovery.service';
import { WebhooksService } from '@app/modules/webhooks/webhooks.service';
import { AdminFailureDrillsService } from './admin-failure-drills.service';

const RECEIPT_FAILURE_STATES = ['failed', 'dead_letter'] as const;
const OUTBOX_FAILURE_STATES = ['failed', 'dead_letter'] as const;
const DEFAULT_TIMELINE_LIMIT = 20;

export type RuntimeAlertSeverity = 'critical' | 'warning' | 'info';

export interface RuntimeAlert {
  severity: RuntimeAlertSeverity;
  code: string;
  title: string;
  detail: string;
  runbook: string;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function clampInteger(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number,
): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.trunc(value ?? fallback)));
}

function toIso(value?: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function normalizeProvider(value?: string | null): Provider | undefined {
  switch (value) {
    case 'telegram':
    case 'web_form':
    case 'instagram':
    case 'whatsapp':
    case 'clinic_database':
      return value;
    default:
      return undefined;
  }
}

function describePayload(payload: unknown): string | null {
  const record = asRecord(payload);
  if (!record) {
    return null;
  }

  const reason = readString(record.reason);
  if (reason) {
    return reason.replaceAll('_', ' ');
  }

  const eventType = readString(record.eventType);
  const objectId = readString(record.objectId);
  if (eventType || objectId) {
    return [eventType, objectId].filter(Boolean).join(' · ');
  }

  const externalContactId = readString(record.externalContactId);
  const externalThreadId = readString(record.externalThreadId);
  const externalMessageId = readString(record.externalMessageId);
  const patientName = readString(record.patientName);
  const text = readString(record.text);
  const contactLabel = patientName || externalContactId;
  const threadLabel = externalThreadId && externalThreadId !== externalContactId
    ? `thread ${externalThreadId}`
    : undefined;
  const messageLabel = externalMessageId ? `msg ${externalMessageId}` : undefined;
  const preview = text ? `"${text.slice(0, 72)}${text.length > 72 ? '…' : ''}"` : undefined;
  const summary = [contactLabel, threadLabel, messageLabel, preview].filter(Boolean).join(' · ');

  return summary || null;
}

function sortByTimestampDesc<
  Item extends {
    occurredAt?: string | null;
    createdAt?: string | null;
    receivedAt?: string | null;
    dispatchedAt?: string | null;
  },
>(left: Item, right: Item): number {
  const leftValue =
    left.occurredAt ?? left.dispatchedAt ?? left.receivedAt ?? left.createdAt ?? '';
  const rightValue =
    right.occurredAt ?? right.dispatchedAt ?? right.receivedAt ?? right.createdAt ?? '';

  return rightValue.localeCompare(leftValue);
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueHealthService: QueueHealthService,
    private readonly auditService: AuditService,
    private readonly billingService: BillingService,
    private readonly complianceService: ComplianceService,
    private readonly integrationReconciliationService: IntegrationReconciliationService,
    private readonly projectionsService: ProjectionsService,
    private readonly webhookRecoveryService: WebhookRecoveryService,
    private readonly webhooksService: WebhooksService,
    private readonly failureDrillsService: AdminFailureDrillsService,
  ) {}

  async getPlatformOverview() {
    const [
      organizations,
      subscriptions,
      integrationBuckets,
      receiptBuckets,
      outboxBuckets,
      lastReceipts,
      unresolvedReceipts,
      recentFailedReceipts,
      recentFailedOutboxEvents,
      queueHealth,
      reconciliation,
      projections,
      billing,
      dataLifecycle,
      recovery,
    ] = await Promise.all([
      this.prisma.organization.findMany({
        select: {
          id: true,
          name: true,
          status: true,
          timezone: true,
          currency: true,
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.subscription.findMany({
        select: {
          organizationId: true,
          plan: true,
          status: true,
          currentPeriodEnd: true,
        },
      }),
      this.prisma.integration.groupBy({
        by: ['organizationId', 'status'],
        _count: { _all: true },
      }),
      this.prisma.webhookReceipt.groupBy({
        by: ['organizationId', 'processingStatus'],
        _count: { _all: true },
        where: {
          organizationId: { not: null },
        },
      }),
      this.prisma.outboxEvent.groupBy({
        by: ['organizationId', 'status'],
        _count: { _all: true },
        where: {
          organizationId: { not: null },
        },
      }),
      this.prisma.webhookReceipt.groupBy({
        by: ['organizationId'],
        _max: {
          receivedAt: true,
        },
        where: {
          organizationId: { not: null },
        },
      }),
      this.prisma.webhookReceipt.count({
        where: {
          organizationId: null,
          processingStatus: {
            in: ['received', 'failed', 'dead_letter'],
          },
        },
      }),
      this.prisma.webhookReceipt.findMany({
        where: {
          processingStatus: {
            in: [...RECEIPT_FAILURE_STATES],
          },
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { receivedAt: 'desc' },
        take: 8,
      }),
      this.prisma.outboxEvent.findMany({
        where: {
          status: {
            in: [...OUTBOX_FAILURE_STATES],
          },
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 8,
      }),
      this.queueHealthService.getQueueHealthSnapshot(),
      this.integrationReconciliationService.getPlatformReconciliationSnapshot(),
      this.projectionsService.getProjectionHealthSnapshot(),
      this.billingService.getBillingHealthSnapshot(),
      this.complianceService.getDataLifecycleSnapshot(),
      this.webhookRecoveryService.getRecoveryHealthSnapshot(),
    ]);

    const subscriptionByOrganization = new Map(
      subscriptions.map((subscription) => [subscription.organizationId, subscription]),
    );
    const integrationCounters = new Map<
      string,
      { total: number; active: number; degraded: number }
    >();
    const receiptCounters = new Map<
      string,
      Record<ReceiptProcessingStatus, number>
    >();
    const outboxCounters = new Map<string, Record<OutboxStatus, number>>();
    const lastReceiptByOrganization = new Map(
      lastReceipts
        .filter((entry) => entry.organizationId)
        .map((entry) => [entry.organizationId as string, entry._max.receivedAt]),
    );

    for (const bucket of integrationBuckets) {
      const current = integrationCounters.get(bucket.organizationId) ?? {
        total: 0,
        active: 0,
        degraded: 0,
      };
      current.total += bucket._count._all;
      if (bucket.status === 'active') {
        current.active += bucket._count._all;
      }
      if (bucket.status === 'degraded' || bucket.status === 'disconnected') {
        current.degraded += bucket._count._all;
      }
      integrationCounters.set(bucket.organizationId, current);
    }

    for (const bucket of receiptBuckets) {
      if (!bucket.organizationId) {
        continue;
      }

      const current = receiptCounters.get(bucket.organizationId) ?? {
        received: 0,
        processing: 0,
        processed: 0,
        failed: 0,
        dead_letter: 0,
        ignored: 0,
      };
      current[bucket.processingStatus] = bucket._count._all;
      receiptCounters.set(bucket.organizationId, current);
    }

    for (const bucket of outboxBuckets) {
      if (!bucket.organizationId) {
        continue;
      }

      const current = outboxCounters.get(bucket.organizationId) ?? {
        pending: 0,
        dispatching: 0,
        dispatched: 0,
        failed: 0,
        dead_letter: 0,
      };
      current[bucket.status] = bucket._count._all;
      outboxCounters.set(bucket.organizationId, current);
    }

    const organizationRows = organizations.map((organization) => {
      const subscription = subscriptionByOrganization.get(organization.id);
      const integration = integrationCounters.get(organization.id) ?? {
        total: 0,
        active: 0,
        degraded: 0,
      };
      const receipts = receiptCounters.get(organization.id) ?? {
        received: 0,
        processing: 0,
        processed: 0,
        failed: 0,
        dead_letter: 0,
        ignored: 0,
      };
      const outbox = outboxCounters.get(organization.id) ?? {
        pending: 0,
        dispatching: 0,
        dispatched: 0,
        failed: 0,
        dead_letter: 0,
      };

      return {
        id: organization.id,
        name: organization.name,
        status: organization.status,
        timezone: organization.timezone,
        currency: organization.currency,
        plan: subscription?.plan ?? null,
        subscriptionStatus: subscription?.status ?? null,
        currentPeriodEnd: toIso(subscription?.currentPeriodEnd),
        activeIntegrations: integration.active,
        degradedIntegrations: integration.degraded,
        totalIntegrations: integration.total,
        failedReceipts: receipts.failed + receipts.dead_letter,
        pendingReceipts: receipts.received + receipts.processing,
        failedOutbox: outbox.failed + outbox.dead_letter,
        pendingOutbox: outbox.pending + outbox.dispatching,
        lastReceiptAt: toIso(lastReceiptByOrganization.get(organization.id)),
      };
    });

    const recentFailures = [
      ...recentFailedReceipts.map((receipt) => ({
        id: receipt.id,
        kind: 'receipt',
        organizationId: receipt.organizationId,
        organizationName: receipt.organization?.name ?? 'Unresolved tenant',
        provider: receipt.provider,
        status: receipt.processingStatus,
        title: `${receipt.provider} receipt ${receipt.processingStatus.replaceAll('_', ' ')}`,
        detail:
          receipt.lastErrorMessage ??
          describePayload(receipt.payloadJson) ??
          receipt.externalEventId,
        occurredAt: receipt.receivedAt.toISOString(),
        correlationId: receipt.correlationId,
      })),
      ...recentFailedOutboxEvents.map((event) => ({
        id: event.id,
        kind: 'outbox',
        organizationId: event.organizationId,
        organizationName: event.organization?.name ?? 'Unresolved tenant',
        provider: null,
        status: event.status,
        title: `${event.eventName} ${event.status.replaceAll('_', ' ')}`,
        detail:
          event.lastErrorMessage ??
          describePayload(event.payloadJson) ??
          event.aggregateId,
        occurredAt: event.updatedAt.toISOString(),
        correlationId: event.correlationId,
      })),
    ]
      .sort(sortByTimestampDesc)
      .slice(0, 10);
    const runbookHints = this.buildPlatformRunbookHints({
      unresolvedReceipts,
      reconciliation,
      projections,
      billing,
      dataLifecycle,
      recovery,
      queueHealth,
    });
    const runtimeAlerts = this.buildRuntimeAlerts({
      unresolvedReceipts,
      reconciliation,
      projections,
      billing,
      dataLifecycle,
      recovery,
      queueHealth,
    });

    return {
      generatedAt: new Date().toISOString(),
      stats: {
        organizations: organizationRows.length,
        degradedIntegrations: organizationRows.reduce(
          (total, organization) => total + organization.degradedIntegrations,
          0,
        ),
        failedReceipts: organizationRows.reduce(
          (total, organization) => total + organization.failedReceipts,
          0,
        ),
        failedOutbox: organizationRows.reduce(
          (total, organization) => total + organization.failedOutbox,
          0,
        ),
        unresolvedReceipts,
      },
      runtime: {
        alerts: runtimeAlerts,
        billing,
        dataLifecycle,
        reconciliation,
        projections,
        recovery,
        queues: queueHealth,
        runbookHints,
      },
      organizations: organizationRows,
      recentFailures,
    };
  }

  async getTenantDebugView(
    organizationId: string,
    options?: {
      limit?: number;
      receiptId?: string;
    },
  ) {
    const limit = clampInteger(
      options?.limit,
      10,
      50,
      DEFAULT_TIMELINE_LIMIT,
    );
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      organization,
      subscription,
      integrations,
      receipts,
      outboxEvents,
      integrationEvents,
      usageEvents,
      auditLogs,
      replayAttempts,
      receiptCounters,
      outboxCounters,
      receiptVolume24h,
      inboundVolume24h,
      reconciliation,
      recovery,
    ] = await Promise.all([
      this.prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
          id: true,
          name: true,
          status: true,
          timezone: true,
          currency: true,
          averagePatientValue: true,
        },
      }),
      this.prisma.subscription.findFirst({
        where: { organizationId },
        orderBy: { updatedAt: 'desc' },
        select: {
          plan: true,
          status: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          externalCustomerId: true,
          externalSubscriptionId: true,
        },
      }),
      this.prisma.integration.findMany({
        where: { organizationId },
        orderBy: [{ status: 'asc' }, { provider: 'asc' }],
        select: {
          id: true,
          provider: true,
          status: true,
          externalAccountId: true,
          healthScore: true,
          errorState: true,
          lastSyncAt: true,
        },
      }),
      this.prisma.webhookReceipt.findMany({
        where: { organizationId },
        orderBy: { receivedAt: 'desc' },
        take: limit,
        include: {
          outboxEvents: {
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
      this.prisma.outboxEvent.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: limit * 2,
      }),
      this.prisma.integrationEvent.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.usageEvent.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.auditLog.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.replayAttempt.findMany({
        where: { organizationId },
        orderBy: { startedAt: 'desc' },
        take: limit,
      }),
      this.prisma.webhookReceipt.groupBy({
        by: ['processingStatus'],
        _count: { _all: true },
        where: { organizationId },
      }),
      this.prisma.outboxEvent.groupBy({
        by: ['status'],
        _count: { _all: true },
        where: { organizationId },
      }),
      this.prisma.webhookReceipt.count({
        where: {
          organizationId,
          receivedAt: { gte: cutoff },
        },
      }),
      this.prisma.usageEvent.count({
        where: {
          organizationId,
          metric: 'inbound_message',
          occurredAt: { gte: cutoff },
        },
      }),
      this.integrationReconciliationService.getTenantReconciliationSnapshot(
        organizationId,
      ),
      this.webhookRecoveryService.getRecoveryHealthSnapshot(),
    ]);

    if (!organization) {
      throw new NotFoundException('Organization was not found.');
    }

    const receiptCounterMap = new Map<
      ReceiptProcessingStatus,
      number
    >(
      receiptCounters.map((bucket) => [bucket.processingStatus, bucket._count._all]),
    );
    const outboxCounterMap = new Map<OutboxStatus, number>(
      outboxCounters.map((bucket) => [bucket.status, bucket._count._all]),
    );

    const selectedReceiptId =
      options?.receiptId ??
      receipts.find(
        (receipt) =>
          receipt.processingStatus === 'failed' ||
          receipt.processingStatus === 'dead_letter',
      )?.id ??
      receipts[0]?.id;
    const selectedIncident = selectedReceiptId
      ? await this.buildIncidentDetail(organizationId, selectedReceiptId)
      : null;

    const mappedReceipts = receipts.map((receipt) => ({
      id: receipt.id,
      provider: receipt.provider,
      channelProvider: receipt.channelProvider,
      processingStatus: receipt.processingStatus,
      signatureStatus: receipt.signatureStatus,
      externalEventId: receipt.externalEventId,
      correlationId: receipt.correlationId,
      integrationId: receipt.integrationId,
      receivedAt: receipt.receivedAt.toISOString(),
      occurredAt: toIso(receipt.occurredAt),
      firstProcessedAt: toIso(receipt.firstProcessedAt),
      lastProcessedAt: toIso(receipt.lastProcessedAt),
      retryCount: receipt.retryCount,
      lastErrorCode: receipt.lastErrorCode,
      lastErrorMessage: receipt.lastErrorMessage,
      payloadSummary: describePayload(receipt.payloadJson),
      outboxEvents: receipt.outboxEvents.map((event) => ({
        id: event.id,
        eventName: event.eventName,
        status: event.status,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        dispatchedAt: toIso(event.dispatchedAt),
        attemptCount: event.attemptCount,
        lastErrorCode: event.lastErrorCode,
        lastErrorMessage: event.lastErrorMessage,
      })),
    }));

    const mappedIntegrations = integrations.map((integration) => ({
      id: integration.id,
      provider: integration.provider,
      status: integration.status,
      externalAccountId: integration.externalAccountId,
      healthScore: integration.healthScore,
      errorState: integration.errorState,
      lastSyncAt: toIso(integration.lastSyncAt),
    }));

    const timeline = this.buildTimeline({
      receipts,
      outboxEvents,
      integrationEvents,
      usageEvents,
      auditLogs,
      replayAttempts,
      limit: limit * 4,
    });
    const failedReceipts =
      (receiptCounterMap.get('failed') ?? 0) +
      (receiptCounterMap.get('dead_letter') ?? 0);
    const failedOutbox =
      (outboxCounterMap.get('failed') ?? 0) +
      (outboxCounterMap.get('dead_letter') ?? 0);
    const pendingOutbox =
      (outboxCounterMap.get('pending') ?? 0) +
      (outboxCounterMap.get('dispatching') ?? 0);
    const degradedIntegrations = integrations.filter(
      (integration) =>
        integration.status === 'degraded' || integration.status === 'disconnected',
    ).length;
    const runbookHints = this.buildTenantRunbookHints({
      organizationName: organization.name,
      failedReceipts,
      failedOutbox,
      pendingOutbox,
      degradedIntegrations,
      reconciliation,
      selectedIncident,
    });

    return {
      generatedAt: new Date().toISOString(),
      organization,
      subscription: subscription
        ? {
            plan: subscription.plan,
            status: subscription.status,
            currentPeriodStart: toIso(subscription.currentPeriodStart),
            currentPeriodEnd: toIso(subscription.currentPeriodEnd),
            externalCustomerId: subscription.externalCustomerId,
            externalSubscriptionId: subscription.externalSubscriptionId,
          }
        : null,
      stats: {
        integrations: integrations.length,
        activeIntegrations: integrations.filter((integration) => integration.status === 'active')
          .length,
        degradedIntegrations,
        receipts24h: receiptVolume24h,
        inboundMessages24h: inboundVolume24h,
        failedReceipts,
        failedOutbox,
        pendingOutbox,
      },
      runtime: {
        reconciliation,
        recovery,
        runbookHints,
      },
      integrations: mappedIntegrations,
      replayAttempts: replayAttempts.map((attempt) => ({
        id: attempt.id,
        targetType: attempt.targetType,
        targetId: attempt.targetId,
        source: attempt.source,
        force: attempt.force,
        status: attempt.status,
        reason: attempt.reason,
        requestedByUserId: attempt.requestedByUserId,
        correlationId: attempt.correlationId,
        startedAt: attempt.startedAt.toISOString(),
        completedAt: toIso(attempt.completedAt),
        durationMs: attempt.durationMs,
        errorCode: attempt.errorCode,
        errorMessage: attempt.errorMessage,
      })),
      receipts: mappedReceipts,
      timeline,
      selectedIncident,
    };
  }

  async replayReceipt(
    receiptId: string,
    force = false,
    actor?: { userId: string; ip?: string },
  ) {
    const receipt = await this.prisma.webhookReceipt.findUnique({
      where: { id: receiptId },
      select: { id: true, organizationId: true },
    });
    const result = await this.webhooksService.replayReceipt(receiptId, {
      force,
      source: 'admin_console',
      reason: force ? 'operator_forced_receipt_replay' : 'operator_receipt_replay',
      actorUserId: actor?.userId,
    });

    if (actor) {
      await this.appendAuditSafely({
        organizationId: receipt?.organizationId ?? undefined,
        actorUserId: actor.userId,
        action: 'admin_replayed_receipt',
        entityType: 'webhook_receipt',
        entityId: receiptId,
        ip: actor.ip,
        metadataJson: {
          force,
          result,
        },
      });
    }

    return result;
  }

  async replayOutboxEvent(
    outboxEventId: string,
    force = false,
    actor?: { userId: string; ip?: string },
  ) {
    const outboxEvent = await this.prisma.outboxEvent.findUnique({
      where: { id: outboxEventId },
      select: { id: true, organizationId: true },
    });
    const result = await this.webhooksService.replayOutboxEvent(outboxEventId, {
      force,
      source: 'admin_console',
      reason: force ? 'operator_forced_outbox_replay' : 'operator_outbox_replay',
      actorUserId: actor?.userId,
    });

    if (actor) {
      await this.appendAuditSafely({
        organizationId: outboxEvent?.organizationId ?? undefined,
        actorUserId: actor.userId,
        action: 'admin_replayed_outbox_event',
        entityType: 'outbox_event',
        entityId: outboxEventId,
        ip: actor.ip,
        metadataJson: {
          force,
          result,
        },
      });
    }

    return result;
  }

  async runRecoverySweep(actor?: { userId: string; ip?: string }) {
    const result = await this.webhookRecoveryService.runRecoverySweep();

    if (actor) {
      await this.appendAuditSafely({
        actorUserId: actor.userId,
        action: 'admin_ran_recovery_sweep',
        entityType: 'runtime_recovery',
        entityId: 'runtime.recovery.sweep',
        ip: actor.ip,
        metadataJson: result,
      });
    }

    return result;
  }

  async runReconciliationSweep(actor?: { userId: string; ip?: string }) {
    const result = await this.integrationReconciliationService.runReconciliationSweep();

    if (actor) {
      await this.appendAuditSafely({
        actorUserId: actor.userId,
        action: 'admin_ran_reconciliation_sweep',
        entityType: 'runtime_reconciliation',
        entityId: 'runtime.reconciliation.sweep',
        ip: actor.ip,
        metadataJson: result,
      });
    }

    return result;
  }

  getFailureDrillCatalog() {
    return this.failureDrillsService.getCatalog();
  }

  runFailureDrill(
    scenario: string,
    input?: {
      organizationId?: string;
    },
    actor?: { userId: string; ip?: string },
  ) {
    return this.failureDrillsService.runDrill({
      scenario,
      organizationId: input?.organizationId,
      actor,
    });
  }

  async rebuildProjections(
    input?: { organizationId?: string },
    actor?: { userId: string; ip?: string },
  ) {
    const result = input?.organizationId
      ? await this.projectionsService.rebuildOrganizationProjections(input.organizationId)
      : await this.projectionsService.rebuildAllProjections();

    if (actor) {
      await this.appendAuditSafely({
        organizationId: input?.organizationId,
        actorUserId: actor.userId,
        action: 'admin_rebuilt_projections',
        entityType: input?.organizationId ? 'organization_projection' : 'platform_projection',
        entityId: input?.organizationId ?? 'all',
        ip: actor.ip,
        metadataJson: result,
      });
    }

    return result;
  }

  async runDataLifecycleSweep(
    input?: { organizationId?: string; dryRun?: boolean },
    actor?: { userId: string; ip?: string },
  ) {
    const result = await this.complianceService.runDataLifecycleSweep({
      organizationId: input?.organizationId,
      dryRun: input?.dryRun ?? true,
      source: 'admin_console',
    });

    if (actor) {
      await this.appendAuditSafely({
        organizationId: input?.organizationId,
        actorUserId: actor.userId,
        action: 'admin_ran_data_lifecycle_sweep',
        entityType: 'data_lifecycle_run',
        entityId: result.runId,
        ip: actor.ip,
        metadataJson: result,
      });
    }

    return result;
  }

  private buildTimeline(input: {
    receipts: Array<{
      id: string;
      provider: WebhookProvider;
      channelProvider: Provider | null;
      processingStatus: ReceiptProcessingStatus;
      signatureStatus: SignatureStatus;
      externalEventId: string;
      correlationId: string;
      occurredAt: Date | null;
      receivedAt: Date;
      lastErrorMessage: string | null;
      payloadJson: Prisma.JsonValue;
    }>;
    outboxEvents: Array<{
      id: string;
      receiptId: string | null;
      eventName: string;
      status: OutboxStatus;
      aggregateType: string;
      aggregateId: string;
      correlationId: string;
      occurredAt: Date;
      dispatchedAt: Date | null;
      createdAt: Date;
      lastErrorMessage: string | null;
      payloadJson: Prisma.JsonValue;
    }>;
    integrationEvents: Array<{
      id: string;
      provider: Provider;
      providerEventId: string;
      status: string;
      createdAt: Date;
      processedAt: Date | null;
      errorMessage: string | null;
      payloadJson: Prisma.JsonValue;
    }>;
    usageEvents: Array<{
      id: string;
      metric: string;
      quantity: number;
      sourceEntityType: string;
      sourceEntityId: string;
      occurredAt: Date;
      metadataJson: Prisma.JsonValue | null;
      createdAt: Date;
    }>;
    auditLogs: Array<{
      id: string;
      action: string;
      entityType: string;
      entityId: string;
      createdAt: Date;
      actor: {
        id: string;
        name: string;
        email: string;
      };
    }>;
    replayAttempts: Array<{
      id: string;
      targetType: string;
      targetId: string;
      source: string;
      force: boolean;
      status: string;
      reason: string | null;
      correlationId: string;
      startedAt: Date;
      completedAt: Date | null;
      errorMessage: string | null;
    }>;
    limit: number;
  }) {
    const timelineItems = [
      ...input.receipts.map((receipt) => ({
        id: `receipt:${receipt.id}`,
        sourceId: receipt.id,
        kind: 'receipt',
        status: receipt.processingStatus,
        title: `${receipt.provider} webhook ${receipt.processingStatus.replaceAll('_', ' ')}`,
        detail:
          receipt.lastErrorMessage ??
          describePayload(receipt.payloadJson) ??
          receipt.externalEventId,
        correlationId: receipt.correlationId,
        provider: receipt.channelProvider ?? receipt.provider,
        externalEventId: receipt.externalEventId,
        occurredAt: toIso(receipt.occurredAt) ?? receipt.receivedAt.toISOString(),
      })),
      ...input.outboxEvents.map((event) => ({
        id: `outbox:${event.id}`,
        sourceId: event.id,
        kind: 'outbox',
        status: event.status,
        title: `${event.eventName} ${event.status.replaceAll('_', ' ')}`,
        detail:
          event.lastErrorMessage ??
          describePayload(event.payloadJson) ??
          event.aggregateId,
        correlationId: event.correlationId,
        provider: normalizeProvider(readString(asRecord(event.payloadJson)?.channelProvider)),
        externalEventId: readString(asRecord(event.payloadJson)?.externalEventId),
        occurredAt:
          toIso(event.dispatchedAt) ??
          event.occurredAt.toISOString() ??
          event.createdAt.toISOString(),
      })),
      ...input.integrationEvents.map((event) => ({
        id: `integration:${event.id}`,
        sourceId: event.id,
        kind: 'integration_event',
        status: event.status,
        title: `${event.provider} integration ${event.status.replaceAll('_', ' ')}`,
        detail:
          event.errorMessage ??
          describePayload(event.payloadJson) ??
          event.providerEventId,
        correlationId: null,
        provider: event.provider,
        externalEventId: event.providerEventId,
        occurredAt: toIso(event.processedAt) ?? event.createdAt.toISOString(),
      })),
      ...input.usageEvents.map((event) => ({
        id: `usage:${event.id}`,
        sourceId: event.id,
        kind: 'usage_event',
        status: 'recorded',
        title: `${event.metric} recorded`,
        detail: `${event.quantity} unit(s) · ${event.sourceEntityType}`,
        correlationId: null,
        provider: null,
        externalEventId: null,
        occurredAt: event.occurredAt.toISOString(),
      })),
      ...input.auditLogs.map((event) => ({
        id: `audit:${event.id}`,
        sourceId: event.id,
        kind: 'audit',
        status: 'recorded',
        title: event.action.replaceAll('_', ' '),
        detail: `${event.entityType} · ${event.entityId} · ${event.actor.name}`,
        correlationId: null,
        provider: null,
        externalEventId: null,
        occurredAt: event.createdAt.toISOString(),
      })),
      ...input.replayAttempts.map((attempt) => ({
        id: `replay:${attempt.id}`,
        sourceId: attempt.id,
        kind: 'replay_attempt',
        status: attempt.status,
        title: `${attempt.targetType.replaceAll('_', ' ')} replay ${attempt.status}`,
        detail:
          attempt.errorMessage ??
          [
            attempt.source.replaceAll('_', ' '),
            attempt.force ? 'forced' : 'safe',
            attempt.reason?.replaceAll('_', ' '),
            attempt.targetId,
          ]
            .filter(Boolean)
            .join(' - '),
        correlationId: attempt.correlationId,
        provider: null,
        externalEventId: null,
        occurredAt:
          toIso(attempt.completedAt) ?? attempt.startedAt.toISOString(),
      })),
    ];

    return timelineItems.sort(sortByTimestampDesc).slice(0, input.limit);
  }

  private async buildIncidentDetail(
    organizationId: string,
    receiptId: string,
  ) {
    const receipt = await this.prisma.webhookReceipt.findFirst({
      where: {
        id: receiptId,
        organizationId,
      },
      include: {
        outboxEvents: {
          orderBy: { createdAt: 'asc' },
        },
        integration: {
          select: {
            id: true,
            provider: true,
            externalAccountId: true,
          },
        },
      },
    });

    if (!receipt) {
      return null;
    }

    const messagingEvent = receipt.outboxEvents.find(
      (event) => event.eventName === 'messaging.inbound.received',
    );
    const incidentPayload = asRecord(
      (messagingEvent?.payloadJson ?? receipt.payloadJson) as Prisma.JsonValue,
    );
    const provider = normalizeProvider(
      readString(incidentPayload?.channelProvider) ??
        readString(incidentPayload?.provider) ??
        receipt.channelProvider,
    );
    const externalAccountId =
      readString(incidentPayload?.externalAccountId) ??
      receipt.integration?.externalAccountId ??
      '';
    const externalContactId = readString(incidentPayload?.externalContactId);
    const externalThreadId = readString(incidentPayload?.externalThreadId);
    const externalMessageId = readString(incidentPayload?.externalMessageId);
    const outboxIds = receipt.outboxEvents.map((event) => event.id);

    const [
      usageEvents,
      integrationEvents,
      replayAttempts,
      contactIdentity,
      lead,
      conversation,
    ] = await Promise.all([
      outboxIds.length
        ? this.prisma.usageEvent.findMany({
            where: {
              organizationId,
              sourceEntityType: 'outbox_event',
              sourceEntityId: { in: outboxIds },
            },
            orderBy: { occurredAt: 'asc' },
          })
        : Promise.resolve([]),
      this.prisma.integrationEvent.findMany({
        where: {
          organizationId,
          provider: provider ?? undefined,
          providerEventId: {
            in: [
              readString(incidentPayload?.externalEventId),
              receipt.externalEventId,
            ].filter(Boolean) as string[],
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.replayAttempt.findMany({
        where: {
          OR: [
            {
              targetType: 'webhook_receipt',
              targetId: receipt.id,
            },
            ...(outboxIds.length
              ? [
                  {
                    targetType: 'outbox_event' as const,
                    targetId: { in: outboxIds },
                  },
                ]
              : []),
          ],
        },
        orderBy: { startedAt: 'desc' },
        take: 10,
      }),
      provider && externalContactId
        ? this.prisma.contactIdentity.findFirst({
            where: {
              organizationId,
              provider,
              externalContactId,
              ...(externalAccountId ? { externalAccountId } : {}),
            },
            include: {
              contact: true,
            },
          })
        : Promise.resolve(null),
      provider && externalContactId
        ? this.prisma.lead.findFirst({
            where: {
              organizationId,
              source: provider,
              providerContactId: externalContactId,
            },
          })
        : Promise.resolve(null),
      provider && externalThreadId
        ? this.prisma.conversation.findFirst({
            where: {
              organizationId,
              provider,
              providerThreadId: externalThreadId,
            },
          })
        : Promise.resolve(null),
    ]);

    const message =
      conversation && externalMessageId
        ? await this.prisma.message.findFirst({
            where: {
              conversationId: conversation.id,
              providerMessageId: externalMessageId,
            },
          })
        : null;

    return {
      receipt: {
        id: receipt.id,
        provider: receipt.provider,
        channelProvider: receipt.channelProvider,
        processingStatus: receipt.processingStatus,
        signatureStatus: receipt.signatureStatus,
        externalEventId: receipt.externalEventId,
        correlationId: receipt.correlationId,
        receivedAt: receipt.receivedAt.toISOString(),
        occurredAt: toIso(receipt.occurredAt),
        retryCount: receipt.retryCount,
        lastErrorCode: receipt.lastErrorCode,
        lastErrorMessage: receipt.lastErrorMessage,
        payloadJson: receipt.payloadJson,
      },
      outboxEvents: receipt.outboxEvents.map((event) => ({
        id: event.id,
        eventName: event.eventName,
        status: event.status,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        correlationId: event.correlationId,
        occurredAt: event.occurredAt.toISOString(),
        dispatchedAt: toIso(event.dispatchedAt),
        attemptCount: event.attemptCount,
        lastErrorCode: event.lastErrorCode,
        lastErrorMessage: event.lastErrorMessage,
        payloadJson: event.payloadJson,
      })),
      usageEvents: usageEvents.map((event) => ({
        id: event.id,
        metric: event.metric,
        quantity: event.quantity,
        occurredAt: event.occurredAt.toISOString(),
        sourceEntityType: event.sourceEntityType,
        sourceEntityId: event.sourceEntityId,
      })),
      integrationEvents: integrationEvents.map((event) => ({
        id: event.id,
        provider: event.provider,
        providerEventId: event.providerEventId,
        status: event.status,
        createdAt: event.createdAt.toISOString(),
        processedAt: toIso(event.processedAt),
        errorMessage: event.errorMessage,
      })),
      replayAttempts: replayAttempts.map((attempt) => ({
        id: attempt.id,
        targetType: attempt.targetType,
        targetId: attempt.targetId,
        source: attempt.source,
        force: attempt.force,
        status: attempt.status,
        reason: attempt.reason,
        requestedByUserId: attempt.requestedByUserId,
        correlationId: attempt.correlationId,
        startedAt: attempt.startedAt.toISOString(),
        completedAt: toIso(attempt.completedAt),
        durationMs: attempt.durationMs,
        errorCode: attempt.errorCode,
        errorMessage: attempt.errorMessage,
        resultJson: attempt.resultJson,
      })),
      relatedRecords: {
        contact: contactIdentity?.contact
          ? {
              id: contactIdentity.contact.id,
              displayName: contactIdentity.contact.displayName,
              phoneE164: contactIdentity.contact.phoneE164,
              emailLower: contactIdentity.contact.emailLower,
              lifecycleStatus: contactIdentity.contact.lifecycleStatus,
            }
          : null,
        contactIdentity: contactIdentity
          ? {
              id: contactIdentity.id,
              provider: contactIdentity.provider,
              externalAccountId: contactIdentity.externalAccountId,
              externalContactId: contactIdentity.externalContactId,
              externalThreadId: contactIdentity.externalThreadId,
            }
          : null,
        lead: lead
          ? {
              id: lead.id,
              status: lead.status,
              source: lead.source,
              providerContactId: lead.providerContactId,
              assignedTo: lead.assignedTo,
              firstMessageAt: lead.firstMessageAt.toISOString(),
            }
          : null,
        conversation: conversation
          ? {
              id: conversation.id,
              provider: conversation.provider,
              providerThreadId: conversation.providerThreadId,
              status: conversation.status,
              lastMessageAt: conversation.lastMessageAt.toISOString(),
            }
          : null,
        message: message
          ? {
              id: message.id,
              providerMessageId: message.providerMessageId,
              direction: message.direction,
              senderType: message.senderType,
              sentAt: message.sentAt.toISOString(),
              text: message.text,
            }
          : null,
      },
    };
  }

  private buildRuntimeAlerts(input: {
    unresolvedReceipts: number;
    reconciliation: {
      staleIntegrations: number;
      lateReceipts24h: number;
      unresolvedRecentReceipts: number;
    };
    recovery: {
      receipts: { recoverable: number; deadLetter: number };
      outbox: { recoverable: number; deadLetter: number };
    };
    billing: {
      processing: number;
      staleProcessing: number;
      failed: number;
    };
    dataLifecycle: {
      purgeable: { total: number };
    };
    queueHealth: {
      totals: {
        criticalBacklog: number;
        criticalFailed: number;
        paused: number;
      };
    };
    projections: {
      missingConversationProjections: number;
      staleConversationProjections: number;
    };
  }): RuntimeAlert[] {
    const alerts: RuntimeAlert[] = [];
    const deadLetterCount =
      input.recovery.receipts.deadLetter + input.recovery.outbox.deadLetter;
    const recoverableCount =
      input.recovery.receipts.recoverable + input.recovery.outbox.recoverable;
    const projectionDriftCount =
      input.projections.missingConversationProjections +
      input.projections.staleConversationProjections;

    if (input.queueHealth.totals.criticalFailed > 0) {
      alerts.push({
        severity: 'critical',
        code: 'critical_queue_failed_jobs',
        title: 'Critical queue has failed jobs',
        detail: `${input.queueHealth.totals.criticalFailed} failed job(s) in customer-impacting queues.`,
        runbook:
          'Open queue details, inspect the newest failed payload, verify Redis and worker health, then replay only safe jobs.',
      });
    }

    if (input.billing.failed > 0) {
      alerts.push({
        severity: 'critical',
        code: 'billing_event_failures',
        title: 'Billing sync has failed events',
        detail: `${input.billing.failed} billing event(s) failed while syncing subscription state.`,
        runbook:
          'Inspect billing event ledger before replaying Stripe receipts. Verify the Stripe payload and tenant metadata.',
      });
    }

    if (input.billing.staleProcessing > 0) {
      alerts.push({
        severity: 'critical',
        code: 'billing_event_stuck_processing',
        title: 'Billing sync has stuck processing events',
        detail: `${input.billing.staleProcessing} billing event(s) have been processing for more than five minutes.`,
        runbook:
          'Check worker health and retry only the affected outbox event after confirming idempotency.',
      });
    }

    if (input.dataLifecycle.purgeable.total > 10000) {
      alerts.push({
        severity: 'warning',
        code: 'data_lifecycle_purge_backlog',
        title: 'Operational data lifecycle backlog is growing',
        detail: `${input.dataLifecycle.purgeable.total} operational record(s) are eligible for cleanup.`,
        runbook:
          'Run a dry-run lifecycle sweep first, then schedule deletion during a low-traffic window.',
      });
    }

    if (input.queueHealth.totals.paused > 0) {
      alerts.push({
        severity: 'critical',
        code: 'queue_processing_paused',
        title: 'Queue processing is paused',
        detail: `${input.queueHealth.totals.paused} queue(s) are paused.`,
        runbook:
          'Resume processing only after confirming the pause was not intentional for a deploy or provider incident.',
      });
    }

    if (deadLetterCount > 0) {
      alerts.push({
        severity: 'critical',
        code: 'dead_letter_work',
        title: 'Dead-letter work needs manual triage',
        detail: `${deadLetterCount} receipt/outbox item(s) reached dead-letter state.`,
        runbook:
          'Do not bulk replay. Open the newest incident timeline and fix mapping, signature, or provider cause first.',
      });
    }

    if (input.queueHealth.totals.criticalBacklog > 0) {
      alerts.push({
        severity: 'warning',
        code: 'critical_queue_backlog',
        title: 'Critical queue backlog is building',
        detail: `${input.queueHealth.totals.criticalBacklog} job(s) are waiting, active, delayed, or prioritized.`,
        runbook:
          'Check worker concurrency and Redis latency before assuming provider failure.',
      });
    }

    if (recoverableCount > 0) {
      alerts.push({
        severity: 'warning',
        code: 'recoverable_stuck_work',
        title: 'Recoverable stuck work exists',
        detail: `${recoverableCount} receipt/outbox item(s) can be recovered by the sweep.`,
        runbook:
          'Run recovery sweep, then re-check failed receipts and outbox dispatch before customer escalation.',
      });
    }

    if (input.unresolvedReceipts > 0 || input.reconciliation.unresolvedRecentReceipts > 0) {
      alerts.push({
        severity: input.unresolvedReceipts > 10 ? 'critical' : 'warning',
        code: 'unresolved_webhook_tenant',
        title: 'Webhook receipts are not resolving to tenants',
        detail: `${input.unresolvedReceipts} total unresolved, ${input.reconciliation.unresolvedRecentReceipts} recent unresolved.`,
        runbook:
          'Fix provider account mapping or integration credentials first. Replay will not heal unresolved tenancy.',
      });
    }

    if (projectionDriftCount > 0) {
      alerts.push({
        severity: 'warning',
        code: 'projection_drift',
        title: 'Inbox projections are stale or missing',
        detail: `${input.projections.missingConversationProjections} missing and ${input.projections.staleConversationProjections} stale projection(s).`,
        runbook:
          'Run projection rebuild before trusting dashboard counters or debugging SLA metrics.',
      });
    }

    if (input.reconciliation.staleIntegrations > 0) {
      alerts.push({
        severity: 'warning',
        code: 'silent_integrations',
        title: 'Integrations have silence anomalies',
        detail: `${input.reconciliation.staleIntegrations} integration(s) are outside expected webhook activity.`,
        runbook:
          'Verify expected traffic and provider status before marking credentials broken.',
      });
    }

    if (input.reconciliation.lateReceipts24h > 0) {
      alerts.push({
        severity: 'info',
        code: 'late_webhook_delivery',
        title: 'Late webhook deliveries observed',
        detail: `${input.reconciliation.lateReceipts24h} late receipt(s) detected in the last 24 hours.`,
        runbook:
          'Use occurred_at for SLA and revenue-loss calculations; received_at is only ingestion time.',
      });
    }

    const severityRank: Record<RuntimeAlertSeverity, number> = {
      critical: 3,
      warning: 2,
      info: 1,
    };

    return alerts
      .sort((left, right) => severityRank[right.severity] - severityRank[left.severity])
      .slice(0, 8);
  }

  private buildPlatformRunbookHints(input: {
    unresolvedReceipts: number;
    reconciliation: {
      staleIntegrations: number;
      lateReceipts24h: number;
      unresolvedRecentReceipts: number;
    };
    recovery: {
      receipts: { recoverable: number; deadLetter: number };
      outbox: { recoverable: number; deadLetter: number };
    };
    queueHealth: {
      totals: { criticalBacklog: number; criticalFailed: number; paused: number };
    };
    projections?: {
      missingConversationProjections: number;
      staleConversationProjections: number;
    };
    billing?: {
      staleProcessing: number;
      failed: number;
    };
    dataLifecycle?: {
      purgeable: { total: number };
    };
  }): string[] {
    const hints: string[] = [];

    if (input.queueHealth.totals.criticalBacklog > 0) {
      hints.push(
        `Critical queues show backlog (${input.queueHealth.totals.criticalBacklog}). Confirm worker and Redis health before replaying customer-facing events.`,
      );
    }

    if (
      input.recovery.receipts.recoverable > 0 ||
      input.recovery.outbox.recoverable > 0
    ) {
      hints.push(
        'Recoverable stuck work exists in receipts or outbox. Run recovery sweep before triaging incidents one by one.',
      );
    }

    if (
      (input.projections?.missingConversationProjections ?? 0) > 0 ||
      (input.projections?.staleConversationProjections ?? 0) > 0
    ) {
      hints.push(
        `Projection drift detected: ${input.projections?.missingConversationProjections ?? 0} missing and ${input.projections?.staleConversationProjections ?? 0} stale conversation projection(s). Rebuild projections before debugging dashboard counters.`,
      );
    }

    if (input.unresolvedReceipts > 0) {
      hints.push(
        'Some receipts do not resolve to a tenant or integration. Fix mapping or credentials first because replay alone will not heal these events.',
      );
    }

    if (input.reconciliation.staleIntegrations > 0) {
      hints.push(
        `Reconciliation detected ${input.reconciliation.staleIntegrations} integration(s) with silence anomalies. Treat this as a connectivity suspicion, not definitive provider outage, until you verify recent traffic expectations.`,
      );
    }

    if (input.reconciliation.lateReceipts24h > 0) {
      hints.push(
        `Late webhook deliveries were detected in the last 24 hours (${input.reconciliation.lateReceipts24h}). Use occurred_at, not received_at, when debugging SLA or response metrics.`,
      );
    }

    if (
      input.recovery.receipts.deadLetter > 0 ||
      input.recovery.outbox.deadLetter > 0 ||
      input.queueHealth.totals.criticalFailed > 0 ||
      (input.billing?.failed ?? 0) > 0
    ) {
      hints.push(
        'Dead-letter or failed critical work exists. Inspect the newest failed receipt or outbox payload before forcing bulk replays.',
      );
    }

    if ((input.billing?.staleProcessing ?? 0) > 0) {
      hints.push(
        `Billing ledger has ${input.billing?.staleProcessing ?? 0} stale processing event(s). Verify Stripe event idempotency before manual replay.`,
      );
    }

    if (input.queueHealth.totals.paused > 0) {
      hints.push(
        'One or more queues are paused. Resume queue processing before escalating to provider debugging.',
      );
    }

    if ((input.dataLifecycle?.purgeable.total ?? 0) > 0) {
      hints.push(
        `Data lifecycle has ${input.dataLifecycle?.purgeable.total ?? 0} purgeable operational record(s). Run dry-run before deleting anything.`,
      );
    }

    return hints.slice(0, 4);
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

  private buildTenantRunbookHints(input: {
    organizationName: string;
    failedReceipts: number;
    failedOutbox: number;
    pendingOutbox: number;
    degradedIntegrations: number;
    reconciliation: {
      staleIntegrations: number;
      lateReceipts24h: number;
      failedReceipts24h: number;
      integrations: Array<{
        provider: string;
        isSilenceStale: boolean;
      }>;
    };
    selectedIncident: Awaited<ReturnType<AdminService['buildIncidentDetail']>> | null;
  }): string[] {
    const hints: string[] = [];

    if (input.failedReceipts > 0) {
      hints.push(
        `${input.organizationName} has failed ingress receipts. Validate signature, mapping, and payload shape before forcing a full receipt replay.`,
      );
    }

    if (input.failedOutbox > 0) {
      hints.push(
        'Failed outbox dispatch exists for this tenant. Prefer replaying the specific outbox event after provider health is back to normal.',
      );
    }

    if (input.pendingOutbox > 0 && input.failedOutbox === 0) {
      hints.push(
        'Pending outbox work exists without hard failures. Check queue pressure before assuming the provider rejected the message.',
      );
    }

    if (input.degradedIntegrations > 0) {
      hints.push(
        'One or more tenant integrations are degraded. Recovery can requeue work, but it will not repair broken provider credentials.',
      );
    }

    if (input.reconciliation.staleIntegrations > 0) {
      const staleProviders = input.reconciliation.integrations
        .filter((integration) => integration.isSilenceStale)
        .map((integration) => integration.provider)
        .slice(0, 3)
        .join(', ');
      hints.push(
        `Reconciliation marked ${input.reconciliation.staleIntegrations} integration(s) as silence-risk${staleProviders ? ` (${staleProviders})` : ''}. Check recent traffic expectations before calling this a provider outage.`,
      );
    }

    if (input.reconciliation.lateReceipts24h > 0) {
      hints.push(
        `Late receipts were seen for this tenant in the last 24 hours (${input.reconciliation.lateReceipts24h}). Investigate with occurred_at timestamps before recalculating SLA breaches.`,
      );
    }

    if (
      input.selectedIncident &&
      !input.selectedIncident.relatedRecords.message &&
      input.selectedIncident.outboxEvents.some(
        (event) => event.eventName === 'messaging.inbound.received',
      )
    ) {
      hints.push(
        'Ingress was accepted but message materialization is incomplete. Inspect the selected incident payload and contact identity mapping before replaying again.',
      );
    }

    return hints.slice(0, 4);
  }
}
