import type { AppState } from "./types";

export function createEmptyAppState(): AppState {
  return {
    users: [],
    organizations: [],
    memberships: [],
    leads: [],
    leadStatusHistory: [],
    conversations: [],
    messages: [],
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
