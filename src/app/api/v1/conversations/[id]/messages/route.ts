import { getMessagesForConversation } from "@/domain/business-rules";
import { readAppState, mutateAppState, isPrismaStorageEnabled } from "@/server/data-store";
import { assertEntitlement, canSendMessage } from "@/server/entitlements";
import { createOutboundOutboxEvent } from "@/server/outbox-pipeline";
import { sendConversationMessage } from "@/server/state-mutations";
import { recordUsageEvent, recordUsageEventInState } from "@/server/usage-metering";
import {
  ApiError,
  errorResponse,
  getRequestContext,
  readJsonObject,
  stateForContext,
} from "@/server/api-helpers";
import { optionalIsoString, requiredString } from "@/server/validation";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const state = await readAppState();
    const requestContext = getRequestContext(request, state, "manager");
    const conversation = state.conversations.find((item) => item.id === id);

    if (!conversation) {
      throw new ApiError(404, "Conversation was not found", "conversation_not_found");
    }

    if (
      !requestContext.isSuperAdmin &&
      conversation.organizationId !== requestContext.organizationId
    ) {
      throw new ApiError(403, "Conversation belongs to another organization", "forbidden");
    }

    return Response.json({
      messages: getMessagesForConversation(state.messages, id),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const currentState = await readAppState();
    const requestContext = getRequestContext(request, currentState, "manager");
    const conversation = currentState.conversations.find((item) => item.id === id);

    if (!conversation) {
      throw new ApiError(404, "Conversation was not found", "conversation_not_found");
    }

    if (
      !requestContext.isSuperAdmin &&
      conversation.organizationId !== requestContext.organizationId
    ) {
      throw new ApiError(403, "Conversation belongs to another organization", "forbidden");
    }

    const payload = await readJsonObject(request);
    const text = requiredString(payload, "text");
    const lead = currentState.leads.find((item) => item.id === conversation.leadId);
    if (!lead) {
      throw new ApiError(404, "Lead was not found for this conversation", "lead_not_found");
    }
    assertEntitlement(
      canSendMessage(currentState, conversation.organizationId),
    );

    const localProviderMessageId =
      request.headers.get("Idempotency-Key") ??
      `local-${conversation.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const state = await mutateAppState((current) =>
      sendConversationMessage(current, {
        conversationId: id,
        text,
        actorUserId: requestContext.userId,
        nowIso: optionalIsoString(payload, "nowIso"),
        providerMessageId: localProviderMessageId,
        payloadJson: {
          deliveryState: "pending_outbox",
          provider: conversation.provider,
          localProviderMessageId,
        },
      }),
    );
    const outbox = await createOutboundOutboxEvent({
      organizationId: conversation.organizationId,
      conversationId: conversation.id,
      leadId: lead.id,
      localProviderMessageId,
      provider: conversation.provider,
      providerThreadId: conversation.providerThreadId,
      providerContactId: lead.providerContactId,
      text,
      actorUserId: requestContext.userId,
    });
    let responseState = state;
    if (isPrismaStorageEnabled()) {
      await recordUsageEvent({
        organizationId: conversation.organizationId,
        metric: "messages",
        quantity: 1,
        sourceEntityType: "message",
        sourceEntityId: localProviderMessageId,
        occurredAt: optionalIsoString(payload, "nowIso") ?? new Date().toISOString(),
        metadataJson: {
          direction: "outbound",
          provider: conversation.provider,
          outboxEventId: outbox.outboxEventId,
        },
      });
    } else {
      responseState = await mutateAppState(
        (current) =>
          recordUsageEventInState(current, {
            organizationId: conversation.organizationId,
            metric: "messages",
            quantity: 1,
            sourceEntityType: "message",
            sourceEntityId: localProviderMessageId,
            occurredAt: optionalIsoString(payload, "nowIso") ?? new Date().toISOString(),
            metadataJson: {
              direction: "outbound",
              provider: conversation.provider,
              outboxEventId: outbox.outboxEventId,
            },
          }).state,
      );
    }

    return Response.json(
      {
        ...stateForContext(responseState, requestContext),
        outbox,
      },
      { status: 202 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
