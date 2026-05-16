import { Prisma } from "@/generated/prisma/client";
import type { AppState, Conversation, Lead, Provider } from "@/domain/types";
import { ApiError } from "./api-error";
import { sendLiveProviderMessage } from "./channel-integrations";
import { isPrismaStorageEnabled, mutateAppState, readAppState } from "./data-store";
import { isProductionRuntime } from "./feature-flags";
import { refreshConversationProjection } from "./inbox-projections";
import { upsertMessageDeliveryStatus } from "./message-deliveries";
import { captureError, structuredLog } from "./observability";
import { prisma } from "./prisma";
import { enqueueOutboxDispatch } from "./queue-runtime";

export interface OutboundOutboxInput {
  organizationId: string;
  conversationId: string;
  leadId: string;
  localProviderMessageId: string;
  provider: Provider;
  providerThreadId: string;
  providerContactId: string;
  text: string;
  actorUserId?: string;
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

function truncateError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.length > 500 ? `${message.slice(0, 497)}...` : message;
}

export function isRetryableOutboxStatus(status: string): boolean {
  return status === "pending" || status === "failed" || status === "dispatching";
}

export function buildOutboundOutboxPayload(input: OutboundOutboxInput) {
  const aggregateId = input.localProviderMessageId;

  return {
    organizationId: input.organizationId,
    aggregateType: "message",
    aggregateId,
    eventName: "messaging.outbound.requested",
    schemaVersion: 1,
    partitionKey: `${input.organizationId}:${input.conversationId}`,
    payloadJson: {
      deliveryState: "pending",
      organizationId: input.organizationId,
      conversationId: input.conversationId,
      leadId: input.leadId,
      localProviderMessageId: input.localProviderMessageId,
      provider: input.provider,
      providerThreadId: input.providerThreadId,
      providerContactId: input.providerContactId,
      text: input.text,
      actorUserId: input.actorUserId,
    },
    occurredAt: new Date(),
  };
}

function withDeliveryState(
  state: AppState,
  input: {
    conversationId: string;
    localProviderMessageId: string;
    deliveryState: "pending" | "sent" | "delivered" | "failed";
    outboxEventId?: string;
    providerMessageId?: string;
    deliveredAt?: string;
    errorCode?: string;
    errorMessage?: string;
    attempts?: number;
  },
): AppState {
  return {
    ...state,
    messages: state.messages.map((message) => {
      if (
        message.conversationId !== input.conversationId ||
        message.providerMessageId !== input.localProviderMessageId
      ) {
        return message;
      }

      return {
        ...message,
        deliveredAt: input.deliveredAt ?? message.deliveredAt,
        payloadJson: {
          ...(message.payloadJson ?? {}),
          deliveryState: input.deliveryState,
          outboxEventId: input.outboxEventId,
          providerMessageId: input.providerMessageId,
          errorCode: input.errorCode,
          errorMessage: input.errorMessage,
        },
      };
    }),
  };
}

async function markMessageDelivery(input: Parameters<typeof withDeliveryState>[1]) {
  await mutateAppState((state) => withDeliveryState(state, input));
  await upsertMessageDeliveryStatus({
    conversationId: input.conversationId,
    localProviderMessageId: input.localProviderMessageId,
    status: input.deliveryState,
    outboxEventId: input.outboxEventId,
    providerMessageId: input.providerMessageId,
    errorCode: input.errorCode,
    errorMessage: input.errorMessage,
    attempts: input.attempts,
    timestampIso: input.deliveredAt,
  });
  await refreshConversationProjection(input.conversationId);
}

function findConversationAndLead(
  state: AppState,
  conversationId: string,
  leadId: string,
): { conversation: Conversation; lead: Lead } {
  const conversation = state.conversations.find((item) => item.id === conversationId);
  if (!conversation) {
    throw new ApiError(404, "Conversation was not found", "conversation_not_found");
  }

  const lead = state.leads.find((item) => item.id === leadId);
  if (!lead) {
    throw new ApiError(404, "Lead was not found", "lead_not_found");
  }

  return { conversation, lead };
}

