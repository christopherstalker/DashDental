import type {
  AiInsight,
  AppState,
  BusinessHours,
  CanonicalInboundMessage,
  DashboardOverview,
  Lead,
  LeadStatus,
  Message,
  Organization,
  Provider,
  Role,
  Subscription,
} from "./types";

function createRuntimeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const SLA_WARNING_MINUTES = 5;
export const AT_RISK_MINUTES = 15;
export const LOST_BUSINESS_HOURS = 24;
export const FREE_TRIAL_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

const roleRank: Record<Role, number> = {
  manager: 1,
  admin: 2,
  owner: 3,
  super_admin: 4,
};

const planLimits = {
  starter: {
    maxUsers: 4,
    maxIntegrations: 2,
    monthlyMessages: 2000,
    monthlyAiRuns: 120,
  },
  growth: {
    maxUsers: 10,
    maxIntegrations: 5,
    monthlyMessages: 10000,
    monthlyAiRuns: 600,
  },
  scale: {
    maxUsers: 30,
    maxIntegrations: 12,
    monthlyMessages: 40000,
    monthlyAiRuns: 2500,
  },
} as const;

const planCatalog = {
  starter: {
    monthlyPrice: 30,
    onboardingFee: 0,
    label: "Starter",
    summary: "Single-clinic launch with live inbox, one front-desk pod, and clear SLA discipline.",
    included: [
      "1 clinic workspace",
      "Telegram + one additional live channel",
      "Shared inbox and recovery dashboard",
      "Weekly owner summary and AI reply assist",
    ],
  },
  growth: {
    monthlyPrice: 100,
    onboardingFee: 0,
    label: "Growth",
    summary: "Best fit for busy clinics that want WhatsApp, Instagram, and full recovery operations.",
    included: [
      "Multi-channel inbox for front desk and treatment coordinators",
      "Clinic DB sync, AI insights, and compliance export",
      "Queue automation, alerts, and weekly leadership review",
      "Priority implementation support",
    ],
  },
  scale: {
    monthlyPrice: 250,
    onboardingFee: 0,
    label: "Scale",
    summary: "Multi-location revenue recovery with higher throughput, more seats, and operational oversight.",
    included: [
      "Multi-location rollout and deeper usage capacity",
      "Advanced staffing coverage and leadership reporting",
      "Dedicated onboarding and launch playbook",
      "Preferred support and roadmap access",
    ],
  },
} as const;

export function canAccess(required: Role, actual: Role): boolean {
  if (actual === "super_admin") {
    return true;
  }

  if (required === "super_admin") {
    return false;
  }

  return roleRank[actual] >= roleRank[required];
}

export function minutesBetween(startIso: string, endIso: string): number {
  return Math.max(
    0,
    Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000),
  );
}

export function isBusinessTime(dateIso: string, businessHours: BusinessHours): boolean {
  const date = new Date(dateIso);
  const weekday = date.getUTCDay();
  if (!businessHours.weekdays.includes(weekday)) {
    return false;
  }

  const current = date.toISOString().slice(11, 16);
  return current >= businessHours.start && current <= businessHours.end;
}

export function getLeadResponseMinutes(lead: Lead): number | null {
  if (!lead.firstHumanResponseAt) {
    return null;
  }

  return minutesBetween(lead.firstMessageAt, lead.firstHumanResponseAt);
}

export function getLeadRiskLevel(
  lead: Lead,
  nowIso: string,
): "clear" | "watch" | "high" | "critical" {
  if (lead.status === "lost") {
    return "critical";
  }

  if (lead.status === "booked" || lead.firstHumanResponseAt) {
    return "clear";
  }

  const waitingMinutes = minutesBetween(lead.firstMessageAt, nowIso);

  if (waitingMinutes >= AT_RISK_MINUTES || lead.status === "at_risk") {
    return "critical";
  }

  if (waitingMinutes >= SLA_WARNING_MINUTES || lead.status === "unanswered") {
    return "high";
  }

  return "watch";
}

export function deriveLeadStatus(lead: Lead, nowIso: string): LeadStatus {
  if (lead.status === "booked" || lead.status === "lost") {
    return lead.status;
  }

  if (lead.firstHumanResponseAt) {
    return "in_conversation";
  }

  const waitingMinutes = minutesBetween(lead.firstMessageAt, nowIso);

  if (waitingMinutes >= AT_RISK_MINUTES) {
    return "at_risk";
  }

  if (waitingMinutes >= SLA_WARNING_MINUTES) {
    return "unanswered";
  }

  return "new";
}

