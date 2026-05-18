import { createEmptyAppState } from "@/domain/empty-app-state";
import {
  defaultOrganizationId,
  getInitialAppState,
  isDemoOrganizationId,
} from "@/domain/seed-data";
import { getFreeTrialPeriod } from "@/domain/business-rules";
import type { AppState, DataAccessContract, Organization, Subscription, UsageLimits } from "@/domain/types";
import { isDemoActionsEnabled } from "./feature-flags";

const DEMO_USER_IDS = new Set(["user-owner", "user-admin", "user-manager", "user-super"]);
const DEMO_LEAD_IDS = new Set([
  "lead-001",
  "lead-002",
  "lead-003",
  "lead-004",
  "lead-005",
  "lead-006",
  "lead-007",
  "lead-008",
]);
const DEMO_CONVERSATION_IDS = new Set([
  "conv-001",
  "conv-002",
  "conv-003",
  "conv-004",
  "conv-005",
  "conv-006",
  "conv-007",
  "conv-008",
]);
const DEMO_MESSAGE_IDS = new Set([
  "msg-001",
  "msg-002",
  "msg-003",
  "msg-004",
  "msg-005",
  "msg-006",
  "msg-007",
  "msg-008",
  "msg-009",
  "msg-010",
  "msg-011",
]);
const DEMO_HISTORY_IDS = new Set(["history-001", "history-002", "history-003"]);
const DEMO_AI_INSIGHT_IDS = new Set(["ai-001", "ai-002"]);
const DEMO_AUDIT_IDS = new Set(["audit-001", "audit-002"]);
const DEMO_EVENT_IDS = new Set(["evt-001", "evt-002", "evt-003"]);
const DEMO_NOTE_IDS = new Set(["note-001", "note-002"]);
const DEMO_AUTOMATION_RULE_IDS = new Set(["auto-001", "auto-002", "auto-003"]);
const DEMO_CONTRACT_ID = "dac-clinic-db-001";

