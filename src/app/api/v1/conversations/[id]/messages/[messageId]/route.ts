import {
  errorResponse,
  getRequestContext,
  readJsonObject,
  stateForContext,
} from "@/server/api-helpers";
import { ApiError } from "@/server/api-error";
import { mutateAppState, readAppState } from "@/server/data-store";
import { updateRecentOutboundMessage } from "@/server/state-mutations";
import { optionalIsoString, optionalString } from "@/server/validation";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; messageId: string }> },
) {
  try {
    const { id, messageId } = await context.params;
    const currentState = await readAppState();
    const requestContext = getRequestContext(request, currentState, "manager");
    const conversation = currentState.conversations.find((item) => item.id === id);

    if (!conversation) {
      throw new ApiError(404, "Conversation was not found", "conversation_not_found");
    }

    if (!requestContext.isSuperAdmin && conversation.organizationId !== requestContext.organizationId) {
      throw new ApiError(403, "Conversation belongs to another organization", "forbidden");
    }

    const payload = await readJsonObject(request);
    const text = optionalString(payload, "text");
    if (!text) {
      throw new ApiError(400, "text is required", "validation_error");
    }

    const state = await mutateAppState((current) =>
      updateRecentOutboundMessage(current, {
        conversationId: id,
        messageId,
        text,
        actorUserId: requestContext.userId,
        nowIso: optionalIsoString(payload, "nowIso"),
      }),
    );

    return Response.json(stateForContext(state, requestContext));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; messageId: string }> },
) {
  try {
    const { id, messageId } = await context.params;
    const currentState = await readAppState();
    const requestContext = getRequestContext(request, currentState, "manager");
    const conversation = currentState.conversations.find((item) => item.id === id);

    if (!conversation) {
      throw new ApiError(404, "Conversation was not found", "conversation_not_found");
    }

    if (!requestContext.isSuperAdmin && conversation.organizationId !== requestContext.organizationId) {
      throw new ApiError(403, "Conversation belongs to another organization", "forbidden");
    }

    const state = await mutateAppState((current) =>
      updateRecentOutboundMessage(current, {
        conversationId: id,
        messageId,
        undo: true,
        actorUserId: requestContext.userId,
      }),
    );

    return Response.json(stateForContext(state, requestContext));
  } catch (error) {
    return errorResponse(error);
  }
}
