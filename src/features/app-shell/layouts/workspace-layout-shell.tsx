import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import { SubscriptionGate } from "@/features/billing/components/subscription-gate";
import { LanguageSwitcher } from "@/features/i18n/components/language-switcher";
import { LocalizedText } from "@/features/i18n/components/localized-text";
import type { TranslationKey } from "@/features/i18n/translations";
import { LiveNotesDock } from "@/features/notes/components/live-notes-dock";
import { buildTeamNoteViews, getTeamNotes } from "@/server/team-notes";
import { WorkspaceStateProvider } from "../providers/workspace-state-provider";
import type { WorkspaceShellBootstrap } from "../data/workspace-bootstrap";
import { workspaceRoutes } from "../config/route-map";
import { WorkspaceCommandBar } from "../components/workspace-command-bar";
import { WorkspaceNav } from "../components/workspace-nav";

const roleLabelKeys: Record<string, TranslationKey> = {
  admin: "workspace.role.admin",
  manager: "workspace.role.manager",
  owner: "workspace.role.owner",
  super_admin: "workspace.role.superAdmin",
};

export function WorkspaceLayoutShell({
  bootstrap,
  children,
}: {
  bootstrap: WorkspaceShellBootstrap;
  children: ReactNode;
}) {
  const role = bootstrap.session?.role ?? "manager";
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
      <div className="app-shell premium-app-shell">
        <aside className="sidebar">
          <div className="brand-lockup">
            <div className="brand-mark brand-mark-compact">
              <Image
                alt=""
                height={44}
                src="/dental-recovery-mark.svg"
                unoptimized
                width={44}
              />
            </div>
            <div>
              <strong className="brand-name">Dash Dental</strong>
              <p className="brand-subtitle">{bootstrap.organization.name}</p>
            </div>
          </div>

          <WorkspaceNav currentRole={role} routes={workspaceRoutes} />

          <div className="sidebar-status premium-sidebar-status">
            <div className="sidebar-readiness-row">
              <div
                className="sidebar-progress-ring"
                style={{ "--progress": `${setupProgress}%` } as CSSProperties}
              >
                <span>{setupProgress}%</span>
              </div>
              <div>
                <span>
                  <LocalizedText k="workspace.sidebar.readiness" />
                </span>
                <strong>
                  {setupProgress}% <LocalizedText k="workspace.sidebar.launchReady" />
                </strong>
              </div>
            </div>
            <div className="sidebar-user-card">
              <span>
                <LocalizedText k="workspace.sidebar.signedIn" />
              </span>
              <strong>{userName}</strong>
              <span>
                <LocalizedText k="workspace.sidebar.role" />{" "}
                <LocalizedText k={roleLabelKeys[role] ?? "workspace.role.manager"} /> -{" "}
                {bootstrap.summary.onboardingCompleted}/{bootstrap.summary.onboardingTotal}{" "}
                <LocalizedText k="workspace.sidebar.setupGates" />
              </span>
            </div>
            <div className="field-chip-list">
              <span>
                {bootstrap.summary.connectedIntegrations}{" "}
                <LocalizedText k="workspace.sidebar.integrations" />
              </span>
              <span>
                {bootstrap.summary.openConversations}{" "}
                <LocalizedText k="workspace.sidebar.inboxThreads" />
              </span>
            </div>
            <LanguageSwitcher className="workspace-language-switcher" />
          </div>
        </aside>

        <main className="workspace">
          <WorkspaceCommandBar
            context={{
              atRisk: bootstrap.overview.atRisk,
              openConversations: bootstrap.summary.openConversations,
              organizationName: bootstrap.organization.name,
              planLabel: bootstrap.billing.planLabel,
              role,
              unanswered: bootstrap.overview.unanswered,
              userName,
            }}
          />
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
        </main>
      </div>
    </WorkspaceStateProvider>
  );
}
