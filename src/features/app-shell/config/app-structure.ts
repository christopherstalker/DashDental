export interface AppStructureNode {
  label: string;
  kind: "root" | "group" | "layout" | "page" | "private" | "feature" | "provider";
  detail: string;
  children?: AppStructureNode[];
}

export const appStructureTree: AppStructureNode[] = [
  {
    label: "src/app",
    kind: "root",
    detail: "Routing boundary for public, auth, workspace, and admin experiences.",
    children: [
      {
        label: "(auth)",
        kind: "group",
        detail: "Login and clinic registration routes.",
        children: [
          {
            label: "layout.tsx",
            kind: "layout",
            detail: "Shared auth presentation shell.",
          },
          {
            label: "login/page.tsx",
            kind: "page",
            detail: "Credentials and Google sign-in.",
          },
          {
            label: "register/page.tsx",
            kind: "page",
            detail: "Clinic workspace registration.",
          },
        ],
      },
      {
        label: "(workspace)",
        kind: "group",
        detail: "Clinic tenant dashboard experience.",
        children: [
          {
            label: "layout.tsx",
            kind: "layout",
            detail: "Sidebar shell, request bootstrap, and state provider.",
          },
          {
            label: "loading.tsx",
            kind: "page",
            detail: "Streaming fallback for workspace routes.",
          },
          {
            label: "dashboard/page.tsx",
            kind: "page",
            detail: "Overview and widgets.",
          },
          {
            label: "setup/page.tsx",
            kind: "page",
            detail: "Onboarding readiness and setup steps.",
          },
          {
            label: "queue/page.tsx",
            kind: "page",
            detail: "Priority worklist.",
          },
          {
            label: "alerts/page.tsx",
            kind: "page",
            detail: "Operational alert center.",
          },
          {
            label: "leads/page.tsx",
            kind: "page",
            detail: "Pipeline and lead table.",
          },
          {
            label: "inbox/page.tsx",
            kind: "page",
            detail: "Conversation rail and thread blueprint.",
          },
          {
            label: "inbox/[conversationId]/page.tsx",
            kind: "page",
            detail: "Focused thread detail route.",
          },
          {
            label: "automations/page.tsx",
            kind: "page",
            detail: "Automation rules and owners.",
          },
          {
            label: "integrations/page.tsx",
            kind: "page",
            detail: "Provider health and contract flow.",
          },
          {
            label: "ai/page.tsx",
            kind: "page",
            detail: "Insight pipeline and model usage.",
          },
          {
            label: "reports/page.tsx",
            kind: "page",
            detail: "Reporting and KPI slices.",
          },
          {
            label: "billing/page.tsx",
            kind: "page",
            detail: "Plan and billing state.",
          },
          {
            label: "compliance/page.tsx",
            kind: "page",
            detail: "Audit and data access review.",
          },
        ],
      },
      {
        label: "(admin)",
        kind: "group",
        detail: "Platform operator routes.",
        children: [
          {
            label: "layout.tsx",
            kind: "layout",
            detail: "Super-admin shell with platform navigation.",
          },
          {
            label: "platform/page.tsx",
            kind: "page",
            detail: "Cross-tenant overview.",
          },
        ],
      },
      {
        label: "pricing/page.tsx",
        kind: "page",
        detail: "Public buyer-facing landing and pricing page.",
      },
      {
        label: "api/v1",
        kind: "group",
        detail: "Route handlers used for mutations and client-driven refresh flows.",
      },
    ],
  },
  {
    label: "src/features",
    kind: "feature",
    detail: "Shared feature packages kept outside app routing.",
    children: [
      {
        label: "app-shell",
        kind: "feature",
        detail: "Route map, layouts, providers, and bootstrap strategy.",
      },
      {
        label: "dashboard",
        kind: "feature",
        detail: "Dashboard widget registry.",
      },
      {
        label: "inbox",
        kind: "feature",
        detail: "Inbox structural blueprint.",
      },
      {
        label: "onboarding",
        kind: "feature",
        detail: "Onboarding step map and ownership.",
      },
      {
        label: "design-system",
        kind: "feature",
        detail: "Tokens and UI primitives.",
      },
    ],
  },
  {
    label: "WorkspaceStateProvider",
    kind: "provider",
    detail: "Client-only UI state for theme, filters, and selected conversation context.",
  },
];
