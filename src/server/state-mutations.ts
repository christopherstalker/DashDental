import {
  createDeterministicAiSummary,
  deriveLeadStatus,
  getCurrentCalendarMonthPeriod,
  getMessagesForConversation,
  getPlanLimits,
} from "@/domain/business-rules";
import { isDemoOrganizationId } from "@/domain/seed-data";
import type {
  AiInsight,
  AppState,
  AutomationRule,
  IntegrationStatus,
  Lead,
  LeadStatus,
  LeadStatusHistory,
  Message,
  Provider,
  Subscription,
  UsageLimits,
} from "@/domain/types";

interface CreateLeadInput {
  organizationId: string;
  name: string;
  phone?: string;
  email?: string;
  source: Provider;
  providerEventId?: string;
  providerMessageId?: string;
  providerThreadId?: string;
  providerContactId?: string;
  assignedTo?: string;
  messageText?: string;
  actorUserId?: string;
  nowIso?: string;
}

function createRuntimeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function addAudit(
  state: AppState,
  input: {
    organizationId?: string;
    actorUserId?: string;
    action: string;
    entityType: string;
    entityId: string;
    metadataJson?: Record<string, unknown>;
  },
): AppState {
  return {
    ...state,
    auditLogs: [
      {
        id: createRuntimeId("audit"),
        organizationId: input.organizationId,
        actorUserId: input.actorUserId ?? "system",
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadataJson: input.metadataJson ?? {},
        ip: "127.0.0.1",
        createdAt: new Date().toISOString(),
      },
      ...state.auditLogs,
    ],
  };
}

