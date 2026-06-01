import {
  calculateDashboardOverview,
  getSubscriptionAccessStatus,
} from "@/domain/business-rules";
import type { AppState, Role } from "@/domain/types";

export interface MultiLocationRow {
  organizationId: string;
  organizationName: string;
  role: Role;
  status: string;
  billingStatus: string;
  totalLeads: number;
  atRisk: number;
  booked: number;
  lostRevenue: number;
  connectedIntegrations: number;
}

export function buildMultiLocationOverview(input: {
  state: AppState;
  userId: string;
  isSuperAdmin?: boolean;
  nowIso?: string;
}): MultiLocationRow[] {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const memberships = input.isSuperAdmin
    ? input.state.organizations.map((organization) => ({
        organizationId: organization.id,
        role: "super_admin" as Role,
      }))
    : input.state.memberships
        .filter(
          (membership) =>
            membership.userId === input.userId &&
            membership.status === "active" &&
            (membership.role === "owner" || membership.role === "admin"),
        )
        .map((membership) => ({
          organizationId: membership.organizationId,
          role: membership.role,
        }));

  const rows: MultiLocationRow[] = [];

  for (const membership of memberships) {
    const organization = input.state.organizations.find(
      (item) => item.id === membership.organizationId,
    );
    if (!organization) {
      continue;
    }

    const overview = calculateDashboardOverview(
      input.state,
      organization.id,
      nowIso,
    );
    const subscription = input.state.subscriptions.find(
      (item) => item.organizationId === organization.id,
    );

    rows.push({
      organizationId: organization.id,
      organizationName: organization.name,
      role: membership.role,
      status: organization.status,
      billingStatus: getSubscriptionAccessStatus(subscription, nowIso),
      totalLeads: overview.totalLeads,
      atRisk: overview.atRisk,
      booked: overview.booked,
      lostRevenue: overview.lostRevenue,
      connectedIntegrations: input.state.integrations.filter(
        (integration) =>
          integration.organizationId === organization.id &&
          integration.status === "active",
      ).length,
    });
  }

  return rows.toSorted((left, right) => right.lostRevenue - left.lostRevenue);
}
