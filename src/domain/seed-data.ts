import type {
  AiInsight,
  AppState,
  AuditLog,
  AutomationRule,
  BillingEvent,
  Conversation,
  DataAccessContract,
  Integration,
  IntegrationEvent,
  Lead,
  LeadStatusHistory,
  Membership,
  Message,
  Organization,
  Subscription,
  UsageEvent,
  UsageLimits,
  User,
  TeamNote,
} from "./types";

export const demoNow = "2026-04-22T09:30:00.000Z";
export const defaultOrganizationId = "org-smile-studio";
export const demoOrganizationIds = [defaultOrganizationId, "org-bright-bite"] as const;

export function isDemoOrganizationId(organizationId?: string): boolean {
  return Boolean(
    organizationId &&
      demoOrganizationIds.includes(
        organizationId as (typeof demoOrganizationIds)[number],
      ),
  );
}

export const users: User[] = [
  {
    id: "system",
    email: "system@dentalrecovery.local",
    name: "System",
    avatar: "SY",
    status: "disabled",
    lastLoginAt: "2026-04-22T00:00:00.000Z",
  },
  {
    id: "user-owner",
    email: "maya@smilestudio.example",
    name: "Maya Chen",
    avatar: "MC",
    status: "active",
    lastLoginAt: "2026-04-22T08:45:00.000Z",
  },
  {
    id: "user-admin",
    email: "ops@smilestudio.example",
    name: "Elena Ortiz",
    avatar: "EO",
    status: "active",
    lastLoginAt: "2026-04-22T08:54:00.000Z",
  },
  {
    id: "user-manager",
    email: "frontdesk@smilestudio.example",
    name: "Noah Reed",
    avatar: "NR",
    status: "active",
    lastLoginAt: "2026-04-22T09:03:00.000Z",
  },
  {
    id: "user-super",
    email: "support@dentalrecovery.example",
    name: "Platform Admin",
    avatar: "PA",
    status: "active",
    lastLoginAt: "2026-04-22T09:10:00.000Z",
  },
];

export const organizations: Organization[] = [
  {
    id: defaultOrganizationId,
    name: "Smile Studio Dental",
    timezone: "Europe/Kiev",
    currency: "USD",
    averagePatientValue: 620,
    businessHours: {
      start: "09:00",
      end: "18:00",
      weekdays: [1, 2, 3, 4, 5],
    },
    status: "trial",
  },
  {
    id: "org-bright-bite",
    name: "Bright Bite Clinic",
    timezone: "Europe/Kiev",
    currency: "USD",
    averagePatientValue: 540,
    businessHours: {
      start: "10:00",
      end: "19:00",
      weekdays: [1, 2, 3, 4, 5, 6],
    },
    status: "active",
  },
];

export const memberships: Membership[] = [
  {
    id: "mem-owner",
    userId: "user-owner",
    organizationId: defaultOrganizationId,
    role: "owner",
    status: "active",
  },
  {
    id: "mem-admin",
    userId: "user-admin",
    organizationId: defaultOrganizationId,
    role: "admin",
    status: "active",
    invitedBy: "user-owner",
  },
  {
    id: "mem-manager",
    userId: "user-manager",
    organizationId: defaultOrganizationId,
    role: "manager",
    status: "active",
    invitedBy: "user-admin",
  },
  {
    id: "mem-super",
    userId: "user-super",
    organizationId: defaultOrganizationId,
    role: "super_admin",
    status: "active",
  },
];

