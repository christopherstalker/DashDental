export interface StateSliceDefinition {
  name: string;
  owner: string;
  purpose: string;
  lifetime: string;
}

export const stateManagementBlueprint: StateSliceDefinition[] = [
  {
    name: "Session and tenant scope",
    owner: "Server bootstrap",
    purpose: "Resolve active user, role, organization, and clinic-scoped state snapshot.",
    lifetime: "Per request",
  },
  {
    name: "Workspace preferences",
    owner: "WorkspaceStateProvider",
    purpose: "Track theme mode, dashboard range, and inbox density.",
    lifetime: "Per browser tab",
  },
  {
    name: "Operational filters",
    owner: "WorkspaceStateProvider",
    purpose: "Lead status filter, selected conversation, and current onboarding focus.",
    lifetime: "Per route session",
  },
  {
    name: "Canonical business data",
    owner: "Route handlers + server reads",
    purpose: "Leads, conversations, integrations, contracts, billing, and audit records.",
    lifetime: "Persistent in storage",
  },
  {
    name: "Mutation feedback",
    owner: "Client route actions",
    purpose: "Notice banners, pending actions, and optimistic interaction affordances.",
    lifetime: "Ephemeral UI state",
  },
];
