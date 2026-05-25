import {
  errorResponse,
  getRequestContext,
  readJsonObject,
  stateForContext,
} from "@/server/api-helpers";
import { ApiError } from "@/server/api-error";
import { mutateAppState, readAppState } from "@/server/data-store";
import { bulkApplyConversationAction } from "@/server/state-mutations";
import { optionalIsoString, optionalString, requiredString } from "@/server/validation";
import type { ConversationAction } from "@/domain/types";

const actions: readonly ConversationAction[] = ["mark_booked", "archive", "snooze"];

function readConversationIds(payload: Record<string, unknown>): string[] {
  const value = payload.conversationIds;
  if (!Array.isArray(value)) {
    throw new ApiError(400, "conversationIds is required", "validation_error");
  }

  const ids = value.filter((item): item is string => typeof item === "string" && item.trim() !== "");
  if (ids.length === 0) {
    throw new ApiError(400, "conversationIds must include at least one id", "validation_error");
  }

  return ids;
}

export async function POST(request: Request) {
  try {
    const currentState = await readAppState();
    const context = getRequestContext(request, currentState, "manager");
    const payload = await readJsonObject(request);
    const action = requiredString(payload, "action") as ConversationAction;

    if (!actions.includes(action)) {
      throw new ApiError(400, "action is invalid", "validation_error", { allowed: actions });
    }

    const conversationIds = readConversationIds(payload);
    const visibleConversationIds = new Set(
      currentState.conversations
        .filter(
          (conversation) =>
            context.isSuperAdmin || conversation.organizationId === context.organizationId,
        )
        .map((conversation) => conversation.id),
    );

    if (conversationIds.some((id) => !visibleConversationIds.has(id))) {
      throw new ApiError(403, "One or more conversations are not accessible", "forbidden");
    }

    const state = await mutateAppState((current) =>
      bulkApplyConversationAction(current, {
        conversationIds,
        action,
        actorUserId: context.userId,
        nowIso: optionalIsoString(payload, "nowIso"),
        reminderNote: optionalString(payload, "note"),
        remindAt: optionalIsoString(payload, "remindAt"),
      }),
    );

    return Response.json(stateForContext(state, context));
  } catch (error) {
    return errorResponse(error);
  }
}