export const leads: Lead[] = [
  {
    id: "lead-001",
    organizationId: defaultOrganizationId,
    name: "Sofia Miller",
    phone: "+1 312 555 0134",
    source: "telegram",
    status: "new",
    assignedTo: "user-manager",
    providerContactId: "tg-1001",
    firstMessageAt: "2026-04-22T09:26:00.000Z",
    estimatedValue: 620,
    createdAt: "2026-04-22T09:26:00.000Z",
    updatedAt: "2026-04-22T09:26:00.000Z",
  },
  {
    id: "lead-002",
    organizationId: defaultOrganizationId,
    name: "Artem Novak",
    phone: "+380 67 555 0198",
    source: "web_form",
    status: "at_risk",
    assignedTo: "user-manager",
    providerContactId: "web-3307",
    firstMessageAt: "2026-04-22T09:02:00.000Z",
    estimatedValue: 620,
    createdAt: "2026-04-22T09:02:00.000Z",
    updatedAt: "2026-04-22T09:17:00.000Z",
  },
  {
    id: "lead-003",
    organizationId: defaultOrganizationId,
    name: "Nadia Price",
    phone: "+1 415 555 0182",
    source: "telegram",
    status: "in_conversation",
    assignedTo: "user-manager",
    providerContactId: "tg-1003",
    firstMessageAt: "2026-04-22T08:52:00.000Z",
    firstHumanResponseAt: "2026-04-22T08:59:00.000Z",
    estimatedValue: 620,
    createdAt: "2026-04-22T08:52:00.000Z",
    updatedAt: "2026-04-22T09:21:00.000Z",
  },
  {
    id: "lead-004",
    organizationId: defaultOrganizationId,
    name: "Leo Hansen",
    phone: "+1 646 555 0177",
    source: "telegram",
    status: "booked",
    assignedTo: "user-admin",
    providerContactId: "tg-1004",
    firstMessageAt: "2026-04-21T15:10:00.000Z",
    firstHumanResponseAt: "2026-04-21T15:13:00.000Z",
    bookedAt: "2026-04-25T10:30:00.000Z",
    estimatedValue: 620,
    createdAt: "2026-04-21T15:10:00.000Z",
    updatedAt: "2026-04-21T15:38:00.000Z",
  },
  {
    id: "lead-005",
    organizationId: defaultOrganizationId,
    name: "Olivia Carter",
    phone: "+1 212 555 0111",
    source: "web_form",
    status: "lost",
    assignedTo: "user-manager",
    providerContactId: "web-3299",
    firstMessageAt: "2026-04-20T13:04:00.000Z",
    lostReason: "no_response",
    estimatedValue: 620,
    createdAt: "2026-04-20T13:04:00.000Z",
    updatedAt: "2026-04-21T13:04:00.000Z",
  },
  {
    id: "lead-006",
    organizationId: defaultOrganizationId,
    name: "Mark Jensen",
    email: "mark@example.com",
    source: "instagram",
    status: "unanswered",
    assignedTo: "user-admin",
    providerContactId: "ig-5521",
    firstMessageAt: "2026-04-22T09:19:00.000Z",
    estimatedValue: 620,
    createdAt: "2026-04-22T09:19:00.000Z",
    updatedAt: "2026-04-22T09:24:00.000Z",
  },
  {
    id: "lead-007",
    organizationId: defaultOrganizationId,
    name: "Iryna Kovalenko",
    phone: "+380 99 555 0144",
    source: "telegram",
    status: "booked",
    assignedTo: "user-manager",
    providerContactId: "tg-1007",
    firstMessageAt: "2026-04-19T10:15:00.000Z",
    firstHumanResponseAt: "2026-04-19T10:17:00.000Z",
    bookedAt: "2026-04-23T11:00:00.000Z",
    estimatedValue: 620,
    createdAt: "2026-04-19T10:15:00.000Z",
    updatedAt: "2026-04-19T10:33:00.000Z",
  },
  {
    id: "lead-008",
    organizationId: defaultOrganizationId,
    name: "Ben Walker",
    source: "whatsapp",
    status: "lost",
    assignedTo: "user-admin",
    providerContactId: "wa-7710",
    firstMessageAt: "2026-04-18T16:44:00.000Z",
    firstHumanResponseAt: "2026-04-18T17:22:00.000Z",
    lostReason: "price",
    estimatedValue: 620,
    createdAt: "2026-04-18T16:44:00.000Z",
    updatedAt: "2026-04-18T17:35:00.000Z",
  },
];

export const leadStatusHistory: LeadStatusHistory[] = [
  {
    id: "history-001",
    leadId: "lead-002",
    fromStatus: "unanswered",
    toStatus: "at_risk",
    changedBy: "system",
    reason: "No human response within 15 minutes",
    createdAt: "2026-04-22T09:17:00.000Z",
  },
  {
    id: "history-002",
    leadId: "lead-004",
    fromStatus: "in_conversation",
    toStatus: "booked",
    changedBy: "user-admin",
    reason: "Patient booked hygiene consultation",
    createdAt: "2026-04-21T15:38:00.000Z",
  },
  {
    id: "history-003",
    leadId: "lead-005",
    fromStatus: "at_risk",
    toStatus: "lost",
    changedBy: "system",
    reason: "No response after 24 business hours",
    createdAt: "2026-04-21T13:04:00.000Z",
  },
];

export const conversations: Conversation[] = leads.map((lead, index) => ({
  id: `conv-${String(index + 1).padStart(3, "0")}`,
  organizationId: lead.organizationId,
  leadId: lead.id,
  provider: lead.source,
  providerThreadId: `${lead.source}-${lead.providerContactId}`,
  status: lead.status === "lost" || lead.status === "booked" ? "closed" : "open",
  lastMessageAt: lead.updatedAt,
  aiSummary:
    lead.id === "lead-003"
      ? "Patient is comparing whitening options and wants a transparent estimate before booking."
      : undefined,
}));

