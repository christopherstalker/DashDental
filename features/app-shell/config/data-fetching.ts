export interface DataFetchingStage {
  layer: string;
  strategy: string;
  implementation: string;
  notes: string;
}

export const dataFetchingBlueprint: DataFetchingStage[] = [
  {
    layer: "Server layouts and pages",
    strategy: "Direct server-side reads with request-scoped memoization.",
    implementation:
      "Use async Server Components and cache(async) bootstrap helpers that read cookies() and readAppState().",
    notes: "Keeps secrets and tenant authorization on the server.",
  },
  {
    layer: "Shared route bootstrap",
    strategy: "Single clinic-scoped snapshot per request.",
    implementation:
      "Workspace layout resolves session, scopes AppState, and derives summary counts once.",
    notes: "Avoids re-fetching the same state in each child component.",
  },
  {
    layer: "Client interactivity",
    strategy: "Local UI state only.",
    implementation:
      "Theme, filters, and selected conversation stay inside a client provider instead of duplicating server data.",
    notes: "Minimizes client bundle pressure and hydration work.",
  },
  {
    layer: "Mutations",
    strategy: "POST/PATCH through Route Handlers with follow-up refresh.",
    implementation:
      "Client actions call /api/v1 endpoints; server remains the source of truth for changed state.",
    notes: "Good fit for inbox replies, lead status changes, and integration setup.",
  },
  {
    layer: "Streaming",
    strategy: "Route-group loading states and component-level suspense when needed.",
    implementation:
      "Workspace routes use loading.tsx; long-running widgets should later move behind Suspense boundaries.",
    notes: "Matches Next App Router recommendations for request-time data.",
  },
];
