export type Role = "owner" | "admin" | "manager" | "super_admin";

export type OrganizationStatus = "active" | "trial" | "suspended";

export type LeadStatus =
  | "new"
  | "unanswered"
  | "at_risk"
  | "in_conversation"
  | "booked"
  | "lost";

export type Provider =
  | "telegram"
  | "web_form"
  | "instagram"
  | "whatsapp"
  | "phone"
  | "clinic_database";

export type IntegrationStatus =
  | "active"
  | "pending"
  | "degraded"
  | "disconnected";

export type DataAccessContractStatus =
  | "draft"
  | "pending_it_approval"
  | "approved"
  | "revoked";

export type MessageDirection = "inbound" | "outbound";

export type SenderType = "patient" | "manager" | "automation" | "system";

export type LostReason =
  | "no_response"
  | "price"
  | "chose_competitor"
  | "spam"
  | "not_relevant";

export type AiInsightType =
  | "conversation_summary"
  | "reply_draft"
  | "risk_detection"
  | "intent_classification"
  | "weekly_insight";

export type AiGuardrailStatus = "approved" | "needs_review" | "blocked";

export interface AiGuardrailReview {
  status: AiGuardrailStatus;
  requiresHumanApproval: boolean;
  blockedTerms: string[];
  warnings: string[];
}

export type AutomationTrigger =
  | "first_inbound"
  | "outside_business_hours"
  | "sla_warning";

export type ConversationAction = "mark_booked" | "archive" | "snooze";

export type FeatureFlagKey =
  | "sla_push_alerts"
  | "sound_alerts"
  | "reply_templates"
  | "webhooks"
  | "partner_api";

export interface BusinessHours {
  start: string;
  end: string;
  weekdays: number[];
}

export interface User {
  id: string;
  email: string;
  emailVerifiedAt?: string;
  name: string;
  avatar: string;
  status: "active" | "invited" | "disabled";
  lastLoginAt: string;
  sessionVersion?: number;
}

export interface Organization {
  id: string;
  name: string;
  timezone: string;
  currency: "USD" | "EUR" | "UAH";
  averagePatientValue: number;
  businessHours: BusinessHours;
  status: OrganizationStatus;
  activatedAt?: string;
}

export interface Membership {
  id: string;
  userId: string;
  organizationId: string;
  role: Role;
  status: "active" | "invited" | "disabled";
  invitedBy?: string;
}

