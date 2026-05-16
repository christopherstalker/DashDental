import { readAppState, mutateAppState, isPrismaStorageEnabled } from "@/server/data-store";
import { assertEntitlement, canUseAI } from "@/server/entitlements";
import { generateConversationSummary } from "@/server/state-mutations";
import { recordUsageEvent, recordUsageEventInState } from "@/server/usage-metering";
import {
  ApiError,
  errorResponse,
  getRequestContext,
  readJsonObject,
  stateForContext,
} from "@/server/api-helpers";
import { optionalIsoString } from "@/server/validation";

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
    assertEntitlement(canUseAI(currentState, conversation.organizationId));

    const occurredAt = optionalIsoString(payload, "nowIso") ?? new Date().toISOString();
    const state = await mutateAppState((current) =>
      generateConversationSummary(current, {
        conversationId: id,
        actorUserId: requestContext.userId,
        nowIso: occurredAt,
      }),
    );
    const sourceEntityId = `summary:${id}:${occurredAt}`;
    const responseState = isPrismaStorageEnabled()
      ? state
      : await mutateAppState(
          (current) =>
            recordUsageEventInState(current, {
              organizationId: conversation.organizationId,
              metric: "aiRuns",
              quantity: 1,
              sourceEntityType: "ai_summary",
              sourceEntityId,
              occurredAt,
              metadataJson: { conversationId: id },
            }).state,
        );

    if (isPrismaStorageEnabled()) {
      await recordUsageEvent({
        organizationId: conversation.organizationId,
        metric: "aiRuns",
        quantity: 1,
        sourceEntityType: "ai_summary",
        sourceEntityId,
        occurredAt,
        metadataJson: { conversationId: id },
      });
    }

    return Response.json(stateForContext(responseState, requestContext), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
