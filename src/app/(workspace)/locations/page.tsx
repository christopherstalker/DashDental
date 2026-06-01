export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import Link from "next/link";
import { Building2, CircleDollarSign, Plug, TriangleAlert } from "lucide-react";
import { formatCurrency } from "@/domain/business-rules";
import { getWorkspaceShellBootstrap } from "@/features/app-shell/data/workspace-bootstrap";
import { MetricTile } from "@/features/design-system/components/metric-tile";
import { PageHeader } from "@/features/design-system/components/page-header";
import { SurfaceCard } from "@/features/design-system/components/surface-card";
import { readAppState } from "@/server/data-store";
import { buildMultiLocationOverview } from "@/server/multi-location";
import {
  decodeSession,
  resolveAuthenticatedUser,
  SESSION_COOKIE_NAME,
} from "@/server/session";

export default async function LocationsPage() {
  const bootstrap = await getWorkspaceShellBootstrap("owner");
  const state = await readAppState();
  const cookieStore = await cookies();
  const sessionPayload = decodeSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  const user = sessionPayload ? resolveAuthenticatedUser(state, sessionPayload) : null;
  const rows = user
    ? buildMultiLocationOverview({
        state,
        userId: user.id,
        isSuperAdmin: bootstrap.session?.isSuperAdmin,
      })
    : [];
  const totalLostRevenue = rows.reduce((sum, row) => sum + row.lostRevenue, 0);
  const totalAtRisk = rows.reduce((sum, row) => sum + row.atRisk, 0);
  const totalBooked = rows.reduce((sum, row) => sum + row.booked, 0);

  return (
    <section className="view-grid locations-grid">
      <PageHeader
        actions={
          <Link className="secondary-button compact-button" href="/workspaces">
            Account hub
          </Link>
        }
        description="Owner-level rollup across clinic locations without opening every workspace one by one."
        eyebrow="Multi-location"
        title="Location command center"
      />

      <div className="metrics-row">
        <MetricTile
          icon={Building2}
          label="Locations"
          subtitle="Visible to this owner account"
          value={rows.length}
        />
        <MetricTile
          icon={TriangleAlert}
          label="At-risk leads"
          subtitle="Across visible locations"
          tone={totalAtRisk > 0 ? "warning" : "neutral"}
          value={totalAtRisk}
        />
        <MetricTile
          icon={CircleDollarSign}
          label="Lost revenue"
          subtitle="No-response leakage"
          tone={totalLostRevenue > 0 ? "danger" : "neutral"}
          value={formatCurrency(totalLostRevenue, bootstrap.organization)}
        />
        <MetricTile
          icon={Plug}
          label="Booked patients"
          subtitle="All visible locations"
          value={totalBooked}
        />
      </div>

      <SurfaceCard
        description="Use this page for owners running multiple clinics or brands. Each row keeps tenant data scoped, while the owner sees the operational exception list."
        eyebrow="Portfolio"
        title="Clinic locations"
        wide
      >
        <div className="data-table">
          <div className="table-head locations-table-grid">
            <span>Location</span>
            <span>Billing</span>
            <span>Leads</span>
            <span>At risk</span>
            <span>Booked</span>
            <span>Lost revenue</span>
            <span>Integrations</span>
            <span>Action</span>
          </div>
          {rows.map((row) => (
            <div className="table-row locations-table-grid" key={row.organizationId}>
              <div className="lead-name">
                <strong>{row.organizationName}</strong>
                <span>{row.role} - {row.status}</span>
              </div>
              <span className={`status-dot ${row.billingStatus === "active" ? "active" : "pending"}`}>
                {row.billingStatus.replaceAll("_", " ")}
              </span>
              <span>{row.totalLeads}</span>
              <span>{row.atRisk}</span>
              <span>{row.booked}</span>
              <span>{formatCurrency(row.lostRevenue, bootstrap.organization)}</span>
              <span>{row.connectedIntegrations}</span>
              <Link className="secondary-button compact-button" href="/workspaces">
                Open
              </Link>
            </div>
          ))}
        </div>
      </SurfaceCard>
    </section>
  );
}
