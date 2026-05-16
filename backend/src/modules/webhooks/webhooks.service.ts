import * as crypto from 'node:crypto';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, type OutboxEvent, type WebhookReceipt } from '@prisma/client';
import { Queue } from 'bullmq';
import { PrismaService } from '@app/infra/prisma/prisma.service';
import { JobNames, QueueNames } from '@app/infra/queue/queue.names';
import { BillingService } from '@app/modules/billing/billing.service';
import { WebhookMaterializationService } from './webhook-materialization.service';

type AcceptedProvider = 'stripe' | 'telegram' | 'meta' | 'web_form';
type AcceptedSignatureStatus = 'valid' | 'invalid' | 'pending' | 'skipped';
type ChannelProvider = 'telegram' | 'whatsapp' | 'instagram' | 'web_form';

interface AcceptedWebhookInput {
  provider: AcceptedProvider;
  payload: Record<string, unknown>;
  providerEventId: string;
  providerAccountKey?: string;
  rawBody?: string;
  signatureHeader?: string;
  signatureStatus?: AcceptedSignatureStatus;
  correlationId?: string;
}

interface ReplayOptions {
  force?: boolean;
  source?: string;
  reason?: string;
  actorUserId?: string;
  correlationId?: string;
}

type ReplayAttemptFinalStatus = 'completed' | 'skipped' | 'failed';

interface ReceiptResolution {
  organizationId?: string;
  integrationId?: string;
  channelProvider?: ChannelProvider;
  normalizedPayload: Record<string, unknown>;
  unresolvedReason?: string;
}

interface InboundMessagePayload {
  externalMessageId: string;
  externalThreadId: string;
  externalContactId: string;
  text?: string;
  patientName?: string;
  patientPhone?: string;
  occurredAt?: string;
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

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

function readPositiveIntegerEnv(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function truncateError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.length > 500 ? `${message.slice(0, 497)}...` : message;
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly billingService: BillingService,
    private readonly webhookMaterializationService: WebhookMaterializationService,
    @InjectQueue(QueueNames.webhookProcess)
    private readonly webhookProcessQueue: Queue,
    @InjectQueue(QueueNames.outboxDispatch)
    private readonly outboxDispatchQueue: Queue,
  ) {}

  async acceptWebhook(input: AcceptedWebhookInput) {
    const payloadJson = JSON.stringify(input.payload ?? {});
    const providerAccountKey = input.providerAccountKey?.trim() ?? '';
    const dedupeKey = sha256(
      [input.provider, providerAccountKey, input.providerEventId].join(':'),
    );
    const correlationId = input.correlationId ?? crypto.randomUUID();
    const occurredAt = this.extractOccurredAt(input.provider, input.payload);
    const signatureStatus = await this.resolveSignatureStatus(input);

    const existing = await this.prisma.webhookReceipt.findUnique({
      where: { dedupeKey },
      select: {
        id: true,
        dedupeKey: true,
        processingStatus: true,
        signatureStatus: true,
        correlationId: true,
      },
    });

    if (existing) {
      return {
        accepted: existing.signatureStatus !== 'invalid',
        duplicate: true,
        receiptId: existing.id,
        correlationId: existing.correlationId,
        status: existing.processingStatus,
      };
    }

    const processingStatus = signatureStatus === 'invalid' ? 'ignored' : 'received';

    const receipt = await this.prisma.webhookReceipt.create({
      data: {
        provider: input.provider,
        externalEventId: input.providerEventId,
        dedupeKey,
        payloadJson: input.payload as Prisma.InputJsonValue,
        payloadSha256: sha256(payloadJson),
        signatureStatus,
        processingStatus,
        correlationId,
        providerAccountKey,
        occurredAt: occurredAt ? new Date(occurredAt) : undefined,
      },
      select: {
        id: true,
        processingStatus: true,
        signatureStatus: true,
        correlationId: true,
      },
    });

    if (receipt.processingStatus === 'received') {
      await this.enqueueReceiptProcessing(receipt.id);
    }

    return {
      accepted: receipt.signatureStatus !== 'invalid',
      duplicate: false,
      receiptId: receipt.id,
      correlationId: receipt.correlationId,
      status: receipt.processingStatus,
    };
  }

  async getReceipt(receiptId: string) {
    const receipt = await this.prisma.webhookReceipt.findUnique({
      where: { id: receiptId },
      include: {
        outboxEvents: {
          orderBy: { createdAt: 'asc' },
        },
        integration: {
          select: {
            id: true,
            organizationId: true,
            provider: true,
            externalAccountId: true,
          },
        },
      },
    });

    if (!receipt) {
      throw new NotFoundException('Webhook receipt was not found.');
    }

    return receipt;
  }

