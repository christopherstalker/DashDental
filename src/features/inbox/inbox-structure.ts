export interface InboxRailDefinition {
  title: string;
  purpose: string;
  contents: string[];
}

export const inboxStructure: InboxRailDefinition[] = [
  {
    title: "Conversation rail",
    purpose: "Fast scanning of active threads and SLA pressure.",
    contents: [
      "Lead identity and source badge",
      "Latest inbound excerpt",
      "Waiting time and risk badge",
      "Unread and ownership signals",
    ],
  },
  {
    title: "Thread canvas",
    purpose: "Primary reply surface for manager work.",
    contents: [
      "Chronological message bubbles",
      "Suggested replies and AI context",
      "Reply composer and send action",
      "Status transitions like booked or lost",
    ],
  },
  {
    title: "Patient context drawer",
    purpose: "Decision support without leaving the inbox.",
    contents: [
      "Lead status and estimated value",
      "Provider metadata and timestamps",
      "AI summary and risk recommendation",
      "Quick actions for booking or escalation",
    ],
  },
];
