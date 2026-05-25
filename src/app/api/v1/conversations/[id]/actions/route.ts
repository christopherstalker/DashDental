import {
  errorResponse,
  getRequestContext,
  readJsonObject,
  stateForContext,
} from "@/server/api-helpers";
import { ApiError } from "@/server/api-error";
import { mutateAppState, readAppState } from "@/server/data-store";
import {
  assignConversation,
  bulkApplyConversationAction,
  snoozeConversation,
} from "@/server/state-mutations";
import { optionalIsoString, optionalString, requiredString } from "@/server/validation";
import type { ConversationAction } from "@/domain/types";

const conversationActions: readonly ConversationAction[] = [
  "mark_booked",
  "archive",
  "snooze",
];

function readAction(value: string): ConversationAction {
  if (!conversationActions.includes(value as ConversationAction)) {
    throw new ApiError(400, "action is invalid", "validation_error", {
      allowed: conversationActions,
    });
  }

  return value as ConversationAction;
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

    if (!requestContext.isSuperAdmin && conversation.organizationId !== requestContext.organizationId) {
      throw new ApiError(403, "Conversation belongs to another organization", "forbidden");
    }

    const payload = await readJsonObject(request);
    const intent = requiredString(payload, "intent");
    const state = await mutateAppState((current) => {
      if (intent === "assign") {
        return assignConversation(current, {
          conversationId: id,
          assignedTo: optionalString(payload, "assignedTo"),
          actorUserId: requestContext.userId,
          nowIso: optionalIsoString(payload, "nowIso"),
        });
      }

      if (intent === "snooze") {
        return snoozeConversation(current, {
          conversationId: id,
          note: optionalString(payload, "note") ?? "Call back tomorrow",
          remindAt: optionalIsoString(payload, "remindAt"),
          actorUserId: requestContext.userId,
          nowIso: optionalIsoString(payload, "nowIso"),
        });
      }

      return bulkApplyConversationAction(current, {
        conversationIds: [id],
        action: readAction(intent),
        actorUserId: requestContext.userId,
        nowIso: optionalIsoString(payload, "nowIso"),
      });
    });

    return Response.json(stateForContext(state, requestContext));
  } catch (error) {
    return errorResponse(error);
  }
}
