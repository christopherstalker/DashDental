export const dynamic = "force-dynamic";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { canAccess } from "@/domain/business-rules";
import { getWorkspaceShellBootstrap } from "@/features/app-shell/data/workspace-bootstrap";
import { buildDashboardOverviewModel } from "@/features/dashboard/redesign-view-model";

export default async function DashboardPage() {
  const bootstrap = await getWorkspaceShellBootstrap("manager");
  const hasAccess = bootstrap.session ? canAccess("manager", bootstrap.session.role) : false;

  if (!hasAccess) {
    return <WorkspaceAccessRequired requiredRole="manager" />;
  }

  return <DashboardOverview {...buildDashboardOverviewModel(bootstrap)} />;
}

function WorkspaceAccessRequired({ requiredRole }: { requiredRole: string }) {
  return (
    <section className="ddr-card ddr-access-panel">
      <ShieldCheck size={34} />
      <span className="ddr-badge ddr-badge-alert">Access required</span>
      <h1>Dashboard access requires {requiredRole} role.</h1>
      <p>
        Dash Dental keeps clinic dashboards tenant-scoped. Sign in with a workspace
        that has the right role before opening operational data.
      </p>
      <Link className="ddr-button ddr-button-primary" href="/workspaces">
        Go to account
      </Link>
    </section>
  );
}