  async replayReceipt(receiptId: string, options?: ReplayOptions) {
    const receipt = await this.prisma.webhookReceipt.findUnique({
      where: { id: receiptId },
      select: {
        id: true,
        organizationId: true,
        signatureStatus: true,
        processingStatus: true,
        correlationId: true,
        outboxEvents: {
          select: { id: true, status: true },
        },
      },
    });

    if (!receipt) {
      throw new NotFoundException('Webhook receipt was not found.');
    }

    const forceReplay = Boolean(options?.force);
    const attempt = await this.startReplayAttempt({
      targetType: 'webhook_receipt',
      targetId: receiptId,
      organizationId: receipt.organizationId,
      force: forceReplay,
      source: options?.source,
      reason: options?.reason,
      actorUserId: options?.actorUserId,
      correlationId: options?.correlationId ?? receipt.correlationId,
    });

    try {
      if (receipt.signatureStatus === 'invalid' && !forceReplay) {
        const result = {
          receiptId,
          replayAttemptId: attempt.id,
          replayQueued: false,
          skipped: 'invalid-signature',
          forceReplay,
        };

        await this.finishReplayAttempt(attempt.id, 'skipped', result);
        return result;
      }

      if (receipt.processingStatus === 'ignored' && !forceReplay) {
        const result = {
          receiptId,
          replayAttemptId: attempt.id,
          replayQueued: false,
          skipped: 'ignored-receipt',
          forceReplay,
        };

        await this.finishReplayAttempt(attempt.id, 'skipped', result);
        return result;
      }

      if (receipt.outboxEvents.length > 0) {
        const replayableOutboxIds = receipt.outboxEvents
          .filter((event) => forceReplay || event.status !== 'dispatched')
          .map((event) => event.id);

        if (replayableOutboxIds.length > 0) {
          await this.prisma.outboxEvent.updateMany({
            where: {
              id: { in: replayableOutboxIds },
            },
            data: {
              status: 'pending',
              claimedAt: null,
              claimExpiresAt: null,
              dispatchedAt: null,
              lastErrorCode: null,
              lastErrorMessage: null,
            },
          });

          for (const outboxEventId of replayableOutboxIds) {
            await this.enqueueOutboxDispatch(outboxEventId);
            await this.dispatchOutboxEvent(outboxEventId);
          }
        }

        const result = {
          receiptId,
          replayAttemptId: attempt.id,
          replayQueued: replayableOutboxIds.length > 0,
          reusedOutboxEvents: replayableOutboxIds.length,
          skippedOutboxEvents: receipt.outboxEvents.length - replayableOutboxIds.length,
          forceReplay,
        };

        await this.finishReplayAttempt(
          attempt.id,
          replayableOutboxIds.length > 0 ? 'completed' : 'skipped',
          result,
        );
        return result;
      }

      await this.prisma.webhookReceipt.update({
        where: { id: receiptId },
        data: {
          processingStatus: 'received',
          claimedAt: null,
          claimExpiresAt: null,
          lastErrorCode: null,
          lastErrorMessage: null,
        },
      });

      await this.enqueueReceiptProcessing(receiptId);
      const processResult = await this.processWebhookReceipt(receiptId);

      const result = {
        receiptId,
        replayAttemptId: attempt.id,
        replayQueued: true,
        forceReplay,
        processResult,
      };

      await this.finishReplayAttempt(attempt.id, 'completed', result);
      return result;
    } catch (error) {
      await this.finishReplayAttempt(attempt.id, 'failed', undefined, error);
      throw error;
    }
  }

  async replayOutboxEvent(outboxEventId: string, options?: ReplayOptions) {
    const event = await this.prisma.outboxEvent.findUnique({
      where: { id: outboxEventId },
      select: {
        id: true,
        organizationId: true,
        status: true,
        correlationId: true,
      },
    });

    if (!event) {
      throw new NotFoundException('Outbox event was not found.');
    }

    const forceReplay = Boolean(options?.force);
    const attempt = await this.startReplayAttempt({
      targetType: 'outbox_event',
      targetId: outboxEventId,
      organizationId: event.organizationId,
      force: forceReplay,
      source: options?.source,
      reason: options?.reason,
      actorUserId: options?.actorUserId,
      correlationId: options?.correlationId ?? event.correlationId,
    });

    try {
      if (!forceReplay && event.status === 'dispatched') {
        const result = {
          outboxEventId,
          replayAttemptId: attempt.id,
          replayQueued: false,
          skipped: 'already-dispatched',
          forceReplay,
        };

        await this.finishReplayAttempt(attempt.id, 'skipped', result);
        return result;
      }

      await this.prisma.outboxEvent.update({
        where: { id: outboxEventId },
        data: {
          status: 'pending',
          claimedAt: null,
          claimExpiresAt: null,
          dispatchedAt: null,
          lastErrorCode: null,
          lastErrorMessage: null,
        },
      });

      await this.enqueueOutboxDispatch(outboxEventId);
      const dispatchResult = await this.dispatchOutboxEvent(outboxEventId);

      const result = {
        outboxEventId,
        replayAttemptId: attempt.id,
        replayQueued: true,
        forceReplay,
        dispatchResult,
      };

      await this.finishReplayAttempt(attempt.id, 'completed', result);
      return result;
    } catch (error) {
      await this.finishReplayAttempt(attempt.id, 'failed', undefined, error);
      throw error;
    }
  }

