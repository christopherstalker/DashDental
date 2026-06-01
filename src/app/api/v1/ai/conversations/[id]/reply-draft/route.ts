import { getMessagesForConversation } from "@/domain/business-rules";
import { createGuardedAiReplyDraft } from "@/server/ai-guardrails";
import {
  ApiError,
  errorResponse,
  getRequestContext,
  readJsonObject,
} from "@/server/api-helpers";
import { readAppState, mutateAppState } from "@/server/data-store";
import { assertEntitlement, canUseAI } from "@/server/entitlements";
import { addAudit } from "@/server/state-mutations";
import { recordUsageEventInState } from "@/server/usage-metering";
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

    assertEntitlement(canUseAI(currentState, conversation.organizationId));
    const lead = currentState.leads.find((item) => item.id === conversation.leadId);
    if (!lead) {
      throw new ApiError(404, "Lead was not found", "lead_not_found");
    }

    const payload = await readJsonObject(request);
    const occurredAt = optionalIsoString(payload, "nowIso") ?? new Date().toISOString();
    const messages = getMessagesForConversation(currentState.messages, conversation.id);
    const draft = createGuardedAiReplyDraft({
      organizationId: conversation.organizationId,
      lead,
      conversationId: conversation.id,
      messages,
      nowIso: occurredAt,
    });

    await mutateAppState((state) => {
      let nextState = {
        ...state,
        aiInsights: [draft.insight, ...state.aiInsights],
      };

      nextState = addAudit(nextState, {
        organizationId: conversation.organizationId,
        actorUserId: requestContext.userId,
        action: "ai.reply_draft_created",
        entityType: "conversation",
        entityId: conversation.id,
        metadataJson: {
          promptVersion: draft.insight.promptVersion,
          guardrailStatus: draft.review.status,
          requiresHumanApproval: draft.review.requiresHumanApproval,
        },
      });

      return recordUsageEventInState(nextState, {
        organizationId: conversation.organizationId,
        metric: "aiRuns",
        quantity: 1,
        sourceEntityType: "ai_reply_draft",
        sourceEntityId: `reply-draft:${conversation.id}:${occurredAt}`,
        occurredAt,
        metadataJson: {
          conversationId: conversation.id,
          guardrailStatus: draft.review.status,
        },
      }).state;
    });

    return Response.json(
      {
        draft: {
          text: draft.text,
          review: draft.review,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