async function dispatchOutboundPayload(
  payload: Record<string, unknown>,
  outboxEventId?: string,
  attempts?: number,
) {
  const conversationId = String(payload.conversationId ?? "");
  const leadId = String(payload.leadId ?? "");
  const localProviderMessageId = String(payload.localProviderMessageId ?? "");
  const text = String(payload.text ?? "");

  if (!conversationId || !leadId || !localProviderMessageId || !text.trim()) {
    throw new ApiError(400, "Outbound outbox payload is invalid", "invalid_outbox_payload");
  }

  const state = await readAppState();
  const { conversation, lead } = findConversationAndLead(state, conversationId, leadId);

  if (conversation.provider === "web_form" || conversation.provider === "clinic_database") {
    throw new ApiError(
      409,
      "This source has no live outbound provider API.",
      "channel_not_replyable",
    );
  }

  const delivery = await sendLiveProviderMessage(state, conversation, lead, text);
  await markMessageDelivery({
    conversationId,
    localProviderMessageId,
    deliveryState: "delivered",
    outboxEventId,
    providerMessageId: delivery.providerMessageId,
    deliveredAt: delivery.deliveredAt,
    attempts,
  });

  return {
    state: "delivered",
    providerMessageId: delivery.providerMessageId,
    deliveredAt: delivery.deliveredAt,
  };
}