  private async startReplayAttempt(input: {
    targetType: 'webhook_receipt' | 'outbox_event';
    targetId: string;
    organizationId?: string | null;
    force: boolean;
    source?: string;
    reason?: string;
    actorUserId?: string;
    correlationId?: string | null;
  }) {
    return this.prisma.replayAttempt.create({
      data: {
        targetType: input.targetType,
        targetId: input.targetId,
        organizationId: input.organizationId,
        force: input.force,
        source: input.source ?? 'manual',
        reason: input.reason,
        requestedByUserId: input.actorUserId,
        correlationId: input.correlationId ?? crypto.randomUUID(),
      },
      select: {
        id: true,
        startedAt: true,
      },
    });
  }

  private async finishReplayAttempt(
    replayAttemptId: string,
    status: ReplayAttemptFinalStatus,
    result?: unknown,
    error?: unknown,
  ) {
    const attempt = await this.prisma.replayAttempt.findUnique({
      where: { id: replayAttemptId },
      select: { startedAt: true },
    });
    const completedAt = new Date();

    await this.prisma.replayAttempt.update({
      where: { id: replayAttemptId },
      data: {
        status,
        completedAt,
        durationMs: attempt
          ? completedAt.getTime() - attempt.startedAt.getTime()
          : undefined,
        resultJson: result === undefined ? undefined : toJsonValue(result),
        errorCode: error instanceof Error ? error.name : error ? 'replay_error' : undefined,
        errorMessage: error ? truncateError(error) : undefined,
      },
    });
  }

  async processWebhookReceipt(receiptId: string) {
    const receipt = await this.prisma.webhookReceipt.findUnique({
      where: { id: receiptId },
    });

    if (!receipt) {
      return { receiptId, state: 'missing' };
    }

    if (receipt.processingStatus === 'processed') {
      return { receiptId, state: 'already-processed' };
    }

    if (receipt.processingStatus === 'ignored') {
      return { receiptId, state: 'ignored' };
    }

    const now = new Date();
    const claim = await this.prisma.webhookReceipt.updateMany({
      where: {
        id: receiptId,
        OR: [
          {
            processingStatus: {
              in: ['received', 'failed'],
            },
          },
          {
            processingStatus: 'processing',
            OR: [
              {
                claimExpiresAt: {
                  lte: now,
                },
              },
              {
                claimExpiresAt: null,
                claimedAt: {
                  lte: new Date(now.getTime() - 5 * 60 * 1000),
                },
              },
            ],
          },
        ],
      },
      data: {
        processingStatus: 'processing',
        claimedAt: now,
        claimExpiresAt: new Date(now.getTime() + 5 * 60 * 1000),
        retryCount: { increment: 1 },
      },
    });

    if (claim.count === 0) {
      const current = await this.prisma.webhookReceipt.findUnique({
        where: { id: receiptId },
        select: { processingStatus: true },
      });

      return {
        receiptId,
        state:
          current?.processingStatus === 'processed'
            ? 'already-processed'
            : `claim-skipped-${current?.processingStatus ?? 'missing'}`,
      };
    }

    const claimed = await this.prisma.webhookReceipt.findUniqueOrThrow({
      where: { id: receiptId },
    });

    const existingOutbox = await this.prisma.outboxEvent.findMany({
      where: { receiptId: claimed.id },
      select: {
        id: true,
        status: true,
      },
    });

    if (existingOutbox.length > 0) {
      const replayableOutboxIds = existingOutbox
        .filter((event) => event.status !== 'dispatched')
        .map((event) => event.id);

      await this.prisma.webhookReceipt.update({
        where: { id: claimed.id },
        data: {
          processingStatus: 'processed',
          firstProcessedAt: claimed.firstProcessedAt ?? now,
          lastProcessedAt: now,
          claimedAt: null,
          claimExpiresAt: null,
          lastErrorCode: null,
          lastErrorMessage: null,
        },
      });

      for (const outboxEventId of replayableOutboxIds) {
        await this.enqueueOutboxDispatch(outboxEventId);
      }

      return {
        receiptId: claimed.id,
        state: 'reused-existing-outbox',
        outboxEvents: existingOutbox.length,
      };
    }

    try {
      const resolution = await this.resolveReceipt(claimed);
      const outboxSpecs = this.buildOutboxEvents(claimed, resolution);
      const createdEvents = await this.prisma.$transaction(async (tx) => {
        const created: Array<Pick<OutboxEvent, 'id' | 'eventName'>> = [];

        for (const event of outboxSpecs) {
          const createdEvent = await tx.outboxEvent.create({
            data: {
              organizationId: event.organizationId,
              receiptId: claimed.id,
              aggregateType: event.aggregateType,
              aggregateId: event.aggregateId,
              eventName: event.eventName,
              schemaVersion: event.schemaVersion,
              status: 'pending',
              partitionKey: event.partitionKey,
              causationId: claimed.id,
              correlationId: claimed.correlationId,
              payloadJson: event.payloadJson as Prisma.InputJsonValue,
              occurredAt: event.occurredAt,
            },
            select: {
              id: true,
              eventName: true,
            },
          });

          created.push(createdEvent);
        }

        await tx.webhookReceipt.update({
          where: { id: claimed.id },
          data: {
            organizationId: resolution.organizationId,
            integrationId: resolution.integrationId,
            channelProvider: resolution.channelProvider,
            processingStatus: 'processed',
            firstProcessedAt: claimed.firstProcessedAt ?? now,
            lastProcessedAt: now,
            claimedAt: null,
            claimExpiresAt: null,
            lastErrorCode: null,
            lastErrorMessage: null,
          },
        });

        return created;
      });

      for (const event of createdEvents) {
        await this.enqueueOutboxDispatch(event.id);
      }

      this.logger.log(
        `Processed webhook receipt ${claimed.id} with ${createdEvents.length} outbox event(s).`,
      );

      return {
        receiptId: claimed.id,
        state: 'processed',
        outboxEvents: createdEvents.length,
      };
    } catch (error) {
      const nextStatus = claimed.retryCount >= 8 ? 'dead_letter' : 'failed';

      await this.prisma.webhookReceipt.update({
        where: { id: claimed.id },
        data: {
          processingStatus: nextStatus,
          lastProcessedAt: now,
          claimedAt: null,
          claimExpiresAt: null,
          lastErrorCode: error instanceof Error ? error.name : 'processing_error',
          lastErrorMessage: truncateError(error),
        },
      });

      this.logger.error(
        `Failed to process webhook receipt ${claimed.id}: ${truncateError(error)}`,
      );

      throw error;
    }
  }

