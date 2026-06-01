export const dynamic = "force-dynamic";

import {
  AnalyticsDashboard,
  type AnalyticsLead,
  type AnalyticsStaffMember,
} from "@/components/analytics/analytics-dashboard";
import { getWorkspaceShellBootstrap } from "@/features/app-shell/data/workspace-bootstrap";
import { buildRevenueAnalytics } from "@/server/revenue-analytics";

export default async function DashboardAnalyticsPage() {
  const bootstrap = await getWorkspaceShellBootstrap("manager");
  const organizationId = bootstrap.organization.id;
  const leads: AnalyticsLead[] = bootstrap.state.leads
    .filter((lead) => lead.organizationId === organizationId)
    .map((lead) => ({
      assignedTo: lead.assignedTo,
      firstHumanResponseAt: lead.firstHumanResponseAt,
      firstMessageAt: lead.firstMessageAt,
      id: lead.id,
      estimatedValue: lead.estimatedValue,
      lostReason: lead.lostReason,
      source: lead.source,
      status: lead.status,
    }));
  const usersById = new Map(bootstrap.state.users.map((user) => [user.id, user]));
  const staff: AnalyticsStaffMember[] = bootstrap.state.memberships
    .filter(
      (membership) =>
        membership.organizationId === organizationId &&
        membership.status === "active" &&
        membership.role !== "super_admin",
    )
    .map((membership) => usersById.get(membership.userId))
    .filter((user): user is NonNullable<typeof user> => Boolean(user))
    .map((user) => ({
      id: user.id,
      name: user.name,
    }));

  const revenue = buildRevenueAnalytics(
    bootstrap.state,
    organizationId,
    new Date().toISOString(),
  );

  return <AnalyticsDashboard leads={leads} revenue={revenue} staff={staff} />;
}
