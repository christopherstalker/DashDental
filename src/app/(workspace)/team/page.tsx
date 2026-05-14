import Link from "next/link";
import {
  Activity,
  Crown,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import { canAccess, getPlanCatalog } from "@/domain/business-rules";
import type { Membership, Role, User } from "@/domain/types";
import { MetricTile } from "@/features/design-system/components/metric-tile";
import { PageHeader } from "@/features/design-system/components/page-header";
import { SurfaceCard } from "@/features/design-system/components/surface-card";
import { getWorkspaceShellBootstrap } from "@/features/app-shell/data/workspace-bootstrap";
import { LocalizedText } from "@/features/i18n/components/localized-text";
import type { TranslationKey } from "@/features/i18n/translations";
import {
  DeactivateTeamMemberButton,
  TeamMemberForm,
} from "@/features/team/components/team-actions";

export const dynamic = "force-dynamic";

interface TeamRow {
  assignedLeads: number;
  bookedLeads: number;
  canDeactivate: boolean;
  membership: Membership;
  notesAuthored: number;
  openConversations: number;
  user: User;
  waitingLeads: number;
}

const roleLabelKeys: Record<Role, TranslationKey> = {
  admin: "workspace.role.admin",
  manager: "workspace.role.manager",
  owner: "workspace.role.owner",
  super_admin: "workspace.role.superAdmin",
};

export default async function TeamPage() {
  const bootstrap = await getWorkspaceShellBootstrap("admin");
  const hasAccess = bootstrap.session ? canAccess("admin", bootstrap.session.role) : false;

  if (!hasAccess) {
    return <TeamAccessRequired />;
  }

  const organization = bootstrap.organization;
  const subscription = bootstrap.subscription;
  const planLabel = subscription ? getPlanCatalog(subscription.plan).label : "Starter";
  const usage = bootstrap.state.usageLimits.find(
    (item) => item.organizationId === organization.id,
  );
  const memberships = bootstrap.state.memberships.filter(
    (membership) => membership.organizationId === organization.id,
  );
  const usersById = new Map(bootstrap.state.users.map((user) => [user.id, user]));
  const teamRows = memberships
    .map((membership): TeamRow | undefined => {
      const user = usersById.get(membership.userId);
      if (!user) {
        return undefined;
      }

      const assignedLeads = bootstrap.state.leads.filter(
        (lead) => lead.assignedTo === user.id,
      );
      const openConversations = bootstrap.state.conversations.filter((conversation) => {
        const lead = bootstrap.state.leads.find((item) => item.id === conversation.leadId);
        return lead?.assignedTo === user.id && conversation.status === "open";
      }).length;

      return {
        assignedLeads: assignedLeads.length,
        bookedLeads: assignedLeads.filter((lead) => lead.status === "booked").length,
        canDeactivate:
          membership.status === "active" &&
          user.id !== bootstrap.session?.user.id &&
          !isLastActiveOwner(membership, memberships),
        membership,
        notesAuthored: bootstrap.state.teamNotes.filter(
          (note) => note.authorMembershipId === membership.id,
        ).length,
        openConversations,
        user,
        waitingLeads: assignedLeads.filter((lead) =>
          ["new", "unanswered", "at_risk"].includes(lead.status),
        ).length,
      };
    })
    .filter((row): row is TeamRow => Boolean(row))
    .toSorted((left, right) => {
      const rank = { owner: 1, admin: 2, manager: 3, super_admin: 4 };
      return rank[left.membership.role] - rank[right.membership.role] ||
        left.user.name.localeCompare(right.user.name);
    });
  const usedSeats = teamRows.filter((row) => row.membership.status !== "disabled").length;
  const maxSeats = usage?.maxUsers ?? 0;
  const seatsAvailable = Math.max(0, maxSeats - usedSeats);
  const owners = teamRows.filter(
    (row) => row.membership.role === "owner" && row.membership.status === "active",
  ).length;
  const activeOperators = teamRows.filter(
    (row) => row.membership.status === "active",
  ).length;
  const disabled = maxSeats > 0 && usedSeats >= maxSeats;

  return (
    <section className="view-grid team-grid">
      <PageHeader
        actions={
          <div className="notice">
            <ShieldCheck size={16} />
            <span>
              {usedSeats}/{maxSeats || "?"} <LocalizedText k="team.notice.seatsUsed" /> -{" "}
              {planLabel}
            </span>
          </div>
        }
        description={<LocalizedText k="team.header.description" />}
        eyebrow={<LocalizedText k="workspace.nav.group.govern" />}
        title={<LocalizedText k="team.header.title" />}
      />

      <section className="dashboard-command">
        <div>
          <p className="eyebrow">
            <LocalizedText k="team.command.eyebrow" />
          </p>
          <strong>
            {seatsAvailable > 0 ? (
              <>
                {seatsAvailable} <LocalizedText k="team.command.available" /> {planLabel}.
              </>
            ) : (
              <LocalizedText k="team.command.limitReached" />
            )}
          </strong>
          <p className="blueprint-copy">
            <LocalizedText k="team.command.copy" />
          </p>
        </div>
        <div className="dashboard-command-actions">
          <Link className="primary-button" href="/billing">
            <LocalizedText k="team.action.upgrade" />
          </Link>
          <Link className="secondary-button" href="/reports">
            <LocalizedText k="team.action.performance" />
          </Link>
        </div>
      </section>

      <div className="metrics-row">
        <MetricTile
          icon={Users}
          label={<LocalizedText k="team.metric.seats" />}
          subtitle={
            <>
              {maxSeats || "?"} <LocalizedText k="team.metric.included" />
            </>
          }
          tone={disabled ? "warning" : "neutral"}
          value={`${usedSeats}/${maxSeats || "?"}`}
        />
        <MetricTile
          icon={UserCheck}
          label={<LocalizedText k="team.metric.operators" />}
          subtitle={<LocalizedText k="team.metric.operatorsSub" />}
          value={activeOperators}
        />
        <MetricTile
          icon={Crown}
          label={<LocalizedText k="team.metric.owners" />}
          subtitle={<LocalizedText k="team.metric.ownersSub" />}
          value={owners}
        />
        <MetricTile
          icon={Activity}
          label={<LocalizedText k="team.metric.workload" />}
          subtitle={<LocalizedText k="team.metric.workloadSub" />}
          value={teamRows.reduce((sum, row) => sum + row.openConversations, 0)}
        />
      </div>

      <SurfaceCard
        description={<LocalizedText k="team.add.description" />}
        eyebrow={<LocalizedText k="team.add.eyebrow" />}
        title={<LocalizedText k="team.add.title" />}
      >
        <TeamMemberForm disabled={disabled} organizationId={organization.id} />
        {disabled ? (
          <div className="limit-alert warning">
            <ShieldCheck size={16} />
            <span>
              <LocalizedText k="team.add.limit" />
            </span>
          </div>
        ) : null}
      </SurfaceCard>

      <SurfaceCard
        description={<LocalizedText k="team.roster.description" />}
        eyebrow={<LocalizedText k="team.roster.eyebrow" />}
        title={<LocalizedText k="team.roster.title" />}
        wide
      >
        <div className="data-table">
          <div className="table-head team-member-grid">
            <span><LocalizedText k="team.table.user" /></span>
            <span><LocalizedText k="team.table.role" /></span>
            <span><LocalizedText k="team.table.workload" /></span>
            <span><LocalizedText k="team.table.lastLogin" /></span>
            <span><LocalizedText k="team.table.status" /></span>
            <span><LocalizedText k="team.table.actions" /></span>
          </div>
          {teamRows.map((row) => (
            <div className="table-row team-member-grid" key={row.membership.id}>
              <div className="lead-name">
                <strong>{row.user.name}</strong>
                <span>{row.user.email}</span>
              </div>
              <span className="source-badge clinic_database">
                <LocalizedText k={roleLabelKeys[row.membership.role]} />
              </span>
              <div className="admin-cell-stack">
                <strong>
                  {row.assignedLeads} <LocalizedText k="team.row.assigned" />
                </strong>
                <span>
                  {row.waitingLeads} <LocalizedText k="team.row.waiting" /> -{" "}
                  {row.bookedLeads} <LocalizedText k="team.row.booked" /> -{" "}
                  {row.openConversations} <LocalizedText k="team.row.open" /> -{" "}
                  {row.notesAuthored} <LocalizedText k="team.row.notes" />
                </span>
              </div>
              <div className="admin-cell-stack">
                <strong>{formatDateTime(row.user.lastLoginAt)}</strong>
                <span>{row.user.status}</span>
              </div>
              <span className={`status-dot ${row.membership.status === "active" ? "active" : row.membership.status === "disabled" ? "degraded" : "pending"}`}>
                {row.membership.status === "active" ? (
                  <LocalizedText k="common.status.active" />
                ) : row.membership.status === "disabled" ? (
                  <LocalizedText k="common.status.disabled" />
                ) : (
                  <LocalizedText k="common.status.pending" />
                )}
              </span>
              <div className="row-actions">
                <DeactivateTeamMemberButton
                  disabled={!row.canDeactivate}
                  membershipId={row.membership.id}
                  organizationId={organization.id}
                  userName={row.user.name}
                />
              </div>
            </div>
          ))}
        </div>
      </SurfaceCard>
    </section>
  );
}

function TeamAccessRequired() {
  return (
    <section className="view-grid">
      <PageHeader
        description={<LocalizedText k="team.access.description" />}
        eyebrow={<LocalizedText k="workspace.nav.group.govern" />}
        title={<LocalizedText k="team.access.title" />}
      />
      <section className="empty-state">
        <ShieldCheck size={34} />
        <h2>
          <LocalizedText k="setup.access.requires" />
        </h2>
        <p>
          <LocalizedText k="team.access.body" />
        </p>
        <Link className="primary-button" href="/login">
          <LocalizedText k="dashboard.access.goLogin" />
        </Link>
      </section>
    </section>
  );
}

function isLastActiveOwner(membership: Membership, memberships: Membership[]): boolean {
  if (membership.role !== "owner") {
    return false;
  }

  return memberships.filter((item) => item.role === "owner" && item.status === "active").length <= 1;
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