export function createLeadFromInbound(state: AppState, input: CreateLeadInput): AppState {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const organization = state.organizations.find((item) => item.id === input.organizationId);
  const providerContactId = input.providerContactId ?? createRuntimeId(input.source);
  const providerThreadId = input.providerThreadId ?? providerContactId;
  const providerEventId = input.providerEventId ?? createRuntimeId(`${input.source}-event`);
  const providerMessageId = input.providerMessageId ?? providerEventId;
  const existingEvent = state.integrationEvents.find(
    (event) => event.provider === input.source && event.providerEventId === providerEventId,
  );

  if (existingEvent) {
    return state;
  }

  const existingLead = state.leads.find(
    (lead) =>
      lead.organizationId === input.organizationId &&
      lead.source === input.source &&
      lead.providerContactId === providerContactId,
  );
  const existingConversation =
    state.conversations.find(
      (conversation) =>
        conversation.organizationId === input.organizationId &&
        conversation.provider === input.source &&
        conversation.providerThreadId === providerThreadId,
    ) ??
    (existingLead
      ? state.conversations.find((conversation) => conversation.leadId === existingLead.id)
      : undefined);
  const leadId = existingLead?.id ?? createRuntimeId("lead");
  const conversationId = existingConversation?.id ?? createRuntimeId("conv");
  const hasMessage = state.messages.some(
    (message) =>
      message.conversationId === conversationId &&
      message.providerMessageId === providerMessageId,
  );

  if (hasMessage) {
    return {
      ...state,
      integrationEvents: [
        {
          id: createRuntimeId("evt"),
          organizationId: input.organizationId,
          provider: input.source,
          providerEventId,
          status: "processed",
          payloadJson: {
            duplicateMessage: true,
            normalized: true,
            text: input.messageText ?? "New patient inquiry",
          },
          retryCount: 0,
          createdAt: nowIso,
          processedAt: nowIso,
        },
        ...state.integrationEvents,
      ],
    };
  }

  const firstInboundRule = state.automationRules.find(
    (rule) =>
      rule.organizationId === input.organizationId &&
      rule.trigger === "first_inbound" &&
      rule.active,
  );
  const lead: Lead = existingLead ?? {
    id: leadId,
    organizationId: input.organizationId,
    name: input.name,
    phone: input.phone,
    email: input.email,
    source: input.source,
    status: "new",
    assignedTo: input.assignedTo ?? "user-manager",
    providerContactId,
    firstMessageAt: nowIso,
    estimatedValue: organization?.averagePatientValue ?? 500,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  const inboundMessage: Message = {
    id: createRuntimeId("msg-in"),
    conversationId,
    direction: "inbound",
    senderType: "patient",
    providerMessageId,
    text: input.messageText ?? "New patient inquiry",
    sentAt: nowIso,
  };
  const autoReply: Message | undefined = !existingLead && firstInboundRule
    ? {
        id: createRuntimeId("msg-auto"),
        conversationId,
        direction: "outbound",
        senderType: "automation",
        providerMessageId: createRuntimeId("auto"),
        text: firstInboundRule.template,
        sentAt: new Date(new Date(nowIso).getTime() + 5000).toISOString(),
        deliveredAt: new Date(new Date(nowIso).getTime() + 5000).toISOString(),
      }
    : undefined;

  let nextState: AppState = {
    ...state,
    leads: existingLead
      ? state.leads.map((item) =>
          item.id === existingLead.id
            ? {
                ...item,
                name: input.name || item.name,
                phone: input.phone ?? item.phone,
                email: input.email ?? item.email,
                updatedAt: nowIso,
              }
            : item,
        )
      : [lead, ...state.leads],
    conversations: existingConversation
      ? state.conversations.map((conversation) =>
          conversation.id === existingConversation.id
            ? { ...conversation, status: "open", lastMessageAt: nowIso }
            : conversation,
        )
      : [
          {
            id: conversationId,
            organizationId: input.organizationId,
            leadId,
            provider: input.source,
            providerThreadId,
            status: "open",
            lastMessageAt: nowIso,
          },
          ...state.conversations,
        ],
    messages: autoReply
      ? [...state.messages, inboundMessage, autoReply]
      : [...state.messages, inboundMessage],
    integrationEvents: [
      {
        id: createRuntimeId("evt"),
        organizationId: input.organizationId,
        provider: input.source,
        providerEventId,
        status: "processed",
        payloadJson: {
          normalized: true,
          text: inboundMessage.text,
          providerMessageId,
        },
        retryCount: 0,
        createdAt: nowIso,
        processedAt: nowIso,
      },
      ...state.integrationEvents,
    ],
  };

  nextState = addAudit(nextState, {
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "lead.created_from_inbound",
    entityType: "lead",
    entityId: lead.id,
    metadataJson: {
      source: input.source,
      autoReplySent: Boolean(autoReply),
    },
  });

  return nextState;
}

export function updateLeadStatus(
  state: AppState,
  input: {
    leadId: string;
    status: LeadStatus;
    reason?: string;
    actorUserId?: string;
    nowIso?: string;
  },
): AppState {
  const lead = state.leads.find((item) => item.id === input.leadId);
  if (!lead) {
    return state;
  }

  const nowIso = input.nowIso ?? new Date().toISOString();
  const history: LeadStatusHistory = {
    id: createRuntimeId("history"),
    leadId: lead.id,
    fromStatus: lead.status,
    toStatus: input.status,
    changedBy: input.actorUserId ?? "system",
    reason: input.reason,
    createdAt: nowIso,
  };
  let nextState: AppState = {
    ...state,
    leads: state.leads.map((item) =>
      item.id === lead.id
        ? {
            ...item,
            status: input.status,
            bookedAt: input.status === "booked" ? nowIso : item.bookedAt,
            lostReason: input.status === "lost" ? item.lostReason ?? "no_response" : item.lostReason,
            updatedAt: nowIso,
          }
        : item,
    ),
    conversations: state.conversations.map((conversation) =>
      conversation.leadId === lead.id
        ? {
            ...conversation,
            status: input.status === "booked" || input.status === "lost" ? "closed" : "open",
            lastMessageAt: nowIso,
          }
        : conversation,
    ),
    leadStatusHistory: [history, ...state.leadStatusHistory],
  };

  nextState = addAudit(nextState, {
    organizationId: lead.organizationId,
    actorUserId: input.actorUserId,
    action: "lead.status_changed",
    entityType: "lead",
    entityId: lead.id,
    metadataJson: {
      fromStatus: lead.status,
      toStatus: input.status,
      reason: input.reason,
    },
  });

  return nextState;
}

export function sendConversationMessage(
  state: AppState,
  input: {
    conversationId: string;
    text: string;
    actorUserId?: string;
    nowIso?: string;
    deliveredAt?: string;
    payloadJson?: Record<string, unknown>;
    providerMessageId?: string;
  },
): AppState {
  const conversation = state.conversations.find((item) => item.id === input.conversationId);
  if (!conversation || !input.text.trim()) {
    return state;
  }

  const nowIso = input.nowIso ?? new Date().toISOString();
  const providerMessageId = input.providerMessageId ?? createRuntimeId("local");
  const existingMessage = state.messages.find(
    (message) =>
      message.conversationId === conversation.id &&
      message.providerMessageId === providerMessageId,
  );
  if (existingMessage) {
    return state;
  }

  const message: Message = {
    id: createRuntimeId("msg"),
    conversationId: conversation.id,
    direction: "outbound",
    senderType: "manager",
    providerMessageId,
    text: input.text.trim(),
    payloadJson: input.payloadJson,
    sentAt: nowIso,
    deliveredAt: input.deliveredAt,
  };

  let nextState: AppState = {
    ...state,
    messages: [
      ...state.messages.map((item) =>
        item.conversationId === conversation.id &&
        item.direction === "inbound" &&
        !item.readAt
          ? { ...item, readAt: nowIso }
          : item,
      ),
      message,
    ],
    conversations: state.conversations.map((item) =>
      item.id === conversation.id ? { ...item, status: "open", lastMessageAt: nowIso } : item,
    ),
    leads: state.leads.map((lead) =>
      lead.id === conversation.leadId
        ? {
            ...lead,
            status: "in_conversation",
            firstHumanResponseAt: lead.firstHumanResponseAt ?? nowIso,
            updatedAt: nowIso,
          }
        : lead,
    ),
  };

  nextState = addAudit(nextState, {
    organizationId: conversation.organizationId,
    actorUserId: input.actorUserId,
    action: "message.sent",
    entityType: "conversation",
    entityId: conversation.id,
    metadataJson: {
      senderType: "manager",
      provider: conversation.provider,
      liveDelivery: Boolean(input.providerMessageId),
    },
  });

  return nextState;
}

export function toggleAutomationRule(
  state: AppState,
  input: { ruleId: string; actorUserId?: string },
): AppState {
  const rule = state.automationRules.find((item) => item.id === input.ruleId);
  if (!rule) {
    return state;
  }

  let nextState: AppState = {
    ...state,
    automationRules: state.automationRules.map((item) =>
      item.id === rule.id ? { ...item, active: !item.active } : item,
    ),
  };

  nextState = addAudit(nextState, {
    organizationId: rule.organizationId,
    actorUserId: input.actorUserId,
    action: "automation.toggled",
    entityType: "automation_rule",
    entityId: rule.id,
    metadataJson: {
      active: !rule.active,
    },
  });

  return nextState;
}

export function createAutomationRule(
  state: AppState,
  input: Partial<AutomationRule>,
): AppState {
  const organizationId =
    input.organizationId ??
    state.organizations.find((organization) => !isDemoOrganizationId(organization.id))?.id ??
    state.organizations[0]?.id;
  if (!organizationId) {
    return state;
  }

  const rule: AutomationRule = {
    id: createRuntimeId("auto"),
    organizationId,
    trigger: input.trigger ?? "first_inbound",
    conditionsJson: input.conditionsJson ?? {},
    template: input.template ?? "Thanks for reaching out. We will reply shortly.",
    active: input.active ?? true,
    createdBy: input.createdBy ?? "user-admin",
  };

  return {
    ...state,
    automationRules: [rule, ...state.automationRules],
  };
}

export function updateIntegrationStatus(
  state: AppState,
  input: {
    integrationId: string;
    status: IntegrationStatus;
    actorUserId?: string;
  },
): AppState {
  const integration = state.integrations.find((item) => item.id === input.integrationId);
  if (!integration) {
    return state;
  }

  let nextState: AppState = {
    ...state,
    integrations: state.integrations.map((item) =>
      item.id === integration.id
        ? {
            ...item,
            status: input.status,
            healthScore: input.status === "active" ? 96 : input.status === "pending" ? 45 : 0,
            lastSyncAt: input.status === "active" ? new Date().toISOString() : item.lastSyncAt,
            errorState: input.status === "active" ? undefined : item.errorState,
          }
        : item,
    ),
  };

  nextState = addAudit(nextState, {
    organizationId: integration.organizationId,
    actorUserId: input.actorUserId,
    action: "integration.status_changed",
    entityType: "integration",
    entityId: integration.id,
    metadataJson: {
      status: input.status,
    },
  });

  return nextState;
}

export function generateConversationSummary(
  state: AppState,
  input: { conversationId: string; actorUserId?: string; nowIso?: string },
): AppState {
  const conversation = state.conversations.find((item) => item.id === input.conversationId);
  if (!conversation) {
    return state;
  }

  const lead = state.leads.find((item) => item.id === conversation.leadId);
  const usage = state.usageLimits.find((item) => item.organizationId === conversation.organizationId);
  if (!lead || !usage || usage.periodUsageJson.aiRuns >= usage.monthlyAiRuns) {
    return state;
  }

  const conversationMessages = getMessagesForConversation(state.messages, conversation.id);
  const insight: AiInsight = createDeterministicAiSummary(
    conversation.organizationId,
    lead,
    conversation.id,
    conversationMessages,
    input.nowIso ?? new Date().toISOString(),
  );

  let nextState: AppState = {
    ...state,
    aiInsights: [insight, ...state.aiInsights],
    conversations: state.conversations.map((item) =>
      item.id === conversation.id ? { ...item, aiSummary: insight.resultJson.summary } : item,
    ),
  };

  nextState = addAudit(nextState, {
    organizationId: conversation.organizationId,
    actorUserId: input.actorUserId,
    action: "ai.summary_generated",
    entityType: "conversation",
    entityId: conversation.id,
    metadataJson: {
      promptVersion: insight.promptVersion,
      model: insight.model,
    },
  });

  return nextState;
}

export function changeSubscriptionPlan(
  state: AppState,
  input: {
    organizationId: string;
    plan: Subscription["plan"];
    actorUserId?: string;
  },
): AppState {
  const subscription = state.subscriptions.find(
    (item) => item.organizationId === input.organizationId,
  );
  const limits = getPlanLimits(input.plan);

  let nextState: AppState = {
    ...state,
    subscriptions: state.subscriptions.map((item) =>
      item.organizationId === input.organizationId ? { ...item, plan: input.plan } : item,
    ),
    usageLimits: state.usageLimits.map((item) =>
      item.organizationId === input.organizationId
        ? {
            ...item,
            maxUsers: limits.maxUsers,
            maxIntegrations: limits.maxIntegrations,
            monthlyMessages: limits.monthlyMessages,
            monthlyAiRuns: limits.monthlyAiRuns,
          }
        : item,
    ),
  };

  nextState = addAudit(nextState, {
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "subscription.plan_changed",
    entityType: "subscription",
    entityId: subscription?.id ?? input.organizationId,
    metadataJson: {
      plan: input.plan,
    },
  });

  return nextState;
}

export function activateManualSubscription(
  state: AppState,
  input: {
    organizationId: string;
    plan: Subscription["plan"];
    status?: Subscription["status"];
    actorUserId?: string;
    externalReference?: string;
    periodDays?: number;
    nowIso?: string;
  },
): AppState {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const status = input.status ?? "active";
  const periodEndIso = input.periodDays
    ? new Date(Date.parse(nowIso) + input.periodDays * 24 * 60 * 60 * 1000).toISOString()
    : getCurrentCalendarMonthPeriod(nowIso).endIso;

  const limits = getPlanLimits(input.plan);
  const existingSubscription = state.subscriptions.find(
    (item) => item.organizationId === input.organizationId,
  );
  const subscription: Subscription = {
    id: existingSubscription?.id ?? `sub-${input.organizationId}`,
    organizationId: input.organizationId,
    provider: "manual",
    plan: input.plan,
    status,
    currentPeriodStart: nowIso,
    currentPeriodEnd: periodEndIso,
    externalCustomerId: "manual-bank-transfer",
    externalSubscriptionId:
      input.externalReference?.trim() ||
      `manual-${input.organizationId}`,
  };
  const existingUsage = state.usageLimits.find(
    (item) => item.organizationId === input.organizationId,
  );
  const usage: UsageLimits = {
    id: existingUsage?.id ?? `usage-${input.organizationId}`,
    organizationId: input.organizationId,
    ...limits,
    periodUsageJson: existingUsage?.periodUsageJson ?? {
      users: 0,
      integrations: 0,
      messages: 0,
      aiRuns: 0,
    },
  };

  let nextState: AppState = {
    ...state,
    subscriptions: existingSubscription
      ? state.subscriptions.map((item) =>
          item.organizationId === input.organizationId ? subscription : item,
        )
      : [subscription, ...state.subscriptions],
    usageLimits: existingUsage
      ? state.usageLimits.map((item) =>
          item.organizationId === input.organizationId ? usage : item,
        )
      : [usage, ...state.usageLimits],
  };

  nextState = addAudit(nextState, {
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action:
      status === "active"
        ? "subscription.manual_activated"
        : "subscription.manual_status_changed",
    entityType: "subscription",
    entityId: subscription.id,
    metadataJson: {
      plan: input.plan,
      status,
      provider: "manual",
      externalReference: subscription.externalSubscriptionId,
      currentPeriodEnd: subscription.currentPeriodEnd,
      periodMode: input.periodDays ? "custom_days" : "calendar_month",
      previous: existingSubscription
        ? {
            plan: existingSubscription.plan,
            status: existingSubscription.status,
            currentPeriodEnd: existingSubscription.currentPeriodEnd,
          }
        : null,
    },
  });

  return nextState;
}

export function sweepSla(
  state: AppState,
  input: { organizationId: string; nowIso: string },
): { state: AppState; changedCount: number } {
  let changedCount = 0;
  let nextState = state;

  for (const lead of state.leads.filter((item) => item.organizationId === input.organizationId)) {
    const derivedStatus = deriveLeadStatus(lead, input.nowIso);
    if (
      derivedStatus !== lead.status &&
      !["booked", "lost", "in_conversation"].includes(lead.status)
    ) {
      nextState = updateLeadStatus(nextState, {
        leadId: lead.id,
        status: derivedStatus,
        reason: `SLA sweep at ${input.nowIso}`,
        actorUserId: "system",
        nowIso: input.nowIso,
      });
      changedCount += 1;
    }
  }

  return { state: nextState, changedCount };
}
