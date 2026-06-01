import { estimateAiInsightCost } from "@/domain/business-rules";
import type { AiGuardrailReview, AiInsight, Lead, Message } from "@/domain/types";

const blockedPatterns: Array<{ label: string; pattern: RegExp }> = [
  { label: "diagnosis", pattern: /\b(diagnose|diagnosis|diagnosed)\b/i },
  { label: "prescription", pattern: /\b(prescribe|prescription|antibiotic|opioid)\b/i },
  { label: "guarantee", pattern: /\b(guarantee|guaranteed|cure|100%)\b/i },
  { label: "booking certainty", pattern: /\b(appointment is booked|we have booked|confirmed booking)\b/i },
  { label: "insurance promise", pattern: /\b(insurance will cover|covered by insurance|refund guaranteed)\b/i },
  { label: "unsafe triage", pattern: /\b(no need to see|ignore the pain|wait it out)\b/i },
];

function createRuntimeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function latestInboundMessage(messages: Message[]): Message | undefined {
  return messages
    .filter((message) => message.direction === "inbound")
    .toSorted((left, right) => Date.parse(right.sentAt) - Date.parse(left.sentAt))
    .at(0);
}

function classifyIntent(text: string): "urgent_pain" | "implant" | "price" | "callback" | "booking" {
  const normalized = text.toLowerCase();
  if (/\b(pain|toothache|swelling|emergency|bleeding)\b/.test(normalized)) {
    return "urgent_pain";
  }
  if (/\b(implant|veneer|invisalign|whitening)\b/.test(normalized)) {
    return "implant";
  }
  if (/\b(price|cost|how much|quote)\b/.test(normalized)) {
    return "price";
  }
  if (/\b(call|phone|callback|missed)\b/.test(normalized)) {
    return "callback";
  }

  return "booking";
}

export function evaluateAiReplyDraft(text: string): AiGuardrailReview {
  const normalized = normalizeText(text);
  const blockedTerms = blockedPatterns
    .filter((item) => item.pattern.test(normalized))
    .map((item) => item.label);
  const warnings: string[] = [];

  if (normalized.length > 700) {
    warnings.push("Keep patient replies under 700 characters.");
  }

  if (!/\?/.test(normalized)) {
    warnings.push("Ask one clear next-step question before sending.");
  }

  if (!/\b(can|could|would|which|what|when|phone|number)\b/i.test(normalized)) {
    warnings.push("Make the reply actionable for reception.");
  }

  return {
    status: blockedTerms.length > 0 ? "blocked" : warnings.length > 0 ? "needs_review" : "approved",
    requiresHumanApproval: true,
    blockedTerms,
    warnings,
  };
}

function buildDraftText(lead: Lead, messages: Message[]): string {
  const latest = latestInboundMessage(messages);
  const patientName = lead.name || "there";
  const intent = classifyIntent(`${lead.status} ${latest?.text ?? ""}`);

  if (lead.source === "phone") {
    return `Hi ${patientName}, we saw your missed call. We can help route this to the front desk now. What is the best number and time for a quick callback today?`;
  }

  if (intent === "urgent_pain") {
    return `Hi ${patientName}, thanks for reaching out. We can help you find the soonest available clinic time. Can you share your phone number so our front desk can call you right away?`;
  }

  if (intent === "implant") {
    return `Hi ${patientName}, we can help with that. The best next step is a short consultation so the team can confirm options and pricing. Would today afternoon or tomorrow morning work?`;
  }

  if (intent === "price") {
    return `Hi ${patientName}, pricing depends on the case, but we can give clear options after a short consult. Would you like us to offer the next available appointment windows?`;
  }

  if (intent === "callback") {
    return `Hi ${patientName}, we can call you back. What phone number should the front desk use, and is today or tomorrow better?`;
  }

  return `Hi ${patientName}, thanks for reaching out. We can help with this. Would today at 16:30 or tomorrow morning work for a quick appointment?`;
}

export function createGuardedAiReplyDraft(input: {
  organizationId: string;
  lead: Lead;
  conversationId: string;
  messages: Message[];
  nowIso: string;
}): { insight: AiInsight; review: AiGuardrailReview; text: string } {
  const draft = normalizeText(buildDraftText(input.lead, input.messages));
  let review = evaluateAiReplyDraft(draft);
  const text =
    review.status === "blocked"
      ? "Hi, thanks for reaching out. Our front desk can help with the next available appointment options. What phone number should we use to contact you?"
      : draft;

  if (review.status === "blocked") {
    review = evaluateAiReplyDraft(text);
  }

  const insight: AiInsight = {
    id: createRuntimeId("ai-draft"),
    organizationId: input.organizationId,
    leadId: input.lead.id,
    conversationId: input.conversationId,
    type: "reply_draft",
    resultJson: {
      draft: text,
      guardrails: review,
      intent: classifyIntent(input.messages.map((message) => message.text).join(" ")),
      recommendation: "Review the draft, adjust clinic-specific details, then send manually.",
    },
    model: "deterministic-guarded-draft-v1",
    promptVersion: "reply-draft-guardrails-v1",
    confidence: review.status === "approved" ? 0.84 : 0.7,
    costEstimate: estimateAiInsightCost(input.messages),
    createdAt: input.nowIso,
  };

  return { insight, review, text };
}