  async dispatchOutboxEvent(outboxEventId: string) {
    const event = await this.prisma.outboxEvent.findUnique({
      where: { id: outboxEventId },
    });

    if (!event) {
      return { outboxEventId, state: 'missing' };
    }

    if (event.status === 'dispatched') {
      return { outboxEventId, state: 'already-dispatched' };
    }

    const now = new Date();
    const claim = await this.prisma.outboxEvent.updateMany({
      where: {
        id: outboxEventId,
        OR: [
          {
            status: {
              in: ['pending', 'failed'],
            },
          },
          {
            status: 'dispatching',
            OR: [
              {
                claimExpiresAt: {
                  lte: now,
                },
              },
              {
                claimExpiresAt: null,
                claimedAt: {
                  lte: new Date(now.getTime() - 5 * 60 * 1000),
                },
              },
            ],
          },
        ],
      },
      data: {
        status: 'dispatching',
        claimedAt: now,
        claimExpiresAt: new Date(now.getTime() + 5 * 60 * 1000),
        attemptCount: { increment: 1 },
      },
    });

    if (claim.count === 0) {
      const current = await this.prisma.outboxEvent.findUnique({
        where: { id: outboxEventId },
        select: { status: true, eventName: true },
      });

      return {
        outboxEventId,
        state:
          current?.status === 'dispatched'
            ? 'already-dispatched'
            : `claim-skipped-${current?.status ?? 'missing'}`,
        eventName: current?.eventName,
      };
    }

    const claimed = await this.prisma.outboxEvent.findUniqueOrThrow({
      where: { id: outboxEventId },
    });

    try {
      if (claimed.eventName === 'billing.stripe.received') {
        await this.billingService.syncSubscriptionFromOutboxEvent(claimed.id);
      } else if (claimed.eventName === 'messaging.outbound.requested') {
        throw new Error('backend_outbound_provider_dispatch_not_configured');
      } else if (
        claimed.eventName === 'messaging.inbound.received' &&
        claimed.organizationId
      ) {
        await this.webhookMaterializationService.materializeInboundMessageOutboxEvent(
          claimed.id,
        );
      }

      await this.prisma.outboxEvent.update({
        where: { id: claimed.id },
        data: {
          status: 'dispatched',
          dispatchedAt: new Date(),
          claimedAt: null,
          claimExpiresAt: null,
          lastErrorCode: null,
          lastErrorMessage: null,
        },
      });

      return {
        outboxEventId: claimed.id,
        state: 'dispatched',
        eventName: claimed.eventName,
      };
    } catch (error) {
      const nextStatus = claimed.attemptCount >= 8 ? 'dead_letter' : 'failed';
      if (claimed.eventName === 'messaging.outbound.requested') {
        await this.markOutboundDeliveryFailure(claimed, error);
      }

      await this.prisma.outboxEvent.update({
        where: { id: claimed.id },
        data: {
          status: nextStatus,
          claimedAt: null,
          claimExpiresAt: null,
          lastErrorCode: error instanceof Error ? error.name : 'dispatch_error',
          lastErrorMessage: truncateError(error),
        },
      });

      this.logger.error(
        `Failed to dispatch outbox event ${claimed.id}: ${truncateError(error)}`,
      );

      throw error;
    }
  }

