import { formatProvider, getMessagesForConversation, minutesBetween } from "@/domain/business-rules";
import type { AppState, ConversationReminder, Lead, Message } from "@/domain/types";
import { addAudit } from "./state-mutations";

export interface ReviewCandidate {
  leadId: string;
  conversationId: string;
  patientName: string;
  provider: string;
  bookedAt: string;
  estimatedValue: number;
  reviewRequested: boolean;
}

export interface RecallCandidate {
  leadId: string;
  conversationId: string;
  patientName: string;
  reason: string;
  lastTouchAt: string;
  estimatedValue: number;
  scheduled: boolean;
}

function createRuntimeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function reviewAlreadyRequested(state: AppState, leadId: string): boolean {
  return state.auditLogs.some(
    (log) => log.action === "review.requested" && log.entityId === leadId,
  );
}

function recallAlreadyScheduled(state: AppState, leadId: string): boolean {
  return state.conversationReminders.some(
    (reminder) => reminder.leadId === leadId && reminder.status === "scheduled",
  );
}

function latestMessageAt(messages: Message[], fallback: string): string {
  return messages
    .toSorted((left, right) => Date.parse(right.sentAt) - Date.parse(left.sentAt))
    .at(0)?.sentAt ?? fallback;
}

function leadConversation(state: AppState, lead: Lead) {
  return state.conversations.find((conversation) => conversation.leadId === lead.id);
}

export function buildReviewAndRecallQueue(
  state: AppState,
  organizationId: string,
  nowIso = new Date().toISOString(),
): { reviews: ReviewCandidate[]; recalls: RecallCandidate[] } {
  const organizationLeads = state.leads.filter((lead) => lead.organizationId === organizationId);
  const reviews = organizationLeads
    .filter((lead) => lead.status === "booked" && lead.bookedAt)
    .map((lead) => {
      const conversation = leadConversation(state, lead);
      if (!conversation) {
        return undefined;
      }

      return {
        leadId: lead.id,
        conversationId: conversation.id,
        patientName: lead.name,
        provider: formatProvider(lead.source),
        bookedAt: lead.bookedAt ?? lead.updatedAt,
        estimatedValue: lead.estimatedValue,
        reviewRequested: reviewAlreadyRequested(state, lead.id),
      };
    })
    .filter((item): item is ReviewCandidate => Boolean(item))
    .toSorted((left, right) => Date.parse(right.bookedAt) - Date.parse(left.bookedAt));

  const recalls = organizationLeads
    .filter((lead) => lead.status === "lost" || lead.status === "at_risk" || lead.status === "unanswered")
    .map((lead) => {
      const conversation = leadConversation(state, lead);
      if (!conversation) {
        return undefined;
      }

      const messages = getMessagesForConversation(state.messages, conversation.id);
      const lastTouchAt = latestMessageAt(messages, lead.updatedAt);
      const waitMinutes = minutesBetween(lastTouchAt, nowIso);
      const reason =
        lead.status === "lost"
          ? lead.lostReason === "price"
            ? "Price-sensitive lost lead"
            : "Lost without booked appointment"
          : waitMinutes >= 24 * 60
            ? "No reply in 24h"
            : "SLA risk needs callback";

      return {
        leadId: lead.id,
        conversationId: conversation.id,
        patientName: lead.name,
        reason,
        lastTouchAt,
        estimatedValue: lead.estimatedValue,
        scheduled: recallAlreadyScheduled(state, lead.id),
      };
    })
    .filter((item): item is RecallCandidate => Boolean(item))
    .toSorted((left, right) => right.estimatedValue - left.estimatedValue);

  return { reviews, recalls };
}

export function requestPatientReviewInState(
  state: AppState,
  input: {
    leadId: string;
    actorUserId: string;
    reviewUrl?: string;
    nowIso?: string;
  },
): AppState {
  const lead = state.leads.find((item) => item.id === input.leadId);
  if (!lead) {
    return state;
  }

  const conversation = leadConversation(state, lead);
  if (!conversation || reviewAlreadyRequested(state, lead.id)) {
    return state;
  }

  const nowIso = input.nowIso ?? new Date().toISOString();
  const reviewUrl = input.reviewUrl?.trim() || "https://dashdental.space/review";
  const reviewMessage: Message = {
    id: createRuntimeId("review-msg"),
    conversationId: conversation.id,
    direction: "outbound",
    senderType: "manager",
    providerMessageId: createRuntimeId("review-request"),
    text: `Hi ${lead.name}, thank you for visiting our clinic. If everything went well, would you leave a quick review? ${reviewUrl}`,
    sentAt: nowIso,
  };

  let nextState: AppState = {
    ...state,
    messages: [...state.messages, reviewMessage],
    conversations: state.conversations.map((item) =>
      item.id === conversation.id ? { ...item, lastMessageAt: nowIso } : item,
    ),
  };

  nextState = addAudit(nextState, {
    organizationId: lead.organizationId,
    actorUserId: input.actorUserId,
    action: "review.requested",
    entityType: "lead",
    entityId: lead.id,
    metadataJson: {
      conversationId: conversation.id,
      provider: lead.source,
      reviewUrl,
    },
  });

  return nextState;
}

export function scheduleRecallReminderInState(
  state: AppState,
  input: {
    leadId: string;
    actorUserId: string;
    remindAt: string;
    note?: string;
  },
): AppState {
  const lead = state.leads.find((item) => item.id === input.leadId);
  if (!lead) {
    return state;
  }

  const conversation = leadConversation(state, lead);
  if (!conversation || recallAlreadyScheduled(state, lead.id)) {
    return state;
  }

  const nowIso = new Date().toISOString();
  const reminder: ConversationReminder = {
    id: createRuntimeId("recall"),
    organizationId: lead.organizationId,
    conversationId: conversation.id,
    leadId: lead.id,
    assignedTo: lead.assignedTo,
    note: input.note?.trim() || "Recall patient and offer one concrete appointment window.",
    remindAt: input.remindAt,
    status: "scheduled",
    createdBy: input.actorUserId,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  let nextState: AppState = {
    ...state,
    conversationReminders: [reminder, ...state.conversationReminders],
  };

  nextState = addAudit(nextState, {
    organizationId: lead.organizationId,
    actorUserId: input.actorUserId,
    action: "recall.reminder_scheduled",
    entityType: "lead",
    entityId: lead.id,
    metadataJson: {
      conversationId: conversation.id,
      remindAt: input.remindAt,
    },
  });

  return nextState;
}
