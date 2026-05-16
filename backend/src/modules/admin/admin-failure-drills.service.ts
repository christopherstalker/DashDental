import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Provider } from '@prisma/client';
import { PrismaService } from '@app/infra/prisma/prisma.service';
import { AuditService } from '@app/modules/audit/audit.service';
import { WebhooksService } from '@app/modules/webhooks/webhooks.service';

const DEFAULT_DRILL_PHONE = '+15550199000';

export type FailureDrillScenario =
  | 'telegram.duplicate_inbound'
  | 'telegram.late_inbound'
  | 'telegram.unresolved_secret'
  | 'meta.whatsapp_unresolved_account'
  | 'stripe.unresolved_subscription';

export interface DrillActor {
  userId: string;
  ip?: string;
}

export interface RunFailureDrillInput {
  scenario: string;
  organizationId?: string;
  actor?: DrillActor;
}

export interface DrillReceiptResult {
  label: string;
  receiptId: string;
  duplicate: boolean;
  accepted: boolean;
  status: string;
  correlationId: string;
  processResult?: unknown;
  dispatchResults?: unknown[];
}

const DRILL_CATALOG: Array<{
  scenario: FailureDrillScenario;
  provider: 'telegram' | 'meta' | 'stripe';
  title: string;
  expectedSignal: string;
  destructive: false;
}> = [
  {
    scenario: 'telegram.duplicate_inbound',
    provider: 'telegram',
    title: 'Telegram duplicate inbound webhook',
    expectedSignal: 'Second delivery reuses the same receipt and does not create another message.',
    destructive: false,
  },
  {
    scenario: 'telegram.late_inbound',
    provider: 'telegram',
    title: 'Telegram late inbound webhook',
    expectedSignal: 'Receipt is materialized with occurred_at older than received_at and appears in late receipt diagnostics.',
    destructive: false,
  },
  {
    scenario: 'telegram.unresolved_secret',
    provider: 'telegram',
    title: 'Telegram webhook with unknown secret',
    expectedSignal: 'Receipt is processed as unresolved and grouped under provider gap diagnostics.',
    destructive: false,
  },
  {
    scenario: 'meta.whatsapp_unresolved_account',
    provider: 'meta',
    title: 'WhatsApp webhook for unknown phone number ID',
    expectedSignal: 'Meta receipt is processed as unresolved and grouped by provider account key.',
    destructive: false,
  },
  {
    scenario: 'stripe.unresolved_subscription',
    provider: 'stripe',
    title: 'Stripe subscription event without tenant metadata',
    expectedSignal: 'Stripe receipt is processed as unresolved instead of mutating billing state.',
    destructive: false,
  },
];

function isFailureDrillScenario(value: string): value is FailureDrillScenario {
  return DRILL_CATALOG.some((item) => item.scenario === value);
}

function unixSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

@Injectable()
export class AdminFailureDrillsService {
  private readonly logger = new Logger(AdminFailureDrillsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly webhooksService: WebhooksService,
  ) {}

  getCatalog() {
    return {
      generatedAt: new Date().toISOString(),
      scenarios: DRILL_CATALOG,
    };
  }

  async runDrill(input: RunFailureDrillInput) {
    if (!isFailureDrillScenario(input.scenario)) {
      throw new BadRequestException('Unknown failure drill scenario.');
    }

    const drillRunId = `drill-${randomUUID()}`;
    const startedAt = new Date();

    const result =
      input.scenario === 'telegram.duplicate_inbound'
        ? await this.runTelegramDuplicateInbound(input.organizationId, drillRunId)
        : input.scenario === 'telegram.late_inbound'
          ? await this.runTelegramLateInbound(input.organizationId, drillRunId)
          : input.scenario === 'telegram.unresolved_secret'
            ? await this.runTelegramUnresolvedSecret(drillRunId)
            : input.scenario === 'meta.whatsapp_unresolved_account'
              ? await this.runMetaWhatsappUnresolvedAccount(drillRunId)
              : await this.runStripeUnresolvedSubscription(drillRunId);

    const completedAt = new Date();
    const response = {
      drillRunId,
      scenario: input.scenario,
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      durationMs: completedAt.getTime() - startedAt.getTime(),
      ...result,
    };

    if (input.actor) {
      await this.appendAuditSafely({
        organizationId: result.organizationId ?? undefined,
        actorUserId: input.actor.userId,
        action: 'admin_ran_failure_drill',
        entityType: 'runtime_failure_drill',
        entityId: drillRunId,
        ip: input.actor.ip,
        metadataJson: response,
      });
    }

    return response;
  }

