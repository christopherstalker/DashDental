import { Prisma } from "@/generated/prisma";
import type { Provider } from "@/domain/types";
import { isPrismaStorageEnabled } from "./data-store";
import { refreshConversationProjection } from "./inbox-projections";

type MessagingProvider = Extract<Provider, "instagram" | "telegram" | "web_form" | "whatsapp">;

interface InboundMessagingPayload {
  channelProvider?: MessagingProvider;
  externalAccountId?: string;
  externalContactId?: string;
  externalEventId?: string;
  externalMessageId?: string;
  externalThreadId?: string;
  integrationId?: string;
  organizationId?: string;
  patientName?: string;
  patientPhone?: string;
  provider?: MessagingProvider;
  text?: string;
  occurredAt?: string;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function isMessagingProvider(value: unknown): value is MessagingProvider {
  return (
    value === "instagram" ||
    value === "telegram" ||
    value === "web_form" ||
    value === "whatsapp"
  );
}

function safeDate(value: string | undefined, fallback: Date): Date {
  const parsed = value ? new Date(value) : fallback;
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function monthStart(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));
}

export async function materializeInboundMessageOutboxEvent(outboxEventId: string) {
  if (!isPrismaStorageEnabled()) {
    return { outboxEventId, state: "skipped-non-prisma" };
  }

  const { prisma } = await import("./prisma");
  const outboxEvent = await prisma.outboxEvent.findUnique({
    where: { id: outboxEventId },
  });

  if (!outboxEvent) {
    return { outboxEventId, state: "missing-outbox-event" };
  }

  const payload = (asRecord(outboxEvent.payloadJson) ?? {}) as InboundMessagingPayload;
  const organizationId = readString(payload.organizationId);
  const provider = isMessagingProvider(payload.channelProvider)
    ? payload.channelProvider
    : isMessagingProvider(payload.provider)
      ? payload.provider
      : undefined;
  const externalMessageId = readString(payload.externalMessageId);
  const externalThreadId = readString(payload.externalThreadId);
  const externalContactId = readString(payload.externalContactId);

  if (
    !organizationId ||
    !provider ||
    !externalMessageId ||
    !externalThreadId ||
    !externalContactId
  ) {
    return { outboxEventId, state: "invalid-payload" };
  }

  const occurredAt = safeDate(payload.occurredAt, outboxEvent.occurredAt);
  const displayName = readString(payload.patientName) ?? "Patient";
  const patientPhone = readString(payload.patientPhone);
  const inboundText = readString(payload.text) ?? "Inbound message received";
  const externalAccountId =
    readString(payload.externalAccountId) ?? readString(payload.integrationId) ?? "";

  const result = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { averagePatientValue: true },
    });
    const assignedMembership = await tx.membership.findFirst({
      where: {
        organizationId,
        status: "active",
      },
      orderBy: [{ createdAt: "asc" }],
      select: { userId: true },
    });
    const existingIdentity = await tx.contactIdentity.findFirst({
      where: {
        organizationId,
        provider,
        externalAccountId,
        externalContactId,
      },
      include: { contact: true },
    });
    let contactId = existingIdentity?.contactId;

    if (!contactId) {
      const existingContact = patientPhone
        ? await tx.contact.findFirst({
            where: { organizationId, phoneE164: patientPhone },
            select: { id: true },
          })
        : null;

      if (existingContact) {
        contactId = existingContact.id;
        await tx.contact.update({
          where: { id: existingContact.id },
          data: {
            displayName,
            lastSeenAt: occurredAt,
          },
        });
      } else {
        const contact = await tx.contact.create({
          data: {
            organizationId,
            displayName,
            phoneE164: patientPhone,
            firstSeenAt: occurredAt,
            lastSeenAt: occurredAt,
          },
          select: { id: true },
        });
        contactId = contact.id;
      }

      await tx.contactIdentity.create({
        data: {
          organizationId,
          contactId,
          provider,
          externalAccountId,
          externalContactId,
          externalThreadId,
          firstSeenAt: occurredAt,
          lastSeenAt: occurredAt,
        },
      });
    } else {
      const identity = existingIdentity;
      if (!identity) {
        throw new Error("contact_identity_missing_after_resolution");
      }

      await tx.contactIdentity.update({
        where: { id: identity.id },
        data: {
          externalThreadId,
          lastSeenAt: occurredAt,
        },
      });
      await tx.contact.update({
        where: { id: contactId },
        data: {
          displayName:
            identity.contact.displayName === "Patient"
              ? displayName
              : identity.contact.displayName,
          phoneE164: identity.contact.phoneE164 ?? patientPhone,
          lastSeenAt: occurredAt,
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
          phone: patientPhone,
          source: provider,
          status: "new",
          assignedTo: assignedMembership?.userId,
          providerContactId: externalContactId,
          firstMessageAt: occurredAt,
          estimatedValue: organization.averagePatientValue,
        },
      });
    } else {
      const nextLeadStatus =
        lead.status === "booked" || lead.status === "lost" ? "new" : lead.status;

      await tx.lead.update({
        where: { id: lead.id },
        data: {
          contactId: lead.contactId ?? contactId,
          name: lead.name || displayName,
          phone: lead.phone ?? patientPhone,
          status: nextLeadStatus,
          assignedTo: lead.assignedTo ?? assignedMembership?.userId,
          updatedAt: occurredAt,
        },
      });

      if (nextLeadStatus !== lead.status) {
        await tx.leadStatusHistory.create({
          data: {
            leadId: lead.id,
            fromStatus: lead.status,
            toStatus: nextLeadStatus,
            changedBy: assignedMembership?.userId ?? "system-reopen",
            reason: "Reopened by inbound message",
            createdAt: occurredAt,
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
          status: "open",
          lastMessageAt: occurredAt,
        },
      });
    } else {
      await tx.conversation.update({
        where: { id: conversation.id },
        data: {
          leadId: conversation.leadId || lead.id,
          contactId: conversation.contactId ?? contactId,
          status: "open",
          lastMessageAt: occurredAt,
        },
      });
    }

    const existingMessage = await tx.message.findUnique({
      where: {
        conversationId_providerMessageId: {
          conversationId: conversation.id,
          providerMessageId: externalMessageId,
        },
      },
      select: { id: true },
    });

    const message = existingMessage
      ? existingMessage
      : await tx.message.create({
          data: {
            conversationId: conversation.id,
            direction: "inbound",
            senderType: "patient",
            providerMessageId: externalMessageId,
            text: inboundText,
            payloadJson: outboxEvent.payloadJson as Prisma.InputJsonValue,
            sentAt: occurredAt,
          },
          select: { id: true },
        });

    await tx.integrationEvent.upsert({
      where: {
        provider_providerEventId: {
          provider,
          providerEventId: payload.externalEventId ?? externalMessageId,
        },
      },
      create: {
        organizationId,
        provider,
        providerEventId: payload.externalEventId ?? externalMessageId,
        status: "processed",
        payloadJson: outboxEvent.payloadJson as Prisma.InputJsonValue,
        retryCount: 0,
        processedAt: new Date(),
      },
      update: {
        status: "processed",
        processedAt: new Date(),
      },
    });

    if (payload.integrationId) {
      await tx.integration.updateMany({
        where: { id: payload.integrationId, organizationId },
        data: {
          status: "active",
          lastSyncAt: occurredAt,
          healthScore: 98,
          errorState: null,
        },
      });
    }

    return {
      contactId,
      leadId: lead.id,
      conversationId: conversation.id,
      messageId: message.id,
      duplicatedMessage: Boolean(existingMessage),
    };
  });

  await prisma.usageEvent.createMany({
    data: [
      {
        organizationId,
        metric: "inbound_message",
        quantity: 1,
        sourceEntityType: "outbox_event",
        sourceEntityId: outboxEvent.id,
        periodStart: monthStart(occurredAt),
        occurredAt,
        metadataJson: {
          provider,
          conversationId: result.conversationId,
          messageId: result.messageId,
        },
      },
    ],
    skipDuplicates: true,
  });

  await refreshConversationProjection(result.conversationId);

  return {
    outboxEventId,
    state: result.duplicatedMessage ? "already-materialized" : "materialized",
    leadId: result.leadId,
    conversationId: result.conversationId,
    messageId: result.messageId,
  };
}