export async function createOutboundOutboxEvent(input: OutboundOutboxInput) {
  const spec = buildOutboundOutboxPayload(input);

  if (!isPrismaStorageEnabled()) {
    await markMessageDelivery({
      conversationId: input.conversationId,
      localProviderMessageId: input.localProviderMessageId,
      deliveryState: "pending",
    });
    return {
      queued: false,
      outboxEventId: undefined,
      status: "pending_inline",
    };
  }

  const event = await prisma.$transaction(async (tx) => {
    const existing = await tx.outboxEvent.findFirst({
      where: {
        eventName: spec.eventName,
        aggregateType: spec.aggregateType,
        aggregateId: spec.aggregateId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (existing) {
      return existing;
    }

    return tx.outboxEvent.create({
      data: {
        organizationId: spec.organizationId,
        aggregateType: spec.aggregateType,
        aggregateId: spec.aggregateId,
        eventName: spec.eventName,
        schemaVersion: spec.schemaVersion,
        status: "pending",
        partitionKey: spec.partitionKey,
        correlationId: spec.aggregateId,
        payloadJson: toJsonValue(spec.payloadJson),
        occurredAt: spec.occurredAt,
      },
      select: {
        id: true,
        status: true,
      },
    });
  });

  await markMessageDelivery({
    conversationId: input.conversationId,
    localProviderMessageId: input.localProviderMessageId,
    deliveryState: "pending",
    outboxEventId: event.id,
  });

  const queueResult = await enqueueOutboxDispatch(event.id);
  structuredLog("info", "outbound.outbox.created", {
    organizationId: input.organizationId,
    conversationId: input.conversationId,
    leadId: input.leadId,
    provider: input.provider,
    outboxEventId: event.id,
    status: event.status,
    queued: queueResult.queued,
  });
  if (!queueResult.queued && !isProductionRuntime() && isRetryableOutboxStatus(event.status)) {
    await dispatchOutboxEvent(event.id);
  }

  return {
    queued: queueResult.queued,
    outboxEventId: event.id,
    status: event.status,
  };
}

export async function dispatchOutboxEvent(outboxEventId: string) {
  const outboxEvent = await prisma.outboxEvent.findUnique({
    where: { id: outboxEventId },
  });

  if (!outboxEvent) {
    return { outboxEventId, state: "missing" };
  }

  if (outboxEvent.status === "dispatched") {
    structuredLog("info", "outbox.dispatch.skipped", {
      outboxEventId,
      eventName: outboxEvent.eventName,
      organizationId: outboxEvent.organizationId,
      status: outboxEvent.status,
    });
    return { outboxEventId, state: "already-dispatched" };
  }

  const now = new Date();
  const claim = await prisma.outboxEvent.updateMany({
    where: {
      id: outboxEventId,
      OR: [
        { status: { in: ["pending", "failed"] } },
        {
          status: "dispatching",
          OR: [
            { claimExpiresAt: { lte: now } },
            {
              claimExpiresAt: null,
              claimedAt: { lte: new Date(now.getTime() - 5 * 60 * 1000) },
            },
          ],
        },
      ],
    },
    data: {
      status: "dispatching",
      claimedAt: now,
      claimExpiresAt: new Date(now.getTime() + 5 * 60 * 1000),
      attemptCount: { increment: 1 },
    },
  });

  if (claim.count === 0) {
    const current = await prisma.outboxEvent.findUnique({
      where: { id: outboxEventId },
      select: { status: true, eventName: true },
    });

    return {
      outboxEventId,
      state:
        current?.status === "dispatched"
          ? "already-dispatched"
          : `claim-skipped-${current?.status ?? "missing"}`,
      eventName: current?.eventName,
    };
  }

  const claimed = await prisma.outboxEvent.findUniqueOrThrow({
    where: { id: outboxEventId },
  });

  try {
    const startedAt = Date.now();
    if (claimed.eventName === "messaging.outbound.requested") {
      const payload = (claimed.payloadJson ?? {}) as Record<string, unknown>;
      await upsertMessageDeliveryStatus({
        conversationId: String(payload.conversationId ?? ""),
        localProviderMessageId: String(payload.localProviderMessageId ?? ""),
        organizationId: claimed.organizationId ?? undefined,
        outboxEventId: claimed.id,
        status: "sent",
        attempts: claimed.attemptCount,
        timestampIso: new Date().toISOString(),
      });
      await dispatchOutboundPayload(
        payload,
        claimed.id,
        claimed.attemptCount,
      );
    }

    await prisma.outboxEvent.update({
      where: { id: claimed.id },
      data: {
        status: "dispatched",
        dispatchedAt: new Date(),
        claimedAt: null,
        claimExpiresAt: null,
        lastErrorCode: null,
        lastErrorMessage: null,
      },
    });
    const logPayload = (claimed.payloadJson ?? {}) as Record<string, unknown>;
    structuredLog("info", "outbox.dispatch.succeeded", {
      organizationId: claimed.organizationId,
      provider: logPayload.provider,
      outboxEventId: claimed.id,
      eventName: claimed.eventName,
      status: "dispatched",
      attemptCount: claimed.attemptCount,
      latencyMs: Date.now() - startedAt,
    });

    return {
      outboxEventId: claimed.id,
      eventName: claimed.eventName,
      state: "dispatched",
    };
  } catch (error) {
    const payload = (claimed.payloadJson ?? {}) as Record<string, unknown>;
    await markMessageDelivery({
      conversationId: String(payload.conversationId ?? ""),
      localProviderMessageId: String(payload.localProviderMessageId ?? ""),
      deliveryState: "failed",
      outboxEventId: claimed.id,
      errorCode: error instanceof Error ? error.name : "dispatch_error",
      errorMessage: truncateError(error),
      attempts: claimed.attemptCount,
    });

    const nextStatus = claimed.attemptCount >= 8 ? "dead_letter" : "failed";
    await prisma.outboxEvent.update({
      where: { id: claimed.id },
      data: {
        status: nextStatus,
        claimedAt: null,
        claimExpiresAt: null,
        lastErrorCode: error instanceof Error ? error.name : "dispatch_error",
        lastErrorMessage: truncateError(error),
      },
    });
    captureError(error, {
      event: "outbox.dispatch.failed",
      organizationId: claimed.organizationId,
      provider: payload.provider,
      outboxEventId: claimed.id,
      eventName: claimed.eventName,
      status: nextStatus,
      attemptCount: claimed.attemptCount,
    });

    throw error;
  }
}
