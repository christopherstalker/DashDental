import Link from "next/link";
import { Clock3, MessageSquareText, ShieldCheck, Users } from "lucide-react";
import { canAccess } from "@/domain/business-rules";
import { MetricTile } from "@/features/design-system/components/metric-tile";
import { PageHeader } from "@/features/design-system/components/page-header";
import { SurfaceCard } from "@/features/design-system/components/surface-card";
import { LocalizedText } from "@/features/i18n/components/localized-text";
import { getWorkspaceShellBootstrap } from "@/features/app-shell/data/workspace-bootstrap";
import { LiveNotesPanel } from "@/features/notes/components/live-notes-panel";
import { buildTeamNoteViews, getTeamNotes } from "@/server/team-notes";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const bootstrap = await getWorkspaceShellBootstrap("manager");
  const hasAccess = bootstrap.session ? canAccess("manager", bootstrap.session.role) : false;

  if (!hasAccess) {
    return (
      <section className="view-grid">
        <PageHeader
          description={<LocalizedText k="notes.page.accessDescription" />}
          eyebrow={<LocalizedText k="workspace.nav.group.operate" />}
          title={<LocalizedText k="notes.page.accessTitle" />}
        />
        <section className="empty-state">
          <ShieldCheck size={34} />
          <h2>
            <LocalizedText k="notes.page.requiresManager" />
          </h2>
          <p>
            <LocalizedText k="notes.page.onlySeats" />
          </p>
          <Link className="primary-button" href="/login">
            <LocalizedText k="dashboard.access.goLogin" />
          </Link>
        </section>
      </section>
    );
  }

  const organization = bootstrap.organization;
  const notes = getTeamNotes(bootstrap.state, {
    organizationId: organization.id,
    limit: 50,
  });
  const noteViews = buildTeamNoteViews(bootstrap.state, notes);
  const currentMembershipId = bootstrap.state.memberships.find(
    (membership) => membership.userId === bootstrap.session?.user.id,
  )?.id;
  const authors = new Set(notes.map((note) => note.authorMembershipId));
  const linkedNotes = notes.filter((note) => note.conversationId || note.leadId);
  const latestNote = notes[0]?.createdAt;

  return (
    <section className="view-grid notes-page-grid">
      <PageHeader
        actions={
          <div className="notice">
            <MessageSquareText size={16} />
            <span>
              {notes.length} <LocalizedText k="notes.page.liveNoticeSuffix" />
            </span>
          </div>
        }
        description={<LocalizedText k="notes.page.description" />}
        eyebrow={<LocalizedText k="workspace.nav.group.operate" />}
        title={<LocalizedText k="notes.page.title" />}
      />

      <div className="metrics-row">
        <MetricTile
          icon={MessageSquareText}
          label={<LocalizedText k="notes.page.notes" />}
          subtitle={<LocalizedText k="notes.page.workspaceHandoffs" />}
          value={notes.length}
        />
        <MetricTile
          icon={Users}
          label={<LocalizedText k="notes.page.authors" />}
          subtitle={<LocalizedText k="notes.page.authorSubtitle" />}
          value={authors.size}
        />
        <MetricTile
          icon={Clock3}
          label={<LocalizedText k="notes.page.latest" />}
          subtitle={<LocalizedText k="notes.page.latestSubtitle" />}
          value={
            latestNote ? formatRelativeDate(latestNote) : <LocalizedText k="notes.page.none" />
          }
        />
        <MetricTile
          icon={ShieldCheck}
          label={<LocalizedText k="notes.page.linked" />}
          subtitle={<LocalizedText k="notes.page.linkedSubtitle" />}
          value={linkedNotes.length}
        />
      </div>

      <SurfaceCard
        description={<LocalizedText k="notes.page.streamDescription" />}
        eyebrow={<LocalizedText k="notes.page.liveCollab" />}
        title={<LocalizedText k="notes.page.streamTitle" />}
        wide
      >
        <LiveNotesPanel
          currentMembershipId={currentMembershipId}
          initialNotes={noteViews}
          organizationId={organization.id}
        />
      </SurfaceCard>

      <SurfaceCard
        description={<LocalizedText k="notes.page.attributionDescription" />}
        eyebrow={<LocalizedText k="notes.page.seatOwnership" />}
        title={<LocalizedText k="notes.page.attributionTitle" />}
      >
        <div className="event-list">
          <div className="event-row">
            <strong>
              <LocalizedText k="notes.page.ruleAuthor" />
            </strong>
          </div>
          <div className="event-row">
            <strong>
              <LocalizedText k="notes.page.ruleConversation" />
            </strong>
          </div>
          <div className="event-row">
            <strong>
              <LocalizedText k="notes.page.ruleAudit" />
            </strong>
          </div>
        </div>
      </SurfaceCard>
    </section>
  );
}

function formatRelativeDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