export const messages: Message[] = [
  {
    id: "msg-001",
    conversationId: "conv-001",
    direction: "inbound",
    senderType: "patient",
    providerMessageId: "tg-msg-1001",
    text: "Hi, do you have a slot this week for a toothache?",
    sentAt: "2026-04-22T09:26:00.000Z",
  },
  {
    id: "msg-002",
    conversationId: "conv-001",
    direction: "outbound",
    senderType: "automation",
    providerMessageId: "auto-msg-1001",
    text: "Thanks for reaching out. A coordinator will reply shortly. If this is urgent, please include your phone number.",
    sentAt: "2026-04-22T09:26:05.000Z",
    deliveredAt: "2026-04-22T09:26:06.000Z",
  },
  {
    id: "msg-003",
    conversationId: "conv-002",
    direction: "inbound",
    senderType: "patient",
    providerMessageId: "web-msg-3307",
    text: "I need a consultation for an implant. Can someone call me today?",
    sentAt: "2026-04-22T09:02:00.000Z",
  },
  {
    id: "msg-004",
    conversationId: "conv-003",
    direction: "inbound",
    senderType: "patient",
    providerMessageId: "tg-msg-1003-a",
    text: "How much is whitening and do you have evening appointments?",
    sentAt: "2026-04-22T08:52:00.000Z",
  },
  {
    id: "msg-005",
    conversationId: "conv-003",
    direction: "outbound",
    senderType: "manager",
    providerMessageId: "tg-msg-1003-b",
    text: "We do. Whitening starts at $290 after a short exam. I can offer Thursday 18:20 or Friday 17:40.",
    sentAt: "2026-04-22T08:59:00.000Z",
    deliveredAt: "2026-04-22T08:59:02.000Z",
    readAt: "2026-04-22T09:00:00.000Z",
  },
  {
    id: "msg-006",
    conversationId: "conv-003",
    direction: "inbound",
    senderType: "patient",
    providerMessageId: "tg-msg-1003-c",
    text: "Friday may work. Does it include polishing?",
    sentAt: "2026-04-22T09:21:00.000Z",
  },
  {
    id: "msg-007",
    conversationId: "conv-004",
    direction: "inbound",
    senderType: "patient",
    providerMessageId: "tg-msg-1004-a",
    text: "I need a hygiene appointment.",
    sentAt: "2026-04-21T15:10:00.000Z",
  },
  {
    id: "msg-008",
    conversationId: "conv-004",
    direction: "outbound",
    senderType: "manager",
    providerMessageId: "tg-msg-1004-b",
    text: "We have Saturday 10:30. Would you like me to reserve it?",
    sentAt: "2026-04-21T15:13:00.000Z",
  },
  {
    id: "msg-009",
    conversationId: "conv-004",
    direction: "inbound",
    senderType: "patient",
    providerMessageId: "tg-msg-1004-c",
    text: "Yes, please book it.",
    sentAt: "2026-04-21T15:37:00.000Z",
  },
  {
    id: "msg-010",
    conversationId: "conv-005",
    direction: "inbound",
    senderType: "patient",
    providerMessageId: "web-msg-3299",
    text: "Do you treat gum bleeding? I would like a price.",
    sentAt: "2026-04-20T13:04:00.000Z",
  },
  {
    id: "msg-011",
    conversationId: "conv-006",
    direction: "inbound",
    senderType: "patient",
    providerMessageId: "ig-msg-5521",
    text: "Saw your Invisalign post. Is the first consultation free?",
    sentAt: "2026-04-22T09:19:00.000Z",
  },
];

