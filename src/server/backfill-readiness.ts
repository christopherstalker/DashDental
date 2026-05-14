import {
  buildConversationProjectionFromState,
} from "./inbox-projections";
import type { AppState } from "@/domain/types";

export interface BackfillPlanOptions {
  dryRun?: boolean;
  organizationId?: string;
}

export function planBackfillFromState(
  state: AppState,
  options: BackfillPlanOptions = {},
) {
  const organizationId = options.organizationId;
  const conversations = state.conversations.filter(
    (conversation) => !organizationId || conversation.organizationId === organizationId,
  );
  const outboundMessages = state.messages.filter((message) => {
    if (message.direction !== "outbound") {
      return false;
    }
    const conversation = state.conversations.find(
      (item) => item.id === message.conversationId,
    );
    return Boolean(
      conversation &&
        (!organizationId || conversation.organizationId === organizationId),
    );
  });
  const usageRollupKeys = new Set(
    (state.usageEvents ?? [])
      .filter((event) => !organizationId || event.organizationId === organizationId)
      .map((event) => `${event.organizationId}:${event.metric}:${event.periodStart}`),
  );

  return {
    dryRun: options.dryRun ?? true,
    destructive: false,
    tasks: {
      conversationProjections: conversations
        .map((conversation) => buildConversationProjectionFromState(state, conversation.id))
        .filter(Boolean).length,
      messageDeliveries: outboundMessages.length,
      billingEvents: (state.billingEvents ?? []).filter(
        (event) =>
          (!organizationId || event.organizationId === organizationId) &&
          (!event.externalCustomerId || !event.externalSubscriptionId || !event.rawPayloadJson),
      ).length,
      usageRollups: usageRollupKeys.size,
    },
  };
}
