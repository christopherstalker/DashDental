export const dynamic = "force-dynamic";

import Link from "next/link";
import { CalendarClock, Star, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/domain/business-rules";
import { getWorkspaceShellBootstrap } from "@/features/app-shell/data/workspace-bootstrap";
import { MetricTile } from "@/features/design-system/components/metric-tile";
import { PageHeader } from "@/features/design-system/components/page-header";
import { SurfaceCard } from "@/features/design-system/components/surface-card";
import {
  RecallReminderButton,
  ReviewRequestButton,
} from "@/features/review-recall/components/review-recall-actions";
import { buildReviewAndRecallQueue } from "@/server/review-recall";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function ReviewsPage() {
  const bootstrap = await getWorkspaceShellBootstrap("manager");
  const organization = bootstrap.organization;
  const workflow = buildReviewAndRecallQueue(
    bootstrap.state,
    organization.id,
    new Date().toISOString(),
  );
  const reviewReadyCount = workflow.reviews.filter((item) => !item.reviewRequested).length;
  const recallReadyCount = workflow.recalls.filter((item) => !item.scheduled).length;
  const recallValue = workflow.recalls
    .filter((item) => !item.scheduled)
    .reduce((sum, item) => sum + item.estimatedValue, 0);

  return (
    <section className="view-grid reviews-grid">
      <PageHeader
        actions={
          <Link className="secondary-button compact-button" href="/inbox">
            Open inbox
          </Link>
        }
        description="Turn booked patients into reviews and missed opportunities into tomorrow callback work."
        eyebrow="Retention"
        title="Reviews and recalls"
      />

      <div className="metrics-row">
        <MetricTile
          icon={Star}
          label="Review opportunities"
          subtitle="Booked patients without review request"
          value={reviewReadyCount}
        />
        <MetricTile
          icon={CalendarClock}
          label="Recall queue"
          subtitle="Lost or at-risk patients needing a callback"
          tone={recallReadyCount > 0 ? "warning" : "neutral"}
          value={recallReadyCount}
        />
        <MetricTile
          icon={TrendingUp}
          label="Recoverable value"
          subtitle="Estimated value in unscheduled recalls"
          tone={recallValue > 0 ? "danger" : "neutral"}
          value={formatCurrency(recallValue, organization)}
        />
      </div>

      <SurfaceCard
        description="Only booked patients appear here. The action creates a human-controlled outbound review request and records an audit event."
        eyebrow="Reputation"
        title="Review requests"
        wide
      >
        <div className="data-table">
          <div className="table-head review-workflow-grid">
            <span>Patient</span>
            <span>Channel</span>
            <span>Booked</span>
            <span>Value</span>
            <span>Action</span>
          </div>
          {workflow.reviews.map((item) => (
            <div className="table-row review-workflow-grid" key={item.leadId}>
              <div className="lead-name">
                <strong>{item.patientName}</strong>
                <span>{item.conversationId}</span>
              </div>
              <span>{item.provider}</span>
              <span>{formatDate(item.bookedAt)}</span>
              <span>{formatCurrency(item.estimatedValue, organization)}</span>
              <ReviewRequestButton disabled={item.reviewRequested} leadId={item.leadId} />
            </div>
          ))}
          {workflow.reviews.length === 0 ? (
            <div className="empty-state compact-empty">
              <Star size={28} />
              <h2>No booked patients ready for review requests</h2>
              <p>Booked leads will appear here after the first completed workflow.</p>
            </div>
          ) : null}
        </div>
      </SurfaceCard>

      <SurfaceCard
        description="The queue ranks missed or at-risk leads by estimated value and creates a scheduled reminder for reception."
        eyebrow="Recovery"
        title="Recall queue"
        wide
      >
        <div className="data-table">
          <div className="table-head recall-workflow-grid">
            <span>Patient</span>
            <span>Reason</span>
            <span>Last touch</span>
            <span>Value</span>
            <span>Action</span>
          </div>
          {workflow.recalls.map((item) => (
            <div className="table-row recall-workflow-grid" key={item.leadId}>
              <div className="lead-name">
                <strong>{item.patientName}</strong>
                <span>{item.conversationId}</span>
              </div>
              <span>{item.reason}</span>
              <span>{formatDate(item.lastTouchAt)}</span>
              <span>{formatCurrency(item.estimatedValue, organization)}</span>
              <RecallReminderButton disabled={item.scheduled} leadId={item.leadId} />
            </div>
          ))}
          {workflow.recalls.length === 0 ? (
            <div className="empty-state compact-empty">
              <CalendarClock size={28} />
              <h2>No recalls waiting</h2>
              <p>Lost, at-risk, and unanswered patients will appear here when a callback is useful.</p>
            </div>
          ) : null}
        </div>
      </SurfaceCard>
    </section>
  );
}
