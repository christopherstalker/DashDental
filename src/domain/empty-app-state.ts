import type { AppState } from "./types";

export function createEmptyAppState(): AppState {
  return {
    users: [],
    organizations: [],
    memberships: [],
    inviteTokens: [],
    leads: [],
    leadStatusHistory: [],
    conversations: [],
    messages: [],
    replyTemplates: [],
    conversationReminders: [],
    featureFlags: [],
    outgoingWebhookEndpoints: [],
    partnerApiKeys: [],
    weeklyDigests: [],
    teamNotes: [],
    integrations: [],
    dataAccessContracts: [],
    subscriptions: [],
    automationRules: [],
    aiInsights: [],
    usageLimits: [],
    usageEvents: [],
    auditLogs: [],
    integrationEvents: [],
    billingEvents: [],
  };
}