export interface TeamInviteToken {
  id: string;
  membershipId: string;
  email: string;
  organizationId: string;
  role: Role;
  tokenHash: string;
  invitedByUserId?: string;
  expiresAt: string;
  acceptedAt?: string;
  emailSentAt?: string;
  emailDeliveryStatus?: "pending" | "sent" | "skipped" | "failed";
  emailError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Lead {
  id: string;
  organizationId: string;
  name: string;
  phone?: string;
  email?: string;
  source: Provider;
  status: LeadStatus;
  assignedTo?: string;
  providerContactId: string;
  firstMessageAt: string;
  firstHumanResponseAt?: string;
  bookedAt?: string;
  lostReason?: LostReason;
  estimatedValue: number;
  createdAt: string;
  updatedAt: string;
}

export interface LeadStatusHistory {
  id: string;
  leadId: string;
  fromStatus: LeadStatus;
  toStatus: LeadStatus;
  changedBy: string;
  reason?: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  organizationId: string;
  leadId: string;
  provider: Provider;
  providerThreadId: string;
  status: "open" | "closed";
  lastMessageAt: string;
  aiSummary?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  direction: MessageDirection;
  senderType: SenderType;
  providerMessageId: string;
  text: string;
  payloadJson?: Record<string, unknown>;
  sentAt: string;
  deliveredAt?: string;
  readAt?: string;
}

export interface ReplyTemplate {
  id: string;
  organizationId: string;
  title: string;
  body: string;
  category: "booking" | "pricing" | "callback" | "aftercare" | "custom";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationReminder {
  id: string;
  organizationId: string;
  conversationId: string;
  leadId: string;
  assignedTo?: string;
  note: string;
  remindAt: string;
  status: "scheduled" | "completed" | "canceled";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureFlag {
  id: string;
  organizationId: string;
  key: FeatureFlagKey;
  enabled: boolean;
  updatedBy: string;
  updatedAt: string;
}

export interface OutgoingWebhookEndpoint {
  id: string;
  organizationId: string;
  name: string;
  url: string;
  events: string[];
  status: "active" | "paused" | "failed";
  lastAttemptAt?: string;
  lastSuccessAt?: string;
  lastError?: string;
  secretPreview: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerApiKey {
  id: string;
  organizationId: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  scopes: string[];
  status: "active" | "revoked";
  lastUsedAt?: string;
  createdBy: string;
  createdAt: string;
}

export interface WeeklyDigest {
  id: string;
  organizationId: string;
  periodStart: string;
  periodEnd: string;
  recipientEmail: string;
  subject: string;
  status: "draft" | "queued" | "sent" | "failed";
  metricsJson: Record<string, unknown>;
  createdAt: string;
  sentAt?: string;
}

export interface TeamNote {
  id: string;
  organizationId: string;
  conversationId?: string;
  leadId?: string;
  authorUserId: string;
  authorMembershipId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface Integration {
  id: string;
  organizationId: string;
  provider: Provider;
  status: IntegrationStatus;
  externalAccountId?: string;
  encryptedCredentials: string;
  webhookSecret: string;
  lastSyncAt?: string;
  errorState?: string;
  healthScore: number;
}

export interface DataAccessContract {
  id: string;
  organizationId: string;
  provider: Provider;
  status: DataAccessContractStatus;
  purpose: string;
  tables: string[];
  fields: string[];
  piiCategories: string[];
  retentionDays: number;
  readOnly: boolean;
  approvedByName?: string;
  approvedByEmail?: string;
  approvedAt?: string;
  revokedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  organizationId: string;
  provider: "stripe" | "paddle" | "manual";
  plan: "starter" | "growth" | "scale";
  status: "trialing" | "active" | "past_due" | "canceled" | "unpaid" | "read_only";
  currentPeriodStart: string;
  currentPeriodEnd: string;
  externalCustomerId: string;
  externalSubscriptionId: string;
}

export interface BillingEvent {
  id: string;
  organizationId?: string;
  subscriptionId?: string;
  outboxEventId?: string;
  provider: "stripe" | "paddle" | "manual";
  providerEventId: string;
  providerEventType: string;
  providerObjectId?: string;
  externalCustomerId?: string;
  externalSubscriptionId?: string;
  status: "processing" | "processed" | "skipped" | "failed";
  decision?: string;
  eventCreatedAt: string;
  rawPayloadJson?: Record<string, unknown>;
  processedAt?: string;
  retryCount: number;
  resultJson?: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
  lastErrorCode?: string;
  lastErrorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationRule {
  id: string;
  organizationId: string;
  trigger: AutomationTrigger;
  conditionsJson: Record<string, unknown>;
  template: string;
  active: boolean;
  createdBy: string;
}

export interface AiInsight {
  id: string;
  organizationId: string;
  leadId?: string;
  conversationId?: string;
  type: AiInsightType;
  resultJson: {
    summary?: string;
    intent?: string;
    riskScore?: number;
    recommendation?: string;
    bullets?: string[];
    draft?: string;
    guardrails?: AiGuardrailReview;
  };
  model: string;
  promptVersion: string;
  confidence: number;
  costEstimate: number;
  createdAt: string;
}

export interface UsageLimits {
  id: string;
  organizationId: string;
  maxUsers: number;
  maxIntegrations: number;
  monthlyMessages: number;
  monthlyAiRuns: number;
  periodUsageJson: {
    users: number;
    integrations: number;
    messages: number;
    aiRuns: number;
  };
}

export interface UsageEvent {
  id: string;
  organizationId: string;
  idempotencyKey: string;
  metric: "messages" | "aiRuns" | "users" | "integrations" | string;
  quantity: number;
  sourceEntityType: string;
  sourceEntityId: string;
  periodStart: string;
  periodEnd?: string;
  occurredAt: string;
  metadataJson?: Record<string, unknown>;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  organizationId?: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadataJson: Record<string, unknown>;
  ip: string;
  createdAt: string;
}

export interface IntegrationEvent {
  id: string;
  organizationId: string;
  provider: Provider;
  providerEventId: string;
  status: "received" | "processed" | "failed" | "dead_letter";
  payloadJson: Record<string, unknown>;
  retryCount: number;
  errorMessage?: string;
  createdAt: string;
  processedAt?: string;
}

export interface AppState {
  users: User[];
  organizations: Organization[];
  memberships: Membership[];
  inviteTokens?: TeamInviteToken[];
  leads: Lead[];
  leadStatusHistory: LeadStatusHistory[];
  conversations: Conversation[];
  messages: Message[];
  replyTemplates: ReplyTemplate[];
  conversationReminders: ConversationReminder[];
  featureFlags: FeatureFlag[];
  outgoingWebhookEndpoints: OutgoingWebhookEndpoint[];
  partnerApiKeys: PartnerApiKey[];
  weeklyDigests: WeeklyDigest[];
  teamNotes: TeamNote[];
  integrations: Integration[];
  dataAccessContracts: DataAccessContract[];
  subscriptions: Subscription[];
  automationRules: AutomationRule[];
  aiInsights: AiInsight[];
  usageLimits: UsageLimits[];
  usageEvents: UsageEvent[];
  auditLogs: AuditLog[];
  integrationEvents: IntegrationEvent[];
  billingEvents: BillingEvent[];
}

export interface DashboardOverview {
  newLeads: number;
  unanswered: number;
  atRisk: number;
  booked: number;
  lost: number;
  lostRevenue: number;
  averageResponseMinutes: number;
  totalLeads: number;
  conversionRate: number;
}

export interface CanonicalInboundMessage {
  organizationId: string;
  provider: Provider;
  providerEventId: string;
  providerMessageId: string;
  providerContactId: string;
  providerThreadId: string;
  patientName: string;
  patientPhone?: string;
  text: string;
  occurredAt: string;
  rawPayload: Record<string, unknown>;
}

// Trailing comment nudges the blob SHA so Git for Windows can materialize the loose object (see hash d3cd0369…).
