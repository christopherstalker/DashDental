import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  Clock3,
  CreditCard,
  DollarSign,
  FlaskConical,
  Plug,
  ShieldCheck,
  Siren,
  Users,
  Workflow,
} from "lucide-react";
import { PageHeader } from "@/features/design-system/components/page-header";
import { MetricTile } from "@/features/design-system/components/metric-tile";
import { SurfaceCard } from "@/features/design-system/components/surface-card";
import { SectionBlueprintPage } from "@/features/app-shell/components/section-blueprint-page";
import { getWorkspaceShellBootstrap } from "@/features/app-shell/data/workspace-bootstrap";
import { ReplayEventButton } from "@/features/platform-admin/components/replay-event-button";
import { ManualSubscriptionAdminButton } from "@/features/billing/components/manual-subscription-admin-button";
import {
  getPlatformCommercialOverviewData,
  type PlatformCommercialOverview,
} from "@/features/platform-admin/data/commercial-admin";
import {
  getPlatformFailureDrillCatalogData,
  getPlatformOverviewData,
} from "@/features/platform-admin/data/platform-admin";

function formatTimestamp(value: string | null): string {
  if (!value) {
    return "No recent events";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function platformTenantHref(organizationId: string): string {
  return `/platform/${encodeURIComponent(organizationId)}`;
}

async function loadPlatformAdminData(): Promise<
  | {
      overview: Awaited<ReturnType<typeof getPlatformOverviewData>>;
      drillCatalog: Awaited<ReturnType<typeof getPlatformFailureDrillCatalogData>>;
    }
  | { error: string }
> {
  try {
    const [overview, drillCatalog] = await Promise.all([
      getPlatformOverviewData(),
      getPlatformFailureDrillCatalogData(),
    ]);

    return { overview, drillCatalog };
  } catch {
    return {
      error: "Platform admin data is unavailable.",
    };
  }
}

export default async function PlatformPage() {
  const bootstrap = await getWorkspaceShellBootstrap("super_admin");

  if (!bootstrap.session || bootstrap.session.role !== "super_admin") {
    return (
      <SectionBlueprintPage
        description="Super-admin route for cross-tenant health, subscriptions, and audit visibility."
        eyebrow="Platform"
        metrics={[
          {
            icon: Building2,
            label: "Organizations",
            value: bootstrap.state.organizations.length,
            subtitle: "Visible to platform operator",
          },
        ]}
        panels={[
          {
            eyebrow: "Admin",
            title: "Platform responsibilities",
            items: [
              "See plan status across organizations",
              "Inspect failing integration health",
              "Review approved data access contracts",
              "Support tenants without cross-tenant leakage",
            ],
          },
        ]}
        requiredRole="super_admin"
        session={bootstrap.session}
        title="Platform admin blueprint"
      />
    );
  }

  const [commercialOverview, platformData] = await Promise.all([
    getPlatformCommercialOverviewData(),
    loadPlatformAdminData(),
  ]);

  if ("error" in platformData) {
    return (
      <section className="view-grid admin-grid">
        <PageHeader
          description="Cross-tenant triage surface for webhook failures, queue health, and tenant drill-down."
          eyebrow="Platform"
          title="Support console"
        />
        <CommercialAdminOverview overview={commercialOverview} />
        <section className="empty-state">
          <Clock3 size={34} />
          <h2>Admin runtime unavailable</h2>
          <p>{platformData.error}</p>
        </section>
      </section>
    );
  }

  const { overview, drillCatalog } = platformData;

  return (
    <section className="view-grid admin-grid">
      <PageHeader
          actions={
            <div className="platform-header-actions">
              <Link className="secondary-button compact-button" href="/platform/subscriptions">
                Subscriptions
              </Link>
              <div className="notice">
              <ShieldCheck size={16} />
              <span>
                {bootstrap.session.user.name} - {bootstrap.session.role.replaceAll("_", " ")}
              </span>
              </div>
            </div>
          }
          description="Cross-tenant triage surface for webhook failures, queue health, and tenant drill-down."
          eyebrow="Platform"
          title="Support console"
        />

        <CommercialAdminOverview overview={commercialOverview} />

        <div className="metrics-row">
          <MetricTile
            icon={Building2}
            label="Organizations"
            value={overview.stats.organizations}
            subtitle="Tenants visible to support"
          />
          <MetricTile
            icon={AlertTriangle}
            label="Failed receipts"
            tone={overview.stats.failedReceipts > 0 ? "danger" : "neutral"}
            value={overview.stats.failedReceipts}
            subtitle="Webhook processing failures"
          />
          <MetricTile
            icon={Siren}
            label="Failed outbox"
            tone={overview.stats.failedOutbox > 0 ? "danger" : "neutral"}
            value={overview.stats.failedOutbox}
            subtitle="Dispatch failures waiting on support"
          />
          <MetricTile
            icon={Plug}
            label="Degraded integrations"
            tone={overview.stats.degradedIntegrations > 0 ? "warning" : "neutral"}
            value={overview.stats.degradedIntegrations}
            subtitle="Tenants with provider health issues"
          />
          <MetricTile
            icon={Workflow}
            label="Critical queue backlog"
            tone={overview.runtime.queues.totals.criticalBacklog > 0 ? "warning" : "neutral"}
            value={overview.runtime.queues.totals.criticalBacklog}
            subtitle={`${overview.runtime.queues.totals.criticalFailed} failed critical jobs`}
          />
          <MetricTile
            icon={Clock3}
            label="Recoverable stuck work"
            tone={
              overview.runtime.recovery.receipts.recoverable +
                overview.runtime.recovery.outbox.recoverable >
              0
                ? "warning"
                : "neutral"
            }
            value={
              overview.runtime.recovery.receipts.recoverable +
              overview.runtime.recovery.outbox.recoverable
            }
            subtitle="Receipts and outbox ready for sweep"
          />
        </div>

        <SurfaceCard
          description="Actionable runtime alerts built from queue, reconciliation, recovery, and projection health signals."
          eyebrow="Signals"
          title="Runtime alerts"
          wide
        >
          {overview.runtime.alerts.length === 0 ? (
            <div className="compact-alert info aligned-left">
              <ShieldCheck size={16} />
              <span>No active runtime alerts. Keep watching provider delivery and queue pressure.</span>
            </div>
          ) : (
            <div className="event-list">
              {overview.runtime.alerts.map((alert) => (
                <div className={`event-row alert-row ${alert.severity}`} key={alert.code}>
                  <div className="admin-event-main">
                    <div className="admin-event-title-row">
                      <strong>{alert.title}</strong>
                      <span className={`status-dot ${mapAlertTone(alert.severity)}`}>
                        {alert.severity}
                      </span>
                    </div>
                    <span>{alert.detail}</span>
                    <p>{alert.runbook}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard
          description="Runtime pressure across queues, recoverable stuck work, and reconciliation signals for silent integrations or late receipts."
          eyebrow="Runtime"
          title="Runtime controls"
          wide
        >
          <div className="dashboard-command">
            <div className="blueprint-copy">
              <strong>Recovery and reconciliation</strong>
              <p>
                Recovery reclaims stale receipts and outbox work. Reconciliation flags silent
                integrations using a DB lease so multiple backend instances do not sweep the same
                runtime backlog in parallel.
              </p>
            </div>
            <div className="dashboard-command-actions">
              <ReplayEventButton
                endpoint="/api/v1/admin/support/runtime/recover"
                force={false}
                label="Run recovery sweep"
                pendingLabel="Running sweep..."
                successMessage="Recovery sweep finished"
              />
              <ReplayEventButton
                endpoint="/api/v1/admin/support/runtime/reconcile"
                force={false}
                label="Run reconciliation"
                pendingLabel="Running reconcile..."
                successMessage="Reconciliation sweep finished"
              />
              <ReplayEventButton
                endpoint="/api/v1/admin/support/runtime/projections/rebuild"
                force={false}
                label="Rebuild projections"
                pendingLabel="Rebuilding..."
                requestBody={{}}
                successMessage="Projection rebuild finished"
              />
              <ReplayEventButton
                endpoint="/api/v1/admin/support/runtime/data-lifecycle/sweep"
                force={false}
                label="Lifecycle dry-run"
                pendingLabel="Checking retention..."
                requestBody={{ dryRun: true }}
                successMessage="Lifecycle dry-run finished"
              />
            </div>
          </div>

          <div className="support-stat-grid">
            <div className="compact-alert info aligned-left">
              <strong>Receipt recovery</strong>
              <span>
                {overview.runtime.recovery.receipts.recoverable} recoverable,{" "}
                {overview.runtime.recovery.receipts.deadLetter} dead-letter
              </span>
            </div>
            <div className="compact-alert info aligned-left">
              <strong>Outbox recovery</strong>
              <span>
                {overview.runtime.recovery.outbox.recoverable} recoverable,{" "}
                {overview.runtime.recovery.outbox.deadLetter} dead-letter
              </span>
            </div>
            <div
              className={`compact-alert ${
                overview.runtime.queues.totals.criticalFailed > 0 ? "critical" : "info"
              } aligned-left`}
            >
              <strong>Critical queues</strong>
              <span>
                {overview.runtime.queues.totals.criticalBacklog} backlog,{" "}
                {overview.runtime.queues.totals.criticalFailed} failed
              </span>
            </div>
            <div
              className={`compact-alert ${
                overview.runtime.queues.totals.paused > 0 ? "warning" : "info"
              } aligned-left`}
            >
              <strong>Paused queues</strong>
              <span>{overview.runtime.queues.totals.paused} queue(s) currently paused</span>
            </div>
            <div
              className={`compact-alert ${
                overview.runtime.reconciliation.staleIntegrations > 0 ? "warning" : "info"
              } aligned-left`}
            >
              <strong>Silent integrations</strong>
              <span>
                {overview.runtime.reconciliation.staleIntegrations} stale across{" "}
                {overview.runtime.reconciliation.monitoredIntegrations} monitored
              </span>
            </div>
            <div
              className={`compact-alert ${
                overview.runtime.reconciliation.lateReceipts24h > 0 ? "warning" : "info"
              } aligned-left`}
            >
              <strong>Late receipts · 24h</strong>
              <span>
                {overview.runtime.reconciliation.lateReceipts24h} late,{" "}
                {overview.runtime.reconciliation.unresolvedRecentReceipts} unresolved recent
              </span>
            </div>
            <div
              className={`compact-alert ${
                overview.runtime.projections.missingConversationProjections +
                  overview.runtime.projections.staleConversationProjections >
                0
                  ? "warning"
                  : "info"
              } aligned-left`}
            >
              <strong>Projection drift</strong>
              <span>
                {overview.runtime.projections.missingConversationProjections} missing,{" "}
                {overview.runtime.projections.staleConversationProjections} stale
              </span>
            </div>
            <div
              className={`compact-alert ${
                overview.runtime.billing.failed + overview.runtime.billing.staleProcessing > 0
                  ? "critical"
                  : overview.runtime.billing.processing > 0
                    ? "warning"
                    : "info"
              } aligned-left`}
            >
              <strong>Billing ledger</strong>
              <span>
                {overview.runtime.billing.failed} failed,{" "}
                {overview.runtime.billing.staleProcessing} stuck,{" "}
                {overview.runtime.billing.processed24h} synced 24h
              </span>
            </div>
            <div
              className={`compact-alert ${
                overview.runtime.dataLifecycle.purgeable.total > 10000
                  ? "warning"
                  : "info"
              } aligned-left`}
            >
              <strong>Data lifecycle</strong>
              <span>
                {overview.runtime.dataLifecycle.purgeable.total} purgeable,{" "}
                {overview.runtime.dataLifecycle.policies.operationalRetentionDays}d ops retention
              </span>
            </div>
          </div>

          <div className="event-list">
            {overview.runtime.queues.queues.map((queue) => (
              <div className="event-row admin-event-row" key={queue.name}>
                <div className="admin-event-main">
                  <div className="admin-event-title-row">
                    <strong>{queue.name}</strong>
                    <span className={`status-dot ${queue.paused ? "degraded" : "active"}`}>
                      {queue.paused ? "paused" : queue.critical ? "critical" : "normal"}
                    </span>
                  </div>
                  <span>
                    waiting {queue.waiting} - active {queue.active} - delayed {queue.delayed}
                  </span>
                  <p>
                    backlog {queue.backlog}
                    {queue.failed > 0 ? ` - failed ${queue.failed}` : ""}
                    {queue.pausedJobs > 0 ? ` - paused jobs ${queue.pausedJobs}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="event-list">
            {overview.runtime.reconciliation.stalePreview.map((integration) => (
              <div
                className="event-row admin-event-row"
                key={`${integration.organizationId}-${integration.integrationId}`}
              >
                <div className="admin-event-main">
                  <div className="admin-event-title-row">
                    <strong>{integration.provider}</strong>
                    <span className={`status-dot ${mapStatusTone(integration.status)}`}>
                      {integration.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <span>
                    {integration.organizationId} - {integration.minutesSinceActivity} min since
                    activity
                  </span>
                  <p>
                    threshold {integration.silenceThresholdMinutes} min - baseline{" "}
                    {integration.baselineReceipts}
                    {integration.errorState ? ` - ${integration.errorState}` : ""}
                  </p>
                </div>
                <div className="row-actions">
                  <Link
                    className="secondary-button compact-button"
                    href={platformTenantHref(integration.organizationId)}
                  >
                    Open tenant
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="event-list">
            {overview.runtime.reconciliation.providerGaps.unresolvedByProviderAccount.map((gap) => (
              <div
                className="event-row admin-event-row"
                key={`${gap.provider}-${gap.providerAccountKey}`}
              >
                <div className="admin-event-main">
                  <div className="admin-event-title-row">
                    <strong>{gap.provider}</strong>
                    <span className="status-dot pending">{gap.receipts} unresolved</span>
                  </div>
                  <span>{gap.providerAccountKey}</span>
                  <p>
                    {gap.suspectedReason.replaceAll("_", " ")}
                    {gap.latestReceivedAt ? ` - latest ${formatTimestamp(gap.latestReceivedAt)}` : ""}
                  </p>
                </div>
              </div>
            ))}
            {overview.runtime.reconciliation.providerGaps.lateByProvider.map((bucket) => (
              <div
                className="event-row admin-event-row"
                key={`${bucket.provider}-${bucket.channelProvider ?? "unknown"}`}
              >
                <div className="admin-event-main">
                  <div className="admin-event-title-row">
                    <strong>
                      {bucket.channelProvider ?? bucket.provider} late delivery
                    </strong>
                    <span className="status-dot pending">{bucket.receipts} receipt(s)</span>
                  </div>
                  <span>
                    max delay {bucket.maxDelayMinutes} min
                    {bucket.latestReceivedAt ? ` - latest ${formatTimestamp(bucket.latestReceivedAt)}` : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard
          description="Support-only drills that inject real synthetic webhooks into the same durable receipt and outbox pipeline used by providers."
          eyebrow="Failure drills"
          title="Provider-specific incident checks"
          wide
        >
          <div className="event-list">
            {drillCatalog.scenarios.map((scenario) => (
              <div className="event-row admin-event-row" key={scenario.scenario}>
                <div className="admin-event-main">
                  <div className="admin-event-title-row">
                    <strong>{scenario.title}</strong>
                    <span className="status-dot pending">{scenario.provider}</span>
                  </div>
                  <span>{scenario.scenario}</span>
                  <p>{scenario.expectedSignal}</p>
                </div>
                <div className="row-actions">
                  <ReplayEventButton
                    endpoint={`/api/v1/admin/support/runtime/drills/${scenario.scenario}/run`}
                    force={false}
                    label="Run drill"
                    pendingLabel="Running drill..."
                    requestBody={{}}
                    successMessage="Failure drill finished"
                    tone={scenario.destructive ? "danger" : "neutral"}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="compact-alert info aligned-left">
            <FlaskConical size={16} />
            <span>
              Drills create synthetic receipts, outbox events, audit rows, and for resolved
              messaging drills, materialized inbox records.
            </span>
          </div>
        </SurfaceCard>

        <SurfaceCard
          description="Newest failures across receipts and outbox dispatch, ordered by customer impact time."
          eyebrow="Triage"
          title="Problem queue"
          wide
        >
          {overview.recentFailures.length === 0 ? (
            <div className="empty-state compact-empty">
              <ShieldCheck size={28} />
              <h2>No active failures</h2>
              <p>The runtime pipeline is currently clear across receipts and outbox dispatch.</p>
            </div>
          ) : (
            <div className="event-list">
              {overview.recentFailures.map((failure) => (
                <div className="event-row admin-event-row" key={`${failure.kind}-${failure.id}`}>
                  <div className="admin-event-main">
                    <div className="admin-event-title-row">
                      <strong>{failure.title}</strong>
                      <span className={`status-dot ${mapStatusTone(failure.status)}`}>
                        {failure.status.replaceAll("_", " ")}
                      </span>
                    </div>
                    <span>
                      {failure.organizationName}
                      {failure.provider ? ` · ${failure.provider}` : ""}
                      {failure.correlationId ? ` · corr ${failure.correlationId}` : ""}
                    </span>
                    <p>{failure.detail}</p>
                  </div>
                  {failure.organizationId ? (
                    <Link
                      className="secondary-button compact-button"
                      href={platformTenantHref(failure.organizationId)}
                    >
                      Open tenant
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard
          description="Tenant-level view of pipeline pressure, integration health, and the newest receipt seen."
          eyebrow="Tenants"
          title="Organization drill-down"
          wide
        >
          <div className="data-table">
            <div className="table-head platform-org-grid">
              <span>Organization</span>
              <span>Plan</span>
              <span>Integrations</span>
              <span>Pipeline</span>
              <span>Last receipt</span>
              <span>Actions</span>
            </div>
            {overview.organizations.map((organization) => (
              <div className="table-row platform-org-grid" key={organization.id}>
                <div className="lead-name">
                  <strong>{organization.name}</strong>
                  <span>
                    {organization.status} · {organization.timezone}
                  </span>
                </div>
                <div className="admin-cell-stack">
                  <strong>{organization.plan ?? "none"}</strong>
                  <span>{organization.subscriptionStatus ?? "no subscription"}</span>
                </div>
                <div className="admin-cell-stack">
                  <strong>{organization.activeIntegrations}</strong>
                  <span>
                    {organization.degradedIntegrations > 0
                      ? `${organization.degradedIntegrations} degraded`
                      : `${organization.totalIntegrations} total`}
                  </span>
                </div>
                <div className="admin-cell-stack">
                  <strong>
                    {organization.failedReceipts + organization.failedOutbox > 0
                      ? organization.failedReceipts + organization.failedOutbox
                      : organization.pendingReceipts + organization.pendingOutbox}
                  </strong>
                  <span>
                    {organization.failedReceipts + organization.failedOutbox > 0
                      ? `${organization.failedReceipts} receipt / ${organization.failedOutbox} outbox failed`
                      : `${organization.pendingReceipts} receipt / ${organization.pendingOutbox} outbox pending`}
                  </span>
                </div>
                <div className="admin-cell-stack">
                  <strong>{formatTimestamp(organization.lastReceiptAt)}</strong>
                  <span>{organization.currency}</span>
                </div>
                <div className="row-actions">
                  <Link
                    className="secondary-button compact-button"
                    href={platformTenantHref(organization.id)}
                  >
                    Open timeline
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard
          description="Platform-wide counters and runbook hints to use before an incident becomes a customer escalation."
          eyebrow="Watch"
          title="Operator notes"
        >
          <div className="event-list">
            <div className="event-row">
              <strong>Unresolved receipts</strong>
              <span>{overview.stats.unresolvedReceipts}</span>
              <p>These reached ingress without a resolved tenant or integration mapping.</p>
            </div>
            <div className="event-row">
              <strong>Failed dispatch</strong>
              <span>{overview.stats.failedOutbox}</span>
              <p>Replay from the tenant page once the underlying provider or mapping issue is fixed.</p>
            </div>
            {overview.runtime.runbookHints.map((hint) => (
              <div className="event-row" key={hint}>
                <strong>Runbook hint</strong>
                <p>{hint}</p>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard
          description="Use tenant drill-down to inspect receipt correlation, related records, and replay specific incidents."
          eyebrow="Workflow"
          title="How to use this console"
        >
          <div className="event-list">
            <div className="event-row">
              <strong>1. Triage the newest failure</strong>
              <span>Start from Problem queue</span>
            </div>
            <div className="event-row">
              <strong>2. Open the tenant timeline</strong>
              <span>Correlate receipt, outbox, usage, and audit events</span>
            </div>
            <div className="event-row">
              <strong>3. Replay only what is needed</strong>
              <span>Prefer outbox replay before forcing full receipt replay</span>
            </div>
          </div>
        </SurfaceCard>
      </section>
    );
}

function CommercialAdminOverview({ overview }: { overview: PlatformCommercialOverview }) {
  return (
    <>
      <div className="metrics-row">
        <MetricTile
          icon={Building2}
          label="Clinics"
          subtitle="Registered tenant workspaces"
          value={overview.stats.clinics}
        />
        <MetricTile
          icon={CreditCard}
          label="Active subscriptions"
          subtitle={`${overview.stats.trialingSubscriptions} trialing, ${overview.stats.lockedSubscriptions} locked`}
          tone={overview.stats.lockedSubscriptions > 0 ? "warning" : "neutral"}
          value={overview.stats.activeSubscriptions}
        />
        <MetricTile
          icon={DollarSign}
          label="Manual MRR"
          subtitle="Active manual subscriptions"
          value={`$${overview.stats.mrr}`}
        />
        <MetricTile
          icon={Users}
          label="Seats"
          subtitle="Used across all clinics"
          value={`${overview.stats.usedSeats}/${overview.stats.maxSeats || "?"}`}
        />
      </div>

      <SurfaceCard
        description="Commercial operator panel: see clinic activity, seat pressure, integration readiness, and activate a subscription with one click after bank-transfer confirmation."
        eyebrow="Commercial control"
        title="Clinics, activity, and subscriptions"
        wide
      >
        <div className="data-table">
          <div className="table-head platform-commercial-grid">
            <span>Clinic</span>
            <span>Subscription</span>
            <span>Activity</span>
            <span>Seats</span>
            <span>Channels</span>
            <span>Recovery</span>
            <span>Period</span>
            <span>Activate</span>
          </div>
          {overview.clinics.map((clinic) => (
            <div className="table-row platform-commercial-grid" key={clinic.id}>
              <div className="lead-name">
                <strong>{clinic.name}</strong>
                <span>
                  {clinic.status} - {clinic.timezone}
                </span>
              </div>
              <div className="admin-cell-stack">
                <strong>{clinic.plan}</strong>
                <span className={`status-dot ${mapStatusTone(clinic.subscriptionStatus)}`}>
                  {clinic.subscriptionStatus}
                </span>
              </div>
              <div className="admin-cell-stack">
                <strong>{formatTimestamp(clinic.lastActivityAt)}</strong>
                <span>
                  {clinic.leads7d} leads / {clinic.messages7d} messages in 7d
                </span>
              </div>
              <div className="admin-cell-stack">
                <strong>
                  {clinic.usedSeats}/{clinic.maxSeats || "?"}
                </strong>
                <span>{clinic.openConversations} open threads</span>
              </div>
              <div className="admin-cell-stack">
                <strong>{clinic.activeIntegrations} live</strong>
                <span>{clinic.degradedIntegrations} degraded</span>
              </div>
              <div className="admin-cell-stack">
                <strong>${clinic.recoverableRevenue}</strong>
                <span>{clinic.currency} recoverable</span>
              </div>
              <div className="admin-cell-stack">
                <strong>{clinic.daysRemaining}d left</strong>
                <span>{clinic.currentPeriodEnd ? formatTimestamp(clinic.currentPeriodEnd) : "No period"}</span>
              </div>
              <div className="row-actions admin-row-actions">
                <ManualSubscriptionAdminButton
                  label="Starter"
                  organizationId={clinic.id}
                  plan="starter"
                />
                <ManualSubscriptionAdminButton
                  label="Growth"
                  organizationId={clinic.id}
                  plan="growth"
                />
                <ManualSubscriptionAdminButton
                  label="Scale"
                  organizationId={clinic.id}
                  plan="scale"
                />
                <Link className="secondary-button compact-button" href={platformTenantHref(clinic.id)}>
                  Debug
                </Link>
              </div>
            </div>
          ))}
        </div>
      </SurfaceCard>
    </>
  );
}

function mapStatusTone(status: string): string {
  if (
    status === "failed" ||
    status === "dead_letter" ||
    status === "degraded" ||
    status === "disconnected" ||
    status === "expired" ||
    status === "past_due" ||
    status === "canceled" ||
    status === "not_configured"
  ) {
    return "degraded";
  }

  if (
    status === "pending" ||
    status === "received" ||
    status === "processing" ||
    status === "dispatching" ||
    status === "skipped" ||
    status === "trialing"
  ) {
    return "pending";
  }

  return "active";
}

function mapAlertTone(severity: string): string {
  if (severity === "critical") {
    return "degraded";
  }

  if (severity === "warning") {
    return "pending";
  }

  return "active";
}
