import type { ReactNode } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { SubscriptionGate } from "@/features/billing/components/subscription-gate";
import { LiveNotesDock } from "@/features/notes/components/live-notes-dock";
import { buildTeamNoteViews, getTeamNotes } from "@/server/team-notes";
import { WorkspaceStateProvider } from "../providers/workspace-state-provider";
import type { WorkspaceShellBootstrap } from "../data/workspace-bootstrap";

export function WorkspaceLayoutShell({
  bootstrap,
  children,
}: {
  bootstrap: WorkspaceShellBootstrap;
  children: ReactNode;
}) {
  const userName = bootstrap.session?.user.name ?? "Guest clinic";
  const setupProgress = Math.round(
    (bootstrap.summary.onboardingCompleted / bootstrap.summary.onboardingTotal) * 100,
  );
  const currentMembershipId = bootstrap.state.memberships.find(
    (membership) => membership.userId === bootstrap.session?.user.id,
  )?.id;
  const workspaceNoteViews = buildTeamNoteViews(
    bootstrap.state,
    getTeamNotes(bootstrap.state, {
      organizationId: bootstrap.organization.id,
      limit: 12,
    }),
  );
  const canUseWorkspaceNotes = Boolean(
    bootstrap.session && bootstrap.billing.hasWorkspaceAccess,
  );

  return (
    <WorkspaceStateProvider session={bootstrap.session}>
      <DashboardShell
        atRisk={bootstrap.overview.atRisk}
        connectedIntegrations={bootstrap.summary.connectedIntegrations}
        openConversations={bootstrap.summary.openConversations}
        organizationName={bootstrap.organization.name}
        planLabel={bootstrap.billing.planLabel}
        setupProgress={setupProgress}
        userName={userName}
      >
        <SubscriptionGate
          currentPeriodEnd={bootstrap.billing.currentPeriodEnd}
          daysRemaining={bootstrap.billing.daysRemaining}
          hasWorkspaceAccess={bootstrap.billing.hasWorkspaceAccess}
          paymentRequired={bootstrap.billing.paymentRequired}
          planLabel={bootstrap.billing.planLabel}
          status={bootstrap.billing.status}
        >
          {children}
          {canUseWorkspaceNotes ? (
            <LiveNotesDock
              currentMembershipId={currentMembershipId}
              initialNotes={workspaceNoteViews}
              organizationId={bootstrap.organization.id}
            />
          ) : null}
        </SubscriptionGate>
      </DashboardShell>
    </WorkspaceStateProvider>
  );
}