export function calculateDashboardOverview(
  state: Pick<AppState, "leads" | "organizations">,
  organizationId: string,
  nowIso: string,
): DashboardOverview {
  const organization = state.organizations.find((org) => org.id === organizationId);
  const averagePatientValue = organization?.averagePatientValue ?? 500;
  const scopedLeads = state.leads.filter((lead) => lead.organizationId === organizationId);
  const derivedStatuses = scopedLeads.map((lead) => deriveLeadStatus(lead, nowIso));
  const responseTimes = scopedLeads
    .map(getLeadResponseMinutes)
    .filter((value): value is number => value !== null);
  const booked = derivedStatuses.filter((status) => status === "booked").length;
  const lost = derivedStatuses.filter((status) => status === "lost").length;
  const lostByNoResponse = scopedLeads.filter(
    (lead) => lead.status === "lost" && lead.lostReason === "no_response",
  ).length;
  const totalLeads = scopedLeads.length;

  return {
    newLeads: derivedStatuses.filter((status) => status === "new").length,
    unanswered: derivedStatuses.filter((status) => status === "unanswered").length,
    atRisk: derivedStatuses.filter((status) => status === "at_risk").length,
    booked,
    lost,
    lostRevenue: lostByNoResponse * averagePatientValue,
    averageResponseMinutes: responseTimes.length
      ? Math.round(responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length)
      : 0,
    totalLeads,
    conversionRate: totalLeads ? Math.round((booked / totalLeads) * 100) : 0,
  };
}

export function getMessagesForConversation(
  messages: Message[],
  conversationId: string,
): Message[] {
  return messages
    .filter((message) => message.conversationId === conversationId)
    .toSorted((left, right) => new Date(left.sentAt).getTime() - new Date(right.sentAt).getTime());
}

export function getFirstHumanReply(messages: Message[]): Message | undefined {
  return messages
    .filter((message) => message.direction === "outbound" && message.senderType === "manager")
    .toSorted((left, right) => new Date(left.sentAt).getTime() - new Date(right.sentAt).getTime())
    .at(0);
}

export function shouldSendAutoReply(
  lead: Lead | undefined,
  recentMessages: Message[],
  provider: Provider,
): boolean {
  if (lead?.firstHumanResponseAt) {
    return false;
  }

  const lastAutoReply = recentMessages
    .filter((message) => message.senderType === "automation")
    .toSorted((left, right) => new Date(right.sentAt).getTime() - new Date(left.sentAt).getTime())
    .at(0);

  if (!lastAutoReply) {
    return provider === "telegram" || provider === "web_form";
  }

  return minutesBetween(lastAutoReply.sentAt, new Date().toISOString()) >= 1440;
}

export function estimateAiInsightCost(messages: Message[]): number {
  const characterCount = messages.reduce((sum, message) => sum + message.text.length, 0);
  return Number(Math.max(0.006, characterCount * 0.000025).toFixed(3));
}

export function createDeterministicAiSummary(
  organizationId: string,
  lead: Lead,
  conversationId: string,
  messages: Message[],
  nowIso: string,
): AiInsight {
  const inboundText = messages
    .filter((message) => message.direction === "inbound")
    .map((message) => message.text.toLowerCase())
    .join(" ");
  const riskScore =
    lead.status === "at_risk" || !lead.firstHumanResponseAt
      ? 78
      : inboundText.includes("price") || inboundText.includes("cost")
        ? 51
        : 28;
  const intent = inboundText.includes("implant")
    ? "implant_consultation"
    : inboundText.includes("pain") || inboundText.includes("toothache")
      ? "urgent_pain"
      : inboundText.includes("price") || inboundText.includes("cost")
        ? "price_question"
        : "booking";

  return {
    id: createRuntimeId("ai"),
    organizationId,
    leadId: lead.id,
    conversationId,
    type: "conversation_summary",
    resultJson: {
      summary: `${lead.name} is asking about ${intent.replaceAll("_", " ")} and needs a concrete next step.`,
      intent,
      riskScore,
      recommendation:
        riskScore >= 70
          ? "Reply with one available slot and ask for a phone number now."
          : "Confirm availability and move the patient to a booked appointment.",
    },
    model: "gpt-5.4-mini",
    promptVersion: "summary-v1",
    confidence: riskScore >= 70 ? 0.88 : 0.81,
    costEstimate: estimateAiInsightCost(messages),
    createdAt: nowIso,
  };
}

export function getPlanLimits(plan: keyof typeof planLimits) {
  return planLimits[plan];
}

export function getPlanCatalog(plan: keyof typeof planCatalog) {
  return planCatalog[plan];
}