  private async markOutboundDeliveryFailure(event: OutboxEvent, error: unknown) {
    const payload = asRecord(event.payloadJson) ?? {};
    const conversationId = readString(payload.conversationId);
    const localMessageId = readString(payload.localProviderMessageId);
    if (!conversationId || !localMessageId) {
      return;
    }

    const message = await this.prisma.message.findUnique({
      where: {
        conversationId_providerMessageId: {
          conversationId,
          providerMessageId: localMessageId,
        },
      },
      include: {
        conversation: {
          select: {
            organizationId: true,
            provider: true,
          },
        },
      },
    });

    if (!message) {
      return;
    }

    await this.prisma.messageDelivery.upsert({
      where: {
        conversationId_localMessageId: {
          conversationId,
          localMessageId,
        },
      },
      create: {
        organizationId: event.organizationId ?? message.conversation.organizationId,
        conversationId,
        messageId: message.id,
        outboxEventId: event.id,
        provider: message.conversation.provider,
        localMessageId,
        status: 'failed',
        attemptCount: event.attemptCount,
        lastErrorCode: error instanceof Error ? error.name : 'dispatch_error',
        lastErrorMessage: truncateError(error),
        failedAt: new Date(),
      },
      update: {
        outboxEventId: event.id,
        status: 'failed',
        attemptCount: event.attemptCount,
        lastErrorCode: error instanceof Error ? error.name : 'dispatch_error',
        lastErrorMessage: truncateError(error),
        failedAt: new Date(),
      },
    });
  }

  private async enqueueReceiptProcessing(receiptId: string) {
    await this.webhookProcessQueue.add(
      JobNames.processWebhook,
      { receiptId },
      {
        jobId: `receipt-${receiptId}`,
      },
    );
  }

  private async enqueueOutboxDispatch(outboxEventId: string) {
    if (await this.deferOutboxDispatchForTenantBackpressure(outboxEventId)) {
      return;
    }

    await this.outboxDispatchQueue.add(
      JobNames.dispatchOutbox,
      { outboxEventId },
      {
        jobId: `outbox-${outboxEventId}`,
      },
    );
  }

  private async deferOutboxDispatchForTenantBackpressure(
    outboxEventId: string,
  ): Promise<boolean> {
    const backlogLimit = readPositiveIntegerEnv(
      'TENANT_OUTBOX_BACKPRESSURE_LIMIT',
      5000,
    );
    if (backlogLimit === 0) {
      return false;
    }

    const event = await this.prisma.outboxEvent.findUnique({
      where: { id: outboxEventId },
      select: {
        id: true,
        organizationId: true,
        status: true,
      },
    });

    if (!event?.organizationId || event.status !== 'pending') {
      return false;
    }

    const backlog = await this.prisma.outboxEvent.count({
      where: {
        organizationId: event.organizationId,
        id: { not: outboxEventId },
        status: { in: ['pending', 'dispatching'] },
      },
    });

    if (backlog < backlogLimit) {
      return false;
    }

    const delayMs = readPositiveIntegerEnv(
      'TENANT_OUTBOX_BACKPRESSURE_DELAY_MS',
      60_000,
    );
    const availableAt = new Date(Date.now() + delayMs);

    await this.prisma.outboxEvent.updateMany({
      where: {
        id: outboxEventId,
        status: 'pending',
      },
      data: {
        availableAt,
      },
    });

    this.logger.warn(
      JSON.stringify({
        event: 'tenant_outbox_backpressure',
        organizationId: event.organizationId,
        outboxEventId,
        backlog,
        backlogLimit,
        deferredUntil: availableAt.toISOString(),
      }),
    );

    return true;
  }