function envString(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function getWorkspaceName(): string {
  return envString("OAUTH_BOOTSTRAP_CLINIC_NAME") ?? "Clinic Workspace";
}

function shouldKeepDemoOrganization(state: AppState, organization: Organization): boolean {
  if (!isDemoOrganizationId(organization.id)) {
    return true;
  }

  const hasNonDemoMembership = state.memberships.some(
    (membership) =>
      membership.organizationId === organization.id &&
      !DEMO_USER_IDS.has(membership.userId) &&
      membership.status === "active",
  );
  const hasConfiguredIntegration = state.integrations.some(
    (integration) =>
      integration.organizationId === organization.id &&
      Boolean(integration.encryptedCredentials?.trim()),
  );
  const hasRuntimeLeadActivity = state.leads.some(
    (lead) =>
      lead.organizationId === organization.id &&
      !DEMO_LEAD_IDS.has(lead.id),
  );

  return hasNonDemoMembership || hasConfiguredIntegration || hasRuntimeLeadActivity;
}

function sanitizeOrganizations(state: AppState): Organization[] {
  const realOrganizations = state.organizations.filter(
    (organization) => !isDemoOrganizationId(organization.id),
  );

  if (realOrganizations.length > 0) {
    return state.organizations
      .filter(
        (organization) =>
          !isDemoOrganizationId(organization.id) ||
          shouldKeepDemoOrganization(state, organization),
      )
      .map((organization) =>
        isDemoOrganizationId(organization.id) &&
        organization.name === "Smile Studio Dental"
          ? {
              ...organization,
              name: getWorkspaceName(),
            }
          : organization,
      );
  }

  const retainedDemoOrganization =
    state.organizations.find((organization) => organization.id === defaultOrganizationId) ??
    state.organizations.find((organization) => isDemoOrganizationId(organization.id));

  if (!retainedDemoOrganization) {
    return [];
  }

  return [
    retainedDemoOrganization.name === "Smile Studio Dental" ||
    retainedDemoOrganization.name === "Bright Bite Clinic"
      ? {
          ...retainedDemoOrganization,
          name: getWorkspaceName(),
        }
      : retainedDemoOrganization,
  ];
}

function shouldKeepContract(contract: DataAccessContract): boolean {
  if (contract.id !== DEMO_CONTRACT_ID) {
    return true;
  }

  return contract.status === "approved" || !DEMO_USER_IDS.has(contract.createdBy);
}

function sanitizeSubscription(
  subscription: Subscription,
  organizationsById: Map<string, Organization>,
): Subscription {
  const externalCustomerId = subscription.externalCustomerId.startsWith("cus_demo")
    ? ""
    : subscription.externalCustomerId;
  const externalSubscriptionId = subscription.externalSubscriptionId.startsWith("sub_demo")
    ? ""
    : subscription.externalSubscriptionId;
  const organization = organizationsById.get(subscription.organizationId);
  const isLegacyUnstartedTrial =
    organization?.status === "trial" &&
    subscription.status === "past_due" &&
    !externalCustomerId &&
    !externalSubscriptionId;

  if (isLegacyUnstartedTrial) {
    const trialPeriod = getFreeTrialPeriod(subscription.currentPeriodStart);

    return {
      ...subscription,
      status: "trialing",
      currentPeriodStart: trialPeriod.startIso,
      currentPeriodEnd: trialPeriod.endIso,
      externalCustomerId,
      externalSubscriptionId: "free-trial-legacy",
    };
  }

  return {
    ...subscription,
    externalCustomerId,
    externalSubscriptionId,
  };
}

function sanitizeUsageLimit(
  usage: UsageLimits,
  shouldResetUsage: boolean,
): UsageLimits {
  if (!shouldResetUsage) {
    return usage;
  }

  return {
    ...usage,
    periodUsageJson: {
      users: usage.periodUsageJson.users,
      integrations: usage.periodUsageJson.integrations,
      messages: 0,
      aiRuns: 0,
    },
  };
}

export function getRuntimeSeedState(): AppState {
  return isDemoActionsEnabled() ? getInitialAppState() : createEmptyAppState();
}

export function sanitizeRuntimeState(state: AppState): AppState {
  if (isDemoActionsEnabled()) {
    return state;
  }

  const organizations = sanitizeOrganizations(state);
  const organizationIds = new Set(organizations.map((organization) => organization.id));
  const organizationsById = new Map(organizations.map((organization) => [organization.id, organization]));
  const users = state.users.filter(
    (user) => user.id === "system" || !DEMO_USER_IDS.has(user.id),
  );
  const userIds = new Set(users.map((user) => user.id));
  const memberships = state.memberships.filter(
    (membership) =>
      organizationIds.has(membership.organizationId) &&
      userIds.has(membership.userId),
  );
  const membershipIds = new Set(memberships.map((membership) => membership.id));
  const activeUserIds = new Set(
    memberships
      .filter((membership) => membership.status === "active")
      .map((membership) => membership.userId),
  );
  const visibleUsers = users.filter(
    (user) => user.id === "system" || activeUserIds.has(user.id),
  );
  const leads = state.leads.filter(
    (lead) =>
      organizationIds.has(lead.organizationId) &&
      !DEMO_LEAD_IDS.has(lead.id),
  );
  const leadIds = new Set(leads.map((lead) => lead.id));
  const conversations = state.conversations.filter(
    (conversation) =>
      organizationIds.has(conversation.organizationId) &&
      leadIds.has(conversation.leadId) &&
      !DEMO_CONVERSATION_IDS.has(conversation.id),
  );
  const conversationIds = new Set(conversations.map((conversation) => conversation.id));
  const messages = state.messages.filter(
    (message) =>
      conversationIds.has(message.conversationId) &&
      !DEMO_MESSAGE_IDS.has(message.id),
  );
  const teamNotes = (state.teamNotes ?? []).filter(
    (note) =>
      organizationIds.has(note.organizationId) &&
      !DEMO_NOTE_IDS.has(note.id) &&
      userIds.has(note.authorUserId) &&
      memberships.some((membership) => membership.id === note.authorMembershipId) &&
      (!note.conversationId || conversationIds.has(note.conversationId)) &&
      (!note.leadId || leadIds.has(note.leadId)),
  );
  const leadStatusHistory = state.leadStatusHistory.filter(
    (history) =>
      leadIds.has(history.leadId) &&
      !DEMO_HISTORY_IDS.has(history.id),
  );
  const integrations = state.integrations.filter((integration) =>
    organizationIds.has(integration.organizationId),
  );
  const dataAccessContracts = state.dataAccessContracts.filter(
    (contract) =>
      organizationIds.has(contract.organizationId) &&
      shouldKeepContract(contract),
  );
  const subscriptions = state.subscriptions
    .filter((subscription) => organizationIds.has(subscription.organizationId))
    .map((subscription) => sanitizeSubscription(subscription, organizationsById));
  const automationRules = state.automationRules.filter(
    (rule) =>
      organizationIds.has(rule.organizationId) &&
      !DEMO_AUTOMATION_RULE_IDS.has(rule.id),
  );
  const aiInsights = state.aiInsights.filter(
    (insight) =>
      organizationIds.has(insight.organizationId) &&
      !DEMO_AI_INSIGHT_IDS.has(insight.id) &&
      (!insight.leadId || leadIds.has(insight.leadId)) &&
      (!insight.conversationId || conversationIds.has(insight.conversationId)),
  );
  const auditLogs = state.auditLogs.filter((log) => {
    if (DEMO_AUDIT_IDS.has(log.id) || DEMO_USER_IDS.has(log.actorUserId)) {
      return false;
    }

    if (log.organizationId && !organizationIds.has(log.organizationId)) {
      return false;
    }

    if (log.entityType === "lead" && !leadIds.has(log.entityId)) {
      return false;
    }

    if (log.entityType === "conversation" && !conversationIds.has(log.entityId)) {
      return false;
    }

    return true;
  });
  const integrationEvents = state.integrationEvents.filter(
    (event) =>
      organizationIds.has(event.organizationId) &&
      !DEMO_EVENT_IDS.has(event.id),
  );
  const shouldResetUsage =
    leads.length === 0 &&
    messages.length === 0 &&
    aiInsights.length === 0 &&
    integrationEvents.length === 0;
  const usageLimits = state.usageLimits
    .filter((usage) => organizationIds.has(usage.organizationId))
    .map((usage) => sanitizeUsageLimit(usage, shouldResetUsage));
  const usageEvents = (state.usageEvents ?? []).filter((event) =>
    organizationIds.has(event.organizationId),
  );
  const billingEvents = (state.billingEvents ?? []).filter((event) =>
    !event.organizationId || organizationIds.has(event.organizationId),
  );
  const inviteTokens = (state.inviteTokens ?? []).filter(
    (invite) =>
      organizationIds.has(invite.organizationId) &&
      membershipIds.has(invite.membershipId),
  );

  return {
    users: visibleUsers,
    organizations,
    memberships,
    inviteTokens,
    leads,
    leadStatusHistory,
    conversations,
    messages,
    teamNotes,
    integrations,
    dataAccessContracts,
    subscriptions,
    automationRules,
    aiInsights,
    usageLimits,
    usageEvents,
    auditLogs,
    integrationEvents,
    billingEvents,
  };
}