export function getCurrentCalendarMonthPeriod(nowIso = new Date().toISOString()) {
  const now = new Date(nowIso);
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

export function getFreeTrialPeriod(nowIso = new Date().toISOString(), trialDays = FREE_TRIAL_DAYS) {
  const parsedStart = Date.parse(nowIso);
  const start = Number.isFinite(parsedStart) ? new Date(parsedStart) : new Date();
  const end = new Date(start.getTime() + trialDays * DAY_MS);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

export function getSubscriptionDaysRemaining(
  subscription: Pick<Subscription, "currentPeriodEnd"> | null | undefined,
  nowIso = new Date().toISOString(),
): number {
  if (!subscription) {
    return 0;
  }

  const endTime = Date.parse(subscription.currentPeriodEnd);
  const nowTime = Date.parse(nowIso);
  if (!Number.isFinite(endTime) || !Number.isFinite(nowTime) || endTime <= nowTime) {
    return 0;
  }

  return Math.ceil((endTime - nowTime) / DAY_MS);
}

export function isSubscriptionPeriodCurrent(
  subscription: Pick<Subscription, "currentPeriodEnd" | "currentPeriodStart"> | null | undefined,
  nowIso = new Date().toISOString(),
): boolean {
  if (!subscription) {
    return false;
  }

  const startTime = Date.parse(subscription.currentPeriodStart);
  const endTime = Date.parse(subscription.currentPeriodEnd);
  const nowTime = Date.parse(nowIso);

  return (
    Number.isFinite(startTime) &&
    Number.isFinite(endTime) &&
    Number.isFinite(nowTime) &&
    startTime <= nowTime &&
    nowTime < endTime
  );
}

export function isSubscriptionPaidActive(
  subscription: Pick<Subscription, "status" | "currentPeriodEnd" | "currentPeriodStart"> | null | undefined,
  nowIso = new Date().toISOString(),
): boolean {
  return subscription?.status === "active" && isSubscriptionPeriodCurrent(subscription, nowIso);
}

export function isSubscriptionAccessActive(
  subscription: Pick<Subscription, "status" | "currentPeriodEnd" | "currentPeriodStart"> | null | undefined,
  nowIso = new Date().toISOString(),
): boolean {
  return (
    (
      subscription?.status === "active" ||
      subscription?.status === "trialing" ||
      subscription?.status === "past_due" ||
      subscription?.status === "canceled" ||
      subscription?.status === "unpaid" ||
      subscription?.status === "read_only"
    ) &&
    isSubscriptionPeriodCurrent(subscription, nowIso)
  );
}

export function getSubscriptionAccessStatus(
  subscription: Pick<Subscription, "status" | "currentPeriodEnd" | "currentPeriodStart"> | null | undefined,
  nowIso = new Date().toISOString(),
): Subscription["status"] | "expired" | "not_configured" {
  if (!subscription) {
    return "not_configured";
  }

  if (
    (subscription.status === "active" || subscription.status === "trialing") &&
    !isSubscriptionPeriodCurrent(subscription, nowIso)
  ) {
    return "expired";
  }

  return subscription.status;
}

export function normalizeWebFormPayload(
  organizationId: string,
  payload: Record<string, unknown>,
): CanonicalInboundMessage {
  const nowIso = new Date().toISOString();
  const phone = typeof payload.phone === "string" ? payload.phone : undefined;
  const name = typeof payload.name === "string" ? payload.name : "Website visitor";
  const text =
    typeof payload.message === "string"
      ? payload.message
      : "New website form inquiry";
  const providerEventId =
    typeof payload.eventId === "string" ? payload.eventId : createRuntimeId("web");
  const providerContactId = phone ?? providerEventId;

  return {
    organizationId,
    provider: "web_form",
    providerEventId,
    providerMessageId: providerEventId,
    providerContactId,
    providerThreadId: providerContactId,
    patientName: name,
    patientPhone: phone,
    text,
    occurredAt: nowIso,
    rawPayload: payload,
  };
}

export function formatProvider(provider: Provider): string {
  const labels: Record<Provider, string> = {
    telegram: "Telegram",
    web_form: "Web form",
    instagram: "Instagram",
    whatsapp: "WhatsApp",
    clinic_database: "Clinic DB",
  };

  return labels[provider];
}

export function formatLeadStatus(status: LeadStatus): string {
  const labels: Record<LeadStatus, string> = {
    new: "New",
    unanswered: "Unanswered",
    at_risk: "At risk",
    in_conversation: "In conversation",
    booked: "Booked",
    lost: "Lost",
  };

  return labels[status];
}

export function formatCurrency(value: number, organization?: Organization): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: organization?.currency ?? "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