  private async resolveSignatureStatus(
    input: AcceptedWebhookInput,
  ): Promise<'valid' | 'invalid' | 'pending' | 'skipped'> {
    if (input.signatureStatus) {
      return input.signatureStatus;
    }

    if (input.provider === 'web_form') {
      return 'skipped';
    }

    if (input.provider === 'telegram') {
      return input.providerAccountKey ? 'pending' : 'invalid';
    }

    if (input.provider === 'stripe') {
      return this.verifyStripeSignature(input.rawBody, input.signatureHeader)
        ? 'valid'
        : 'invalid';
    }

    return (await this.verifyMetaSignature(input.rawBody, input.signatureHeader))
      ? 'valid'
      : 'invalid';
  }

  private verifyStripeSignature(
    rawBody?: string,
    signatureHeader?: string,
  ): boolean {
    const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!rawBody || !signatureHeader || !secret) {
      return false;
    }

    const timestamp = signatureHeader
      .split(',')
      .find((part) => part.startsWith('t='))
      ?.slice(2);
    const signature = signatureHeader
      .split(',')
      .find((part) => part.startsWith('v1='))
      ?.slice(3);
    if (!timestamp || !signature) {
      return false;
    }

    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${rawBody}`)
      .digest('hex');

    const left = Buffer.from(signature);
    const right = Buffer.from(expected);

    return left.length === right.length && crypto.timingSafeEqual(left, right);
  }

  private async verifyMetaSignature(
    rawBody?: string,
    signatureHeader?: string,
  ): Promise<boolean> {
    if (!rawBody || !signatureHeader?.startsWith('sha256=')) {
      return false;
    }

    const integrations = await this.prisma.integration.findMany({
      where: {
        OR: [{ provider: 'whatsapp' }, { provider: 'instagram' }],
      },
      select: {
        encryptedCredentials: true,
      },
    });

    const secrets = integrations
      .map((integration) =>
        readString(
          asRecord(this.decryptEncryptedJson(integration.encryptedCredentials))?.appSecret,
        ),
      )
      .filter((value): value is string => Boolean(value));

    if (secrets.length === 0) {
      return false;
    }

    return secrets.some((secret) => {
      const expected = `sha256=${crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex')}`;

      const left = Buffer.from(signatureHeader);
      const right = Buffer.from(expected);

      return left.length === right.length && crypto.timingSafeEqual(left, right);
    });
  }

  private decryptEncryptedJson(value?: string): Record<string, unknown> | undefined {
    if (!value?.startsWith('enc:v1.')) {
      return undefined;
    }

    const [prefix, iv, tag, ciphertext] = value.split('.');
    if (prefix !== 'enc:v1' || !iv || !tag || !ciphertext) {
      return undefined;
    }

    try {
      const key = crypto
        .createHash('sha256')
        .update(
          process.env.INTEGRATION_SECRET ??
            process.env.SESSION_SECRET ??
            'development-only-dental-recovery-integration-secret-change-me',
        )
        .digest();
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        key,
        this.base64UrlDecode(iv),
      );
      decipher.setAuthTag(this.base64UrlDecode(tag));
      const plaintext = Buffer.concat([
        decipher.update(this.base64UrlDecode(ciphertext)),
        decipher.final(),
      ]).toString('utf8');

      return asRecord(JSON.parse(plaintext));
    } catch {
      return undefined;
    }
  }

  private base64UrlDecode(value: string): Buffer {
    const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
    const padding =
      normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
    return Buffer.from(`${normalized}${padding}`, 'base64');
  }

  private extractOccurredAt(
    provider: AcceptedProvider,
    payload: Record<string, unknown>,
  ): string | undefined {
    if (provider === 'stripe') {
      const created = readNumber(payload.created);
      return created ? new Date(created * 1000).toISOString() : undefined;
    }

    if (provider === 'telegram') {
      const message =
        asRecord(payload.message) ??
        asRecord(payload.edited_message) ??
        asRecord(payload.channel_post);
      const created = readNumber(message?.date);
      return created ? new Date(created * 1000).toISOString() : undefined;
    }

    if (provider === 'meta') {
      const firstEntry = asRecord(asArray(payload.entry)[0]);
      const firstMessaging = asRecord(asArray(firstEntry?.messaging)[0]);
      const timestamp = readNumber(firstMessaging?.timestamp);
      if (timestamp) {
        return new Date(timestamp).toISOString();
      }

      const firstChange = asRecord(asArray(firstEntry?.changes)[0]);
      const firstMessage = asRecord(asArray(asRecord(firstChange?.value)?.messages)[0]);
      const unixSeconds = readString(firstMessage?.timestamp);
      return unixSeconds ? new Date(Number(unixSeconds) * 1000).toISOString() : undefined;
    }

    return new Date().toISOString();
  }

  private async resolveReceipt(
    receipt: WebhookReceipt,
  ): Promise<ReceiptResolution> {
    if (receipt.provider === 'stripe') {
      return this.resolveStripeReceipt(receipt);
    }

    if (receipt.provider === 'telegram') {
      return this.resolveTelegramReceipt(receipt);
    }

    if (receipt.provider === 'meta') {
      return this.resolveMetaReceipt(receipt);
    }

    return this.resolveWebFormReceipt(receipt);
  }

  private async resolveStripeReceipt(
    receipt: WebhookReceipt,
  ): Promise<ReceiptResolution> {
    const payload = asRecord(receipt.payloadJson) ?? {};
    const data = asRecord(payload.data) ?? {};
    const object = asRecord(data.object) ?? {};
    const metadata = asRecord(object.metadata) ?? {};
    const organizationId =
      readString(metadata.organization_id) ??
      readString(object.client_reference_id) ??
      readString(payload.account);

    return {
      organizationId,
      normalizedPayload: {
        receiptId: receipt.id,
        provider: 'stripe',
        externalEventId: receipt.externalEventId,
        eventType: readString(payload.type) ?? 'unknown',
        objectId: readString(object.id),
        organizationId,
        stripeObject: object,
      },
      unresolvedReason: organizationId ? undefined : 'organization_not_resolved',
    };
  }

  private async resolveWebFormReceipt(
    receipt: WebhookReceipt,
  ): Promise<ReceiptResolution> {
    const payload = asRecord(receipt.payloadJson) ?? {};
    const organizationId = readString(payload.organizationId);

    return {
      organizationId,
      channelProvider: 'web_form',
      normalizedPayload: {
        receiptId: receipt.id,
        provider: 'web_form',
        externalEventId: receipt.externalEventId,
        externalMessageId: receipt.externalEventId,
        externalThreadId:
          readString(payload.threadId) ??
          readString(payload.phone) ??
          receipt.externalEventId,
        externalContactId:
          readString(payload.phone) ??
          readString(payload.email) ??
          receipt.externalEventId,
        text: readString(payload.message) ?? 'New website inquiry',
        patientName: readString(payload.name) ?? 'Website visitor',
        patientPhone: readString(payload.phone),
        occurredAt: receipt.occurredAt?.toISOString(),
        organizationId,
      },
      unresolvedReason: organizationId ? undefined : 'organization_not_resolved',
    };
  }

  private async resolveTelegramReceipt(
    receipt: WebhookReceipt,
  ): Promise<ReceiptResolution> {
      const integration = await this.prisma.integration.findFirst({
        where: {
          provider: 'telegram',
          webhookSecret: receipt.providerAccountKey,
        },
        select: {
          id: true,
          organizationId: true,
          externalAccountId: true,
        },
      });
    const payload = asRecord(receipt.payloadJson) ?? {};
    const message =
      asRecord(payload.message) ??
      asRecord(payload.edited_message) ??
      asRecord(payload.channel_post) ??
      {};
    const from = asRecord(message.from) ?? {};
    const chat = asRecord(message.chat) ?? {};
    const externalThreadId = String(chat.id ?? from.id ?? receipt.externalEventId);
    const externalMessageId =
      readNumber(message.message_id) !== undefined
        ? `tg-msg-${readNumber(message.message_id)}`
        : receipt.externalEventId;

    return {
      organizationId: integration?.organizationId,
      integrationId: integration?.id,
      channelProvider: 'telegram',
        normalizedPayload: {
          receiptId: receipt.id,
          provider: 'telegram',
          externalEventId: receipt.externalEventId,
          externalMessageId,
          externalThreadId,
          externalContactId: externalThreadId,
          externalAccountId:
            integration?.externalAccountId || integration?.id || receipt.providerAccountKey,
          text: readString(message.text) ?? readString(message.caption),
          patientName:
            [readString(from.first_name), readString(from.last_name)]
            .filter(Boolean)
            .join(' ') ||
          readString(from.username) ||
          'Telegram patient',
        occurredAt: receipt.occurredAt?.toISOString(),
        organizationId: integration?.organizationId,
      },
      unresolvedReason: integration ? undefined : 'integration_not_resolved',
    };
  }

  private async resolveMetaReceipt(
    receipt: WebhookReceipt,
  ): Promise<ReceiptResolution> {
    const payload = asRecord(receipt.payloadJson) ?? {};
    const firstEntry = asRecord(asArray(payload.entry)[0]) ?? {};
    const firstChange = asRecord(asArray(firstEntry.changes)[0]) ?? {};
    const changeValue = asRecord(firstChange.value) ?? {};
    const metadata = asRecord(changeValue.metadata) ?? {};
    const phoneNumberId = readString(metadata.phone_number_id);
    const pageId = readString(firstEntry.id);

    if (phoneNumberId) {
      const integration = await this.prisma.integration.findFirst({
        where: {
          provider: 'whatsapp',
          externalAccountId: phoneNumberId,
        },
        select: {
          id: true,
          organizationId: true,
          externalAccountId: true,
        },
      });

      const message = asRecord(asArray(changeValue.messages)[0]) ?? {};
      const contact = asRecord(asArray(changeValue.contacts)[0]) ?? {};

      return {
        organizationId: integration?.organizationId,
        integrationId: integration?.id,
        channelProvider: 'whatsapp',
        normalizedPayload: {
          receiptId: receipt.id,
          provider: 'whatsapp',
          externalEventId: receipt.externalEventId,
          externalMessageId: readString(message.id) ?? receipt.externalEventId,
          externalThreadId: readString(message.from) ?? receipt.externalEventId,
          externalContactId: readString(message.from) ?? receipt.externalEventId,
          externalAccountId:
            integration?.externalAccountId || integration?.id || phoneNumberId,
          text: readString(asRecord(message.text)?.body),
          patientName:
            readString(asRecord(contact.profile)?.name) ?? 'WhatsApp patient',
          patientPhone: readString(message.from),
          occurredAt: receipt.occurredAt?.toISOString(),
          organizationId: integration?.organizationId,
        },
        unresolvedReason: integration ? undefined : 'integration_not_resolved',
      };
    }

    const integration = pageId
      ? await this.prisma.integration.findFirst({
          where: {
            provider: 'instagram',
            externalAccountId: pageId,
          },
          select: {
            id: true,
            organizationId: true,
            externalAccountId: true,
          },
        })
      : null;

    const messaging = asRecord(asArray(firstEntry.messaging)[0]) ?? {};
    const message = asRecord(messaging.message) ?? {};

    return {
      organizationId: integration?.organizationId,
      integrationId: integration?.id,
      channelProvider: 'instagram',
      normalizedPayload: {
        receiptId: receipt.id,
        provider: 'instagram',
        externalEventId: receipt.externalEventId,
        externalMessageId: readString(message.mid) ?? receipt.externalEventId,
        externalThreadId:
          readString(asRecord(messaging.sender)?.id) ?? receipt.externalEventId,
        externalContactId:
          readString(asRecord(messaging.sender)?.id) ?? receipt.externalEventId,
        externalAccountId: integration?.externalAccountId || integration?.id || pageId,
        text: readString(message.text),
        patientName: 'Instagram patient',
        occurredAt: receipt.occurredAt?.toISOString(),
        organizationId: integration?.organizationId,
      },
      unresolvedReason: integration ? undefined : 'integration_not_resolved',
    };
  }

  private buildOutboxEvents(
    receipt: WebhookReceipt,
    resolution: ReceiptResolution,
  ): Array<{
    organizationId?: string;
    aggregateType: string;
    aggregateId: string;
    eventName: string;
    schemaVersion: number;
    partitionKey: string;
    payloadJson: Record<string, unknown>;
    occurredAt: Date;
  }> {
    const occurredAt = receipt.occurredAt ?? receipt.receivedAt;

    if (!resolution.organizationId) {
      return [
        {
          organizationId: undefined,
          aggregateType: 'webhook_receipt',
          aggregateId: receipt.id,
          eventName: 'webhook.unresolved.received',
          schemaVersion: 1,
          partitionKey: receipt.provider,
          payloadJson: {
            receiptId: receipt.id,
            provider: receipt.provider,
            externalEventId: receipt.externalEventId,
            providerAccountKey: receipt.providerAccountKey,
            reason: resolution.unresolvedReason ?? 'unresolved',
            normalizedPayload: resolution.normalizedPayload,
          },
          occurredAt,
        },
      ];
    }

    if (receipt.provider === 'stripe') {
      return [
        {
          organizationId: resolution.organizationId,
          aggregateType: 'organization_billing',
          aggregateId: resolution.organizationId,
          eventName: 'billing.stripe.received',
          schemaVersion: 1,
          partitionKey: resolution.organizationId,
          payloadJson: resolution.normalizedPayload,
          occurredAt,
        },
      ];
    }

    const normalized = resolution.normalizedPayload as unknown as InboundMessagePayload;
    const aggregateId =
      `${resolution.channelProvider ?? 'channel'}:${resolution.organizationId}:` +
      `${normalized.externalThreadId ?? normalized.externalContactId ?? receipt.externalEventId}`;

    return [
      {
        organizationId: resolution.organizationId,
        aggregateType: 'external_conversation',
        aggregateId,
        eventName: 'messaging.inbound.received',
        schemaVersion: 1,
        partitionKey: aggregateId,
        payloadJson: {
          ...resolution.normalizedPayload,
          integrationId: resolution.integrationId,
          organizationId: resolution.organizationId,
          channelProvider: resolution.channelProvider,
        },
        occurredAt,
      },
    ];
  }
}
