import type { AppState } from "./types";

export function scopeAppStateToOrganization(
  state: AppState,
  organizationId: string,
): AppState {
  const conversationIds = new Set(
    state.conversations
      .filter((conversation) => conversation.organizationId === organizationId)
      .map((conversation) => conversation.id),
  );
  const leadIds = new Set(
    state.leads
      .filter((lead) => lead.organizationId === organizationId)
      .map((lead) => lead.id),
  );
  const userIds = new Set(
    state.memberships
      .filter((membership) => membership.organizationId === organizationId)
      .map((membership) => membership.userId),
  );

  return {
    users: state.users.filter((user) => userIds.has(user.id)),
    organizations: state.organizations.filter(
      (organization) => organization.id === organizationId,
    ),
    memberships: state.memberships.filter(
      (membership) => membership.organizationId === organizationId,
    ),
    inviteTokens: [],
    leads: state.leads.filter((lead) => lead.organizationId === organizationId),
    leadStatusHistory: state.leadStatusHistory.filter((history) =>
      leadIds.has(history.leadId),
    ),
    conversations: state.conversations.filter(
      (conversation) => conversation.organizationId === organizationId,
    ),
    messages: state.messages.filter((message) =>
      conversationIds.has(message.conversationId),
    ),
    replyTemplates: (state.replyTemplates ?? []).filter(
      (template) => template.organizationId === organizationId,
    ),
    conversationReminders: (state.conversationReminders ?? []).filter(
      (reminder) => reminder.organizationId === organizationId,
    ),
    featureFlags: (state.featureFlags ?? []).filter(
      (flag) => flag.organizationId === organizationId,
    ),
    outgoingWebhookEndpoints: (state.outgoingWebhookEndpoints ?? []).filter(
      (endpoint) => endpoint.organizationId === organizationId,
    ),
    partnerApiKeys: (state.partnerApiKeys ?? []).filter(
      (key) => key.organizationId === organizationId,
    ),
    weeklyDigests: (state.weeklyDigests ?? []).filter(
      (digest) => digest.organizationId === organizationId,
    ),
    teamNotes: state.teamNotes.filter(
      (note) => note.organizationId === organizationId,
    ),
    integrations: state.integrations.filter(
      (integration) => integration.organizationId === organizationId,
    ),
    dataAccessContracts: state.dataAccessContracts.filter(
      (contract) => contract.organizationId === organizationId,
    ),
    subscriptions: state.subscriptions.filter(
      (subscription) => subscription.organizationId === organizationId,
    ),
    automationRules: state.automationRules.filter(
      (rule) => rule.organizationId === organizationId,
    ),
    aiInsights: state.aiInsights.filter(
      (insight) => insight.organizationId === organizationId,
    ),
    usageLimits: state.usageLimits.filter(
      (usage) => usage.organizationId === organizationId,
    ),
    usageEvents: state.usageEvents.filter(
      (event) => event.organizationId === organizationId,
    ),
    auditLogs: state.auditLogs.filter((log) => log.organizationId === organizationId),
    integrationEvents: state.integrationEvents.filter(
      (event) => event.organizationId === organizationId,
    ),
    billingEvents: state.billingEvents.filter(
      (event) => event.organizationId === organizationId,
    ),
  };
}
