export interface DashboardWidgetDefinition {
  id: string;
  title: string;
  description: string;
  owner: string;
}

export const dashboardWidgets: DashboardWidgetDefinition[] = [
  {
    id: "recovery-overview",
    title: "Recovery overview",
    description: "New, unanswered, at-risk, booked, and lost lead totals with conversion context.",
    owner: "Revenue operations",
  },
  {
    id: "response-sla",
    title: "Response SLA",
    description: "Average reply time, no-response pressure, and alert thresholds.",
    owner: "Front desk manager",
  },
  {
    id: "source-performance",
    title: "Source performance",
    description: "Conversion and volume by Telegram, web form, and future channels.",
    owner: "Clinic owner",
  },
  {
    id: "manager-load",
    title: "Manager load",
    description: "Assigned queue pressure and booked outcomes by staff member.",
    owner: "Operations admin",
  },
  {
    id: "integration-health",
    title: "Integration health",
    description: "Clinic DB, Stripe, and intake provider readiness.",
    owner: "Platform setup",
  },
  {
    id: "plan-usage",
    title: "Plan usage",
    description: "Messages, AI runs, integration count, and seat pressure.",
    owner: "Billing",
  },
];