  private async runTelegramDuplicateInbound(
    organizationId: string | undefined,
    drillRunId: string,
  ) {
    const integration = await this.getIntegrationForDrill('telegram', organizationId);
    const occurredAt = new Date();
    const updateId = this.buildNumericDrillId();
    const payload = this.buildTelegramPayload({
      updateId,
      messageId: updateId,
      occurredAt,
      text: `Duplicate delivery drill ${drillRunId}`,
    });

    const firstReceipt = await this.acceptAndProcess({
      label: 'first-delivery',
      provider: 'telegram',
      providerEventId: String(updateId),
      providerAccountKey: integration.webhookSecret,
      payload,
      signatureStatus: 'valid',
    });
    const duplicate = await this.webhooksService.acceptWebhook({
      provider: 'telegram',
      providerEventId: String(updateId),
      providerAccountKey: integration.webhookSecret,
      payload,
      signatureStatus: 'valid',
      correlationId: drillRunId,
    });

    return {
      organizationId: integration.organizationId,
      provider: 'telegram',
      receipts: [
        firstReceipt,
        {
          label: 'duplicate-delivery',
          receiptId: duplicate.receiptId,
          duplicate: duplicate.duplicate,
          accepted: duplicate.accepted,
          status: duplicate.status,
          correlationId: duplicate.correlationId,
        },
      ],
      assertions: {
        duplicateSuppressed: duplicate.duplicate && duplicate.receiptId === firstReceipt.receiptId,
      },
      nextActions: [
        'Open tenant debug timeline and confirm there is one receipt and one materialized message for this provider event.',
      ],
    };
  }

  private async runTelegramLateInbound(
    organizationId: string | undefined,
    drillRunId: string,
  ) {
    const integration = await this.getIntegrationForDrill('telegram', organizationId);
    const occurredAt = new Date(Date.now() - 17 * 60 * 1000);
    const updateId = this.buildNumericDrillId();
    const receipt = await this.acceptAndProcess({
      label: 'late-delivery',
      provider: 'telegram',
      providerEventId: String(updateId),
      providerAccountKey: integration.webhookSecret,
      payload: this.buildTelegramPayload({
        updateId,
        messageId: updateId,
        occurredAt,
        text: `Late delivery drill ${drillRunId}`,
      }),
      signatureStatus: 'valid',
    });

    return {
      organizationId: integration.organizationId,
      provider: 'telegram',
      receipts: [receipt],
      assertions: {
        lateReceiptExpected: true,
        delayMinutes: Math.floor((Date.now() - occurredAt.getTime()) / 60_000),
      },
      nextActions: [
        'Run reconciliation snapshot and confirm this receipt is visible in late receipt diagnostics.',
      ],
    };
  }

  private async runTelegramUnresolvedSecret(drillRunId: string) {
    const updateId = this.buildNumericDrillId();
    const receipt = await this.acceptAndProcess({
      label: 'unknown-secret',
      provider: 'telegram',
      providerEventId: String(updateId),
      providerAccountKey: `unknown-secret-${drillRunId}`,
      payload: this.buildTelegramPayload({
        updateId,
        messageId: updateId,
        occurredAt: new Date(),
        text: `Unresolved Telegram secret drill ${drillRunId}`,
      }),
      signatureStatus: 'valid',
    });

    return {
      organizationId: null,
      provider: 'telegram',
      receipts: [receipt],
      assertions: {
        unresolvedExpected: true,
      },
      nextActions: [
        'Open platform reconciliation provider gaps and confirm telegram_secret_not_mapped_to_integration.',
      ],
    };
  }

  private async runMetaWhatsappUnresolvedAccount(drillRunId: string) {
    const phoneNumberId = `wa-unknown-${drillRunId}`;
    const eventId = `wamid.${randomUUID()}`;
    const receipt = await this.acceptAndProcess({
      label: 'unknown-whatsapp-account',
      provider: 'meta',
      providerEventId: eventId,
      providerAccountKey: phoneNumberId,
      payload: this.buildWhatsAppPayload({
        phoneNumberId,
        messageId: eventId,
        occurredAt: new Date(),
        text: `Unknown WhatsApp account drill ${drillRunId}`,
      }),
      signatureStatus: 'skipped',
    });

    return {
      organizationId: null,
      provider: 'meta',
      receipts: [receipt],
      assertions: {
        unresolvedExpected: true,
      },
      nextActions: [
        'Open platform reconciliation provider gaps and confirm meta_account_not_mapped_to_whatsapp_or_instagram.',
      ],
    };
  }

