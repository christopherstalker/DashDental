import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma/prisma.service';
import { WebhooksService } from './webhooks.service';

const RECEIVED_BACKLOG_MS = 60 * 1000;
const CLAIM_TIMEOUT_MS = 5 * 60 * 1000;
const FAILED_RETRY_DELAY_MS = 60 * 1000;
const DEFAULT_SWEEP_LIMIT = 20;
const RECOVERY_LEASE_KEY = 'runtime.recovery.sweep';
const RECOVERY_LEASE_TTL_MS = 2 * 60 * 1000;

function dedupeIds(values: string[]): string[] {
  return [...new Set(values)];
}

@Injectable()
export class WebhookRecoveryService {
  private readonly logger = new Logger(WebhookRecoveryService.name);
  private readonly leaseOwnerId = `recovery-${process.pid}-${randomUUID()}`;

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhooksService: WebhooksService,
  ) {}

  async getRecoveryHealthSnapshot() {
    const now = new Date();
    const staleReceivedBefore = new Date(now.getTime() - RECEIVED_BACKLOG_MS);
    const expiredClaimBefore = new Date(now.getTime() - CLAIM_TIMEOUT_MS);
    const retryableFailureBefore = new Date(now.getTime() - FAILED_RETRY_DELAY_MS);

    const [
      receivedBacklog,
      processingExpired,
      retryableFailedReceipts,
      deadLetterReceipts,
      pendingBacklog,
      dispatchExpired,
      retryableFailedOutbox,
      deadLetterOutbox,
    ] = await Promise.all([
      this.prisma.webhookReceipt.count({
        where: {
          processingStatus: 'received',
          receivedAt: { lte: staleReceivedBefore },
        },
      }),
      this.prisma.webhookReceipt.count({
        where: {
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
                lte: expiredClaimBefore,
              },
            },
          ],
        },
      }),
      this.prisma.webhookReceipt.count({
        where: {
          processingStatus: 'failed',
          retryCount: { lt: 8 },
          OR: [
            {
              lastProcessedAt: {
                lte: retryableFailureBefore,
              },
            },
            {
              lastProcessedAt: null,
              receivedAt: {
                lte: retryableFailureBefore,
              },
            },
          ],
        },
      }),
      this.prisma.webhookReceipt.count({
        where: {
          processingStatus: 'dead_letter',
        },
      }),
      this.prisma.outboxEvent.count({
        where: {
          status: 'pending',
          availableAt: { lte: staleReceivedBefore },
        },
      }),
      this.prisma.outboxEvent.count({
        where: {
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
                lte: expiredClaimBefore,
              },
            },
          ],
        },
      }),
      this.prisma.outboxEvent.count({
        where: {
          status: 'failed',
          attemptCount: { lt: 8 },
          updatedAt: {
            lte: retryableFailureBefore,
          },
        },
      }),
      this.prisma.outboxEvent.count({
        where: {
          status: 'dead_letter',
        },
      }),
    ]);

    return {
      checkedAt: now.toISOString(),
      receipts: {
        receivedBacklog,
        processingExpired,
        retryableFailed: retryableFailedReceipts,
        deadLetter: deadLetterReceipts,
        recoverable:
          receivedBacklog + processingExpired + retryableFailedReceipts,
      },
      outbox: {
        pendingBacklog,
        dispatchExpired,
        retryableFailed: retryableFailedOutbox,
        deadLetter: deadLetterOutbox,
        recoverable: pendingBacklog + dispatchExpired + retryableFailedOutbox,
      },
    };
  }

  async runRecoverySweep(limit = DEFAULT_SWEEP_LIMIT) {
    const lease = await this.acquireLease();
    if (!lease.acquired) {
      return {
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: 0,
        skipped: true,
        reason: 'lease-held',
        leaseOwnerId: lease.ownerId,
        scanned: {
          receipts: 0,
          outbox: 0,
        },
        replayed: {
          receipts: 0,
          outbox: 0,
        },
        failures: {
          receipts: [],
          outbox: [],
        },
      };
    }

    const startedAt = new Date();
    try {
      const receiptIds = await this.findRecoverableReceiptIds(limit);
      const outboxIds = await this.findRecoverableOutboxIds(limit);
      const replayedReceipts: string[] = [];
      const replayedOutbox: string[] = [];
      const failedReceipts: Array<{ id: string; error: string }> = [];
      const failedOutbox: Array<{ id: string; error: string }> = [];

      for (const receiptId of receiptIds) {
        try {
          await this.webhooksService.replayReceipt(receiptId, {
            source: 'recovery_sweep',
            reason: 'recoverable_receipt',
          });
          replayedReceipts.push(receiptId);
        } catch (error) {
          failedReceipts.push({
            id: receiptId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      for (const outboxEventId of outboxIds) {
        try {
          await this.webhooksService.replayOutboxEvent(outboxEventId, {
            source: 'recovery_sweep',
            reason: 'recoverable_outbox_event',
          });
          replayedOutbox.push(outboxEventId);
        } catch (error) {
          failedOutbox.push({
            id: outboxEventId,
            error: error instanceof Error ? error.message : String(error),
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
        scanned: {
          receipts: receiptIds.length,
          outbox: outboxIds.length,
        },
        replayed: {
          receipts: replayedReceipts.length,
          outbox: replayedOutbox.length,
        },
        failures: {
          receipts: failedReceipts,
          outbox: failedOutbox,
        },
      };

      if (replayedReceipts.length > 0 || replayedOutbox.length > 0) {
        this.logger.warn(
          `Recovery sweep replayed ${replayedReceipts.length} receipt(s) and ${replayedOutbox.length} outbox event(s).`,
        );
      }

      if (failedReceipts.length > 0 || failedOutbox.length > 0) {
        this.logger.error(
          `Recovery sweep encountered ${failedReceipts.length + failedOutbox.length} replay failure(s).`,
        );
      }

      return summary;
    } finally {
      await this.releaseLease();
    }
  }

  private async acquireLease() {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + RECOVERY_LEASE_TTL_MS);

    await this.prisma.runtimeLease.upsert({
      where: {
        key: RECOVERY_LEASE_KEY,
      },
      update: {},
      create: {
        key: RECOVERY_LEASE_KEY,
        ownerId: '',
        expiresAt: new Date(0),
      },
    });

    const claimed = await this.prisma.runtimeLease.updateMany({
      where: {
        key: RECOVERY_LEASE_KEY,
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
        key: RECOVERY_LEASE_KEY,
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
        key: RECOVERY_LEASE_KEY,
        ownerId: this.leaseOwnerId,
      },
      data: {
        expiresAt: new Date(0),
      },
    });
  }

  private async findRecoverableReceiptIds(limit: number): Promise<string[]> {
    const now = new Date();
    const staleReceivedBefore = new Date(now.getTime() - RECEIVED_BACKLOG_MS);
    const expiredClaimBefore = new Date(now.getTime() - CLAIM_TIMEOUT_MS);
    const retryableFailureBefore = new Date(now.getTime() - FAILED_RETRY_DELAY_MS);

    const [received, processing, failed] = await Promise.all([
      this.prisma.webhookReceipt.findMany({
        where: {
          processingStatus: 'received',
          receivedAt: { lte: staleReceivedBefore },
        },
        orderBy: { receivedAt: 'asc' },
        take: limit,
        select: { id: true },
      }),
      this.prisma.webhookReceipt.findMany({
        where: {
          processingStatus: 'processing',
          OR: [
            {
              claimExpiresAt: { lte: now },
            },
            {
              claimExpiresAt: null,
              claimedAt: {
                lte: expiredClaimBefore,
              },
            },
          ],
        },
        orderBy: { claimedAt: 'asc' },
        take: limit,
        select: { id: true },
      }),
      this.prisma.webhookReceipt.findMany({
        where: {
          processingStatus: 'failed',
          retryCount: { lt: 8 },
          OR: [
            {
              lastProcessedAt: {
                lte: retryableFailureBefore,
              },
            },
            {
              lastProcessedAt: null,
              receivedAt: {
                lte: retryableFailureBefore,
              },
            },
          ],
        },
        orderBy: { lastProcessedAt: 'asc' },
        take: limit,
        select: { id: true },
      }),
    ]);

    return dedupeIds(
      [...received, ...processing, ...failed].map((receipt) => receipt.id),
    ).slice(0, limit);
  }

  private async findRecoverableOutboxIds(limit: number): Promise<string[]> {
    const now = new Date();
    const stalePendingBefore = new Date(now.getTime() - RECEIVED_BACKLOG_MS);
    const expiredClaimBefore = new Date(now.getTime() - CLAIM_TIMEOUT_MS);
    const retryableFailureBefore = new Date(now.getTime() - FAILED_RETRY_DELAY_MS);

    const [pending, dispatching, failed] = await Promise.all([
      this.prisma.outboxEvent.findMany({
        where: {
          status: 'pending',
          availableAt: { lte: stalePendingBefore },
        },
        orderBy: { availableAt: 'asc' },
        take: limit,
        select: { id: true },
      }),
      this.prisma.outboxEvent.findMany({
        where: {
          status: 'dispatching',
          OR: [
            {
              claimExpiresAt: { lte: now },
            },
            {
              claimExpiresAt: null,
              claimedAt: { lte: expiredClaimBefore },
            },
          ],
        },
        orderBy: { claimedAt: 'asc' },
        take: limit,
        select: { id: true },
      }),
      this.prisma.outboxEvent.findMany({
        where: {
          status: 'failed',
          attemptCount: { lt: 8 },
          updatedAt: { lte: retryableFailureBefore },
        },
        orderBy: { updatedAt: 'asc' },
        take: limit,
        select: { id: true },
      }),
    ]);

    return dedupeIds(
      [...pending, ...dispatching, ...failed].map((event) => event.id),
    ).slice(0, limit);
  }
}
