import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@app/infra/prisma/prisma.service';
import { ProjectionsService } from '@app/modules/projections/projections.service';

type MessagingProvider = 'telegram' | 'whatsapp' | 'instagram' | 'web_form';

interface InboundMessagingPayload {
  organizationId?: string;
  integrationId?: string;
  channelProvider?: MessagingProvider;
  externalAccountId?: string;
  externalEventId?: string;
  externalMessageId?: string;
  externalThreadId?: string;
  externalContactId?: string;
  text?: string;
  patientName?: string;
  patientPhone?: string;
  occurredAt?: string;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

@Injectable()
export class WebhookMaterializationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectionsService: ProjectionsService,
  ) {}

  async materializeInboundMessageOutboxEvent(outboxEventId: string) {
    const outboxEvent = await this.prisma.outboxEvent.findUnique({
      where: { id: outboxEventId },
    });
    if (!outboxEvent) {
      return { outboxEventId, state: 'missing-outbox-event' };
    }

    const payload = (asRecord(outboxEvent.payloadJson) ?? {}) as InboundMessagingPayload;
    const organizationId = readString(payload.organizationId);
    const provider = payload.channelProvider;
    const externalMessageId = readString(payload.externalMessageId);
    const externalThreadId = readString(payload.externalThreadId);
    const externalContactId = readString(payload.externalContactId);

    if (!organizationId || !provider || !externalMessageId || !externalThreadId || !externalContactId) {
      return {
        outboxEventId,
        state: 'invalid-payload',
      };
    }

    const occurredAt = payload.occurredAt ? new Date(payload.occurredAt) : outboxEvent.occurredAt;
    const safeOccurredAt = Number.isNaN(occurredAt.getTime())
      ? outboxEvent.occurredAt
      : occurredAt;
    const displayName = payload.patientName?.trim() || 'Patient';
    const externalAccountId =
      readString(payload.externalAccountId) ?? readString(payload.integrationId) ?? '';
    const inboundText = payload.text?.trim() || 'Inbound message received';

    const result = await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.findUniqueOrThrow({
        where: { id: organizationId },
        select: {
          id: true,
          averagePatientValue: true,
        },
      });

      const assignedMembership = await tx.membership.findFirst({
        where: {
          organizationId,
          status: 'active',
        },
        orderBy: [{ role: 'desc' }, { createdAt: 'asc' }],
        select: {
          userId: true,
        },
      });

      const existingIdentity = await tx.contactIdentity.findFirst({
        where: {
          organizationId,
          provider,
          externalAccountId,
          externalContactId,
        },
        include: {
          contact: true,
        },
      });

      let contactId = existingIdentity?.contactId;
      if (!existingIdentity) {
        const contact = await tx.contact.create({
          data: {
            organizationId,
            displayName,
            phoneE164: payload.patientPhone?.trim() || undefined,
            firstSeenAt: safeOccurredAt,
            lastSeenAt: safeOccurredAt,
          },
          select: { id: true },
        });
        contactId = contact.id;

        await tx.contactIdentity.create({
          data: {
            organizationId,
            contactId,
            provider,
            externalAccountId,
            externalContactId,
            externalThreadId,
            firstSeenAt: safeOccurredAt,
            lastSeenAt: safeOccurredAt,
          },
        });
      } else {
        await tx.contactIdentity.update({
          where: { id: existingIdentity.id },
          data: {
            externalThreadId,
            lastSeenAt: safeOccurredAt,
          },
        });

        await tx.contact.update({
          where: { id: existingIdentity.contactId },
          data: {
            displayName:
              existingIdentity.contact.displayName === 'Patient'
                ? displayName
                : existingIdentity.contact.displayName,
            phoneE164:
              existingIdentity.contact.phoneE164 ?? payload.patientPhone?.trim() ?? undefined,
            lastSeenAt: safeOccurredAt,
          },
        });
      }

      let lead = await tx.lead.findFirst({
        where: {
          organizationId,
          source: provider,
          providerContactId: externalContactId,
        },
      });

      if (!lead) {
        lead = await tx.lead.create({
          data: {
            organizationId,
            contactId,
            name: displayName,
            phone: payload.patientPhone?.trim() || undefined,
            source: provider,
            status: 'new',
            assignedTo: assignedMembership?.userId,
            providerContactId: externalContactId,
            firstMessageAt: safeOccurredAt,
            estimatedValue: organization.averagePatientValue,
          },
        });
      } else {
        const nextLeadStatus =
          lead.status === 'booked' || lead.status === 'lost' ? 'new' : lead.status;

        await tx.lead.update({
          where: { id: lead.id },
          data: {
            contactId: lead.contactId ?? contactId,
            name: lead.name || displayName,
            phone: lead.phone ?? payload.patientPhone?.trim() ?? undefined,
            status: nextLeadStatus,
            assignedTo: lead.assignedTo ?? assignedMembership?.userId,
            updatedAt: safeOccurredAt,
          },
        });

        if (nextLeadStatus !== lead.status) {
          await tx.leadStatusHistory.create({
            data: {
              leadId: lead.id,
              fromStatus: lead.status,
              toStatus: nextLeadStatus,
              changedBy: assignedMembership?.userId ?? 'system-reopen',
              reason: 'Reopened by inbound message',
              createdAt: safeOccurredAt,
            },
          });
        }
      }

      let conversation = await tx.conversation.findFirst({
        where: {
          organizationId,
          provider,
          providerThreadId: externalThreadId,
        },
      });

      if (!conversation) {
        conversation = await tx.conversation.create({
          data: {
            organizationId,
            leadId: lead.id,
            contactId,
            provider,
            providerThreadId: externalThreadId,
            status: 'open',
            lastMessageAt: safeOccurredAt,
          },
        });
      } else {
        await tx.conversation.update({
          where: { id: conversation.id },
          data: {
            leadId: conversation.leadId ?? lead.id,
            contactId: conversation.contactId ?? contactId,
            status: 'open',
            lastMessageAt: safeOccurredAt,
          },
        });
      }

      const existingMessage = await tx.message.findFirst({
        where: {
          conversationId: conversation.id,
          providerMessageId: externalMessageId,
        },
        select: {
          id: true,
        },
      });

      if (!existingMessage) {
        await tx.message.create({
          data: {
            conversationId: conversation.id,
            direction: 'inbound',
            senderType: 'patient',
            providerMessageId: externalMessageId,
            text: inboundText,
            payloadJson: outboxEvent.payloadJson as Prisma.InputJsonValue,
            sentAt: safeOccurredAt,
          },
        });
      }

      if (payload.integrationId) {
        await tx.integration.update({
          where: { id: payload.integrationId },
          data: {
            status: 'active',
            lastSyncAt: safeOccurredAt,
            healthScore: 98,
            errorState: null,
          },
        }).catch(() => undefined);
      }

      const existingIntegrationEvent = await tx.integrationEvent.findFirst({
        where: {
          provider,
          providerEventId: payload.externalEventId ?? externalMessageId,
        },
        select: { id: true },
      });

      if (!existingIntegrationEvent) {
        await tx.integrationEvent.create({
          data: {
            organizationId,
            provider,
            providerEventId: payload.externalEventId ?? externalMessageId,
            status: 'processed',
            payloadJson: outboxEvent.payloadJson as Prisma.InputJsonValue,
            retryCount: 0,
            processedAt: new Date(),
          },
        });
      }

      return {
        contactId,
        leadId: lead.id,
        conversationId: conversation.id,
        messageId: existingMessage?.id,
      };
    });

    await this.prisma.usageEvent.createMany({
      data: [
        {
          organizationId,
          metric: 'inbound_message',
          quantity: 1,
          sourceEntityType: 'outbox_event',
          sourceEntityId: outboxEvent.id,
          periodStart: new Date(Date.UTC(safeOccurredAt.getUTCFullYear(), safeOccurredAt.getUTCMonth(), 1)),
          occurredAt: safeOccurredAt,
          metadataJson: {
            provider,
            conversationId: result.conversationId,
          },
        },
      ],
      skipDuplicates: true,
    });

    await this.projectionsService.refreshConversationProjection(result.conversationId);
    await this.projectionsService.refreshOrganizationRealtimeMetrics(organizationId);

    return {
      outboxEventId,
      state: 'materialized',
      leadId: result.leadId,
      conversationId: result.conversationId,
    };
  }
}