  private async runStripeUnresolvedSubscription(drillRunId: string) {
    const eventId = `evt_drill_${randomUUID().replaceAll('-', '')}`;
    const receipt = await this.acceptAndProcess({
      label: 'stripe-without-tenant',
      provider: 'stripe',
      providerEventId: eventId,
      providerAccountKey: 'stripe-platform',
      payload: {
        id: eventId,
        object: 'event',
        type: 'customer.subscription.updated',
        created: unixSeconds(new Date()),
        data: {
          object: {
            id: `sub_drill_${randomUUID().replaceAll('-', '')}`,
            object: 'subscription',
            status: 'active',
            metadata: {},
          },
        },
      },
      signatureStatus: 'skipped',
    });

    return {
      organizationId: null,
      provider: 'stripe',
      receipts: [receipt],
      assertions: {
        unresolvedExpected: true,
      },
      nextActions: [
        'Open platform reconciliation provider gaps and confirm stripe_event_missing_organization_metadata.',
      ],
    };
  }

  private async acceptAndProcess(input: {
    label: string;
    provider: 'telegram' | 'meta' | 'stripe';
    providerEventId: string;
    providerAccountKey: string;
    payload: Record<string, unknown>;
    signatureStatus: 'valid' | 'skipped';
  }): Promise<DrillReceiptResult> {
    const receipt = await this.webhooksService.acceptWebhook({
      provider: input.provider,
      providerEventId: input.providerEventId,
      providerAccountKey: input.providerAccountKey,
      payload: input.payload,
      signatureStatus: input.signatureStatus,
      correlationId: `drill-${input.providerEventId}`,
    });

    const processResult = await this.webhooksService.processWebhookReceipt(receipt.receiptId);
    const outboxEvents = await this.prisma.outboxEvent.findMany({
      where: { receiptId: receipt.receiptId },
      select: {
        id: true,
        status: true,
        eventName: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    const dispatchResults: unknown[] = [];

    for (const event of outboxEvents) {
      if (event.status === 'dispatched') {
        dispatchResults.push({
          outboxEventId: event.id,
          eventName: event.eventName,
          state: 'already-dispatched',
        });
        continue;
      }

      dispatchResults.push(await this.webhooksService.dispatchOutboxEvent(event.id));
    }

    return {
      label: input.label,
      receiptId: receipt.receiptId,
      duplicate: receipt.duplicate,
      accepted: receipt.accepted,
      status: receipt.status,
      correlationId: receipt.correlationId,
      processResult,
      dispatchResults,
    };
  }

  private async getIntegrationForDrill(provider: Provider, organizationId?: string) {
    const integration = await this.prisma.integration.findFirst({
      where: {
        provider,
        ...(organizationId ? { organizationId } : {}),
      },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
      select: {
        id: true,
        organizationId: true,
        provider: true,
        webhookSecret: true,
      },
    });

    if (!integration) {
      throw new NotFoundException(
        organizationId
          ? `No ${provider} integration exists for organization ${organizationId}.`
          : `No ${provider} integration exists for drill execution.`,
      );
    }

    if (!integration.webhookSecret.trim()) {
      throw new BadRequestException(
        `The ${provider} integration has no webhook secret to run a resolved drill.`,
      );
    }

    return integration;
  }

  private buildNumericDrillId() {
    return Date.now() + Math.floor(Math.random() * 1000);
  }

  private buildTelegramPayload(input: {
    updateId: number;
    messageId: number;
    occurredAt: Date;
    text: string;
  }) {
    const externalUserId = 9_900_000 + Math.floor(Math.random() * 10_000);

    return {
      update_id: input.updateId,
      message: {
        message_id: input.messageId,
        date: unixSeconds(input.occurredAt),
        text: input.text,
        from: {
          id: externalUserId,
          is_bot: false,
          first_name: 'Failure',
          last_name: 'Drill',
          username: `drill_${externalUserId}`,
        },
        chat: {
          id: externalUserId,
          type: 'private',
          first_name: 'Failure',
          last_name: 'Drill',
        },
      },
    };
  }

  private buildWhatsAppPayload(input: {
    phoneNumberId: string;
    messageId: string;
    occurredAt: Date;
    text: string;
  }) {
    const externalContactId = DEFAULT_DRILL_PHONE.replace('+', '');

    return {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: input.phoneNumberId,
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  phone_number_id: input.phoneNumberId,
                  display_phone_number: '15550190000',
                },
                contacts: [
                  {
                    wa_id: externalContactId,
                    profile: {
                      name: 'Failure Drill',
                    },
                  },
                ],
                messages: [
                  {
                    id: input.messageId,
                    from: externalContactId,
                    timestamp: String(unixSeconds(input.occurredAt)),
                    type: 'text',
                    text: {
                      body: input.text,
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
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