export const integrations: Integration[] = [
  {
    id: "int-telegram",
    organizationId: defaultOrganizationId,
    provider: "telegram",
    status: "pending",
    encryptedCredentials: "",
    webhookSecret: "tg-webhook-secret",
    errorState: "Add a Telegram bot token and webhook secret to activate live inbox delivery.",
    healthScore: 18,
  },
  {
    id: "int-web-form",
    organizationId: defaultOrganizationId,
    provider: "web_form",
    status: "active",
    encryptedCredentials: "enc:web-form-key-redacted",
    webhookSecret: "web-form-secret",
    lastSyncAt: "2026-04-22T09:25:00.000Z",
    healthScore: 97,
  },
  {
    id: "int-instagram",
    organizationId: defaultOrganizationId,
    provider: "instagram",
    status: "pending",
    encryptedCredentials: "",
    webhookSecret: "meta-webhook-secret",
    errorState: "Add Meta page credentials, verify the webhook, then move the app to Live mode.",
    healthScore: 14,
  },
  {
    id: "int-whatsapp",
    organizationId: defaultOrganizationId,
    provider: "whatsapp",
    status: "disconnected",
    encryptedCredentials: "",
    webhookSecret: "wa-webhook-secret",
    errorState: "Add WhatsApp Cloud API token, phone number ID, and verify token to go live.",
    healthScore: 0,
  },
  {
    id: "int-clinic-db",
    organizationId: defaultOrganizationId,
    provider: "clinic_database",
    status: "pending",
    encryptedCredentials: "env:CLINIC_DATABASE_URL",
    webhookSecret: "not-used-read-only-sync",
    errorState: "Set CLINIC_DATABASE_URL and expose dental_recovery_leads view",
    healthScore: 35,
  },
];

export const dataAccessContracts: DataAccessContract[] = [
  {
    id: "dac-clinic-db-001",
    organizationId: defaultOrganizationId,
    provider: "clinic_database",
    status: "pending_it_approval",
    purpose:
      "Read lead intake, response, booking, and loss signals for Dash Dental dashboard analytics.",
    tables: ["dental_recovery_leads"],
    fields: [
      "external_id",
      "name",
      "phone",
      "email",
      "source",
      "status",
      "assigned_to",
      "first_message_at",
      "first_human_response_at",
      "booked_at",
      "lost_reason",
      "estimated_value",
      "updated_at",
      "last_message_text",
    ],
    piiCategories: [
      "Patient contact details",
      "Lead status and appointment metadata",
      "Last inbound message snippet",
    ],
    retentionDays: 365,
    readOnly: true,
    createdBy: "user-owner",
    createdAt: "2026-04-22T09:20:00.000Z",
    updatedAt: "2026-04-22T09:20:00.000Z",
  },
];

export const subscriptions: Subscription[] = [
  {
    id: "sub-001",
    organizationId: defaultOrganizationId,
    provider: "stripe",
    plan: "growth",
    status: "trialing",
    currentPeriodStart: "2026-04-15T00:00:00.000Z",
    currentPeriodEnd: "2026-05-15T00:00:00.000Z",
    externalCustomerId: "cus_demo_001",
    externalSubscriptionId: "sub_demo_001",
  },
];

function getLaunchReadySubscriptions(now = new Date()): Subscription[] {
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - 1);
  const end = new Date(now);
  end.setUTCDate(end.getUTCDate() + 14);

  return subscriptions.map((subscription) =>
    subscription.organizationId === defaultOrganizationId
      ? {
          ...subscription,
          currentPeriodStart: start.toISOString(),
          currentPeriodEnd: end.toISOString(),
        }
      : subscription,
  );
}

export const automationRules: AutomationRule[] = [
  {
    id: "auto-001",
    organizationId: defaultOrganizationId,
    trigger: "first_inbound",
    conditionsJson: {
      channels: ["telegram", "web_form"],
      cooldownHours: 24,
    },
    template:
      "Thanks for reaching out. A coordinator will reply shortly. If this is urgent, please include your phone number.",
    active: true,
    createdBy: "user-admin",
  },
  {
    id: "auto-002",
    organizationId: defaultOrganizationId,
    trigger: "outside_business_hours",
    conditionsJson: {
      channels: ["telegram", "web_form"],
    },
    template:
      "Our clinic is closed now. We will reply at opening time. For urgent pain, please write PAIN and your phone number.",
    active: true,
    createdBy: "user-admin",
  },
  {
    id: "auto-003",
    organizationId: defaultOrganizationId,
    trigger: "sla_warning",
    conditionsJson: {
      minutesWithoutHumanReply: 5,
    },
    template: "Front desk alert: new patient is still waiting for a human reply.",
    active: false,
    createdBy: "user-owner",
  },
];

export const aiInsights: AiInsight[] = [
  {
    id: "ai-001",
    organizationId: defaultOrganizationId,
    leadId: "lead-003",
    conversationId: "conv-003",
    type: "conversation_summary",
    resultJson: {
      summary:
        "Patient is interested in whitening, prefers Friday evening, and needs pricing clarity.",
      intent: "price_question",
      riskScore: 37,
      recommendation:
        "Confirm polishing details and offer one concrete Friday slot.",
    },
    model: "gpt-5.4-mini",
    promptVersion: "summary-v1",
    confidence: 0.86,
    costEstimate: 0.012,
    createdAt: "2026-04-22T09:22:00.000Z",
  },
  {
    id: "ai-002",
    organizationId: defaultOrganizationId,
    type: "weekly_insight",
    resultJson: {
      summary:
        "Web form leads wait 2.6x longer than Telegram leads and account for most no-response losses.",
      bullets: [
        "Assign one owner to web form alerts during clinic hours.",
        "Keep first human reply under 10 minutes for implant inquiries.",
        "Use a price range plus appointment CTA instead of asking patients to call.",
      ],
      recommendation: "Move web form notifications into the same front desk inbox.",
    },
    model: "gpt-5.4-mini",
    promptVersion: "weekly-insight-v1",
    confidence: 0.82,
    costEstimate: 0.028,
    createdAt: "2026-04-22T08:30:00.000Z",
  },
];

