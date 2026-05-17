import type { MessageDeliveryStatus, Prisma } from "@/generated/prisma";
import { isPrismaStorageEnabled } from "./data-store";

export interface DeliveryUpdateInput {
  attempts?: number;
  errorCode?: string;
  errorMessage?: string;
  providerMessageId?: string;
  status: MessageDeliveryStatus;
  timestampIso?: string;
}

export interface UpsertMessageDeliveryInput extends DeliveryUpdateInput {
  conversationId: string;
  localProviderMessageId: string;
  organizationId?: string;
  outboxEventId?: string;
}

function toDate(value?: string): Date {
  const parsed = value ? new Date(value) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function truncate(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  return value.length > 500 ? `${value.slice(0, 497)}...` : value;
}

export function buildDeliveryUpdatePatch(input: DeliveryUpdateInput) {
  const timestamp = toDate(input.timestampIso);

  return {
    status: input.status,
    ...(typeof input.attempts === "number" ? { attemptCount: input.attempts } : {}),
    providerMessageId: input.providerMessageId,
    lastErrorCode: input.status === "failed" ? input.errorCode : null,
    lastErrorMessage: input.status === "failed" ? truncate(input.errorMessage) : null,
    sentAt:
      input.status === "sent" || input.status === "delivered"
        ? timestamp
        : undefined,
    deliveredAt: input.status === "delivered" ? timestamp : undefined,
    failedAt: input.status === "failed" ? timestamp : null,
  } satisfies Prisma.MessageDeliveryUncheckedUpdateInput;
}

export async function upsertMessageDeliveryStatus(
  input: UpsertMessageDeliveryInput,
) {
  if (!isPrismaStorageEnabled()) {
    return undefined;
  }

  const { prisma } = await import("./prisma");
  const message = await prisma.message.findUnique({
    where: {
      conversationId_providerMessageId: {
        conversationId: input.conversationId,
        providerMessageId: input.localProviderMessageId,
      },
    },
    include: {
      conversation: true,
    },
  });

  if (!message) {
    return undefined;
  }

  const organizationId = input.organizationId ?? message.conversation.organizationId;
  const patch = buildDeliveryUpdatePatch(input);
  const createData = {
    organizationId,
    conversationId: input.conversationId,
    messageId: message.id,
    outboxEventId: input.outboxEventId,
    provider: message.conversation.provider,
    localMessageId: input.localProviderMessageId,
    providerMessageId: input.providerMessageId,
    status: input.status,
    attemptCount: input.attempts ?? 0,
    lastErrorCode: input.status === "failed" ? input.errorCode : undefined,
    lastErrorMessage:
      input.status === "failed" ? truncate(input.errorMessage) : undefined,
    sentAt:
      input.status === "sent" || input.status === "delivered"
        ? toDate(input.timestampIso)
        : undefined,
    deliveredAt: input.status === "delivered" ? toDate(input.timestampIso) : undefined,
    failedAt: input.status === "failed" ? toDate(input.timestampIso) : undefined,
  } satisfies Prisma.MessageDeliveryUncheckedCreateInput;

  return prisma.messageDelivery.upsert({
    where: {
      conversationId_localMessageId: {
        conversationId: input.conversationId,
        localMessageId: input.localProviderMessageId,
      },
    },
    create: createData,
    update: {
      ...patch,
      outboxEventId: input.outboxEventId,
      providerMessageId: input.providerMessageId ?? patch.providerMessageId,
    },
  });
}