export const usageLimits: UsageLimits[] = [
  {
    id: "usage-001",
    organizationId: defaultOrganizationId,
    maxUsers: 10,
    maxIntegrations: 5,
    monthlyMessages: 10000,
    monthlyAiRuns: 600,
    periodUsageJson: {
      users: 3,
      integrations: 1,
      messages: 811,
      aiRuns: 74,
    },
  },
];

export const usageEvents: UsageEvent[] = [];

export const auditLogs: AuditLog[] = [
  {
    id: "audit-001",
    organizationId: defaultOrganizationId,
    actorUserId: "user-admin",
    action: "lead.status_changed",
    entityType: "lead",
    entityId: "lead-004",
    metadataJson: {
      fromStatus: "in_conversation",
      toStatus: "booked",
    },
    ip: "203.0.113.4",
    createdAt: "2026-04-21T15:38:00.000Z",
  },
  {
    id: "audit-002",
    organizationId: defaultOrganizationId,
    actorUserId: "user-owner",
    action: "subscription.portal_opened",
    entityType: "subscription",
    entityId: "sub-001",
    metadataJson: {
      plan: "growth",
    },
    ip: "203.0.113.5",
    createdAt: "2026-04-22T08:12:00.000Z",
  },
];

export const billingEvents: BillingEvent[] = [];

export const integrationEvents: IntegrationEvent[] = [
  {
    id: "evt-001",
    organizationId: defaultOrganizationId,
    provider: "telegram",
    providerEventId: "tg-update-55100",
    status: "processed",
    payloadJson: {
      message: {
        text: "Hi, do you have a slot this week for a toothache?",
      },
    },
    retryCount: 0,
    createdAt: "2026-04-22T09:26:00.000Z",
    processedAt: "2026-04-22T09:26:01.000Z",
  },
  {
    id: "evt-002",
    organizationId: defaultOrganizationId,
    provider: "instagram",
    providerEventId: "ig-test-1009",
    status: "failed",
    payloadJson: {
      object: "instagram",
    },
    retryCount: 3,
    errorMessage: "Meta app review pending for production messages",
    createdAt: "2026-04-22T08:51:00.000Z",
  },
  {
    id: "evt-003",
    organizationId: defaultOrganizationId,
    provider: "clinic_database",
    providerEventId: "clinic-db-sync-setup",
    status: "received",
    payloadJson: {
      requiredView: "dental_recovery_leads",
      mode: "read_only",
    },
    retryCount: 0,
    createdAt: "2026-04-22T09:22:00.000Z",
  },
];

export const teamNotes: TeamNote[] = [
  {
    id: "note-001",
    organizationId: defaultOrganizationId,
    conversationId: "conv-001",
    leadId: "lead-001",
    authorUserId: "user-manager",
    authorMembershipId: "mem-manager",
    body: "Patient asked for a slot this week. Offer two concrete appointment times before lunch.",
    createdAt: "2026-04-22T09:31:00.000Z",
    updatedAt: "2026-04-22T09:31:00.000Z",
  },
  {
    id: "note-002",
    organizationId: defaultOrganizationId,
    conversationId: "conv-004",
    leadId: "lead-004",
    authorUserId: "user-admin",
    authorMembershipId: "mem-admin",
    body: "High-value implant consult. If no reply in 15 min, owner wants a manual call attempt.",
    createdAt: "2026-04-22T10:04:00.000Z",
    updatedAt: "2026-04-22T10:04:00.000Z",
  },
];

export function getInitialAppState(): AppState {
  return {
    users,
    organizations,
    memberships,
    inviteTokens: [],
    leads,
    leadStatusHistory,
    conversations,
    messages,
    teamNotes,
    integrations,
    dataAccessContracts,
    subscriptions: getLaunchReadySubscriptions(),
    automationRules,
    aiInsights,
    usageLimits,
    usageEvents,
    auditLogs,
    integrationEvents,
    billingEvents,
  };
}
