import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Clock3,
  FileWarning,
  MessageSquareMore,
  Plug,
  ReceiptText,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { PageHeader } from "@/features/design-system/components/page-header";
import { MetricTile } from "@/features/design-system/components/metric-tile";
import { SurfaceCard } from "@/features/design-system/components/surface-card";
import { SectionBlueprintPage } from "@/features/app-shell/components/section-blueprint-page";
import { ManualSubscriptionAdminButton } from "@/features/billing/components/manual-subscription-admin-button";
import { getWorkspaceShellBootstrap } from "@/features/app-shell/data/workspace-bootstrap";
import { ReplayEventButton } from "@/features/platform-admin/components/replay-event-button";
import { getPlatformTenantDebugData } from "@/features/platform-admin/data/platform-admin";
import { redactForLog } from "@/server/observability";

export const dynamic = "force-dynamic";

function formatTimestamp(value: string | null): string {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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

function normalizeReceiptId(
  value: string | string[] | undefined,
): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function renderJson(value: unknown) {
  return JSON.stringify(redactForLog(value), null, 2);
}

async function loadTenantDebugData(
  organizationId: string,
  receiptId: string | string[] | undefined,
): Promise<
  | { debugView: Awaited<ReturnType<typeof getPlatformTenantDebugData>> }
  | { error: string }
> {
  try {
    const debugView = await getPlatformTenantDebugData(organizationId, {
      limit: 20,
      receiptId: normalizeReceiptId(receiptId),
    });

    return { debugView };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Tenant debug data is unavailable.",
    };
  }
}

export default async function PlatformOrganizationPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizationId: string }>;
  searchParams: Promise<{ receiptId?: string | string[] }>;
}) {
  const bootstrap = await getWorkspaceShellBootstrap("super_admin");

  if (!bootstrap.session || bootstrap.session.role !== "super_admin") {
    return (
      <SectionBlueprintPage
        description="Super-admin route for tenant-level runtime forensics and replay tooling."
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
            title: "Tenant debug timeline",
            items: [
              "Inspect receipt to outbox progression",
              "See related contact, lead, conversation and message records",
              "Replay failed receipts or outbox events with support-only access",
            ],
          },
        ]}
        requiredRole="super_admin"
        session={bootstrap.session}
        title="Tenant runtime timeline"
      />
    );
  }

  const { organizationId } = await params;
  const { receiptId } = await searchParams;
  const tenantDebugData = await loadTenantDebugData(organizationId, receiptId);

  if ("error" in tenantDebugData) {
    return (
      <section className="view-grid admin-grid">
        <PageHeader
          actions={
            <Link className="secondary-button compact-button" href="/platform">
              <ArrowLeft size={15} />
              <span>Back to platform</span>
            </Link>
          }
          description="Tenant-level runtime timeline with correlated receipt, outbox, usage, and audit facts."
          eyebrow="Tenant debug"
          title="Tenant timeline"
        />
        <section className="empty-state">
          <Clock3 size={34} />
          <h2>Tenant runtime unavailable</h2>
          <p>{tenantDebugData.error}</p>
        </section>
      </section>
    );
  }

  const { debugView } = tenantDebugData;

  return (
    <section className="view-grid admin-grid">
      <PageHeader
          actions={
            <div className="platform-header-actions">
              <Link className="secondary-button compact-button" href="/platform">
                <ArrowLeft size={15} />
                <span>Back to platform</span>
              </Link>
              <div className="notice">
                <ShieldCheck size={16} />
                <span>
                  {debugView.organization.name} · {debugView.organization.status}
                </span>
              </div>
            </div>
          }
          description="Tenant-level runtime timeline with correlated receipt, outbox, usage, and audit facts."
          eyebrow="Tenant debug"
          title={debugView.organization.name}
        />

        <div className="metrics-row">
          <MetricTile
            icon={Plug}
            label="Integrations"
            value={debugView.stats.activeIntegrations}
            subtitle={`${debugView.stats.degradedIntegrations} degraded`}
            tone={debugView.stats.degradedIntegrations > 0 ? "warning" : "neutral"}
          />
          <MetricTile
            icon={ReceiptText}
            label="Receipts · 24h"
            value={debugView.stats.receipts24h}
            subtitle={`${debugView.stats.failedReceipts} failed`}
            tone={debugView.stats.failedReceipts > 0 ? "danger" : "neutral"}
          />
          <MetricTile
            icon={Workflow}
            label="Outbox backlog"
            value={debugView.stats.pendingOutbox}
            subtitle={`${debugView.stats.failedOutbox} failed`}
            tone={debugView.stats.failedOutbox > 0 ? "danger" : "neutral"}
          />
          <MetricTile
            icon={MessageSquareMore}
            label="Inbound · 24h"
            value={debugView.stats.inboundMessages24h}
            subtitle={debugView.subscription?.plan ?? "no subscription"}
          />
        </div>

        <SurfaceCard
          description="Use this only after bank transfer funds are confirmed. It updates the tenant subscription, plan limits, and audit trail without enabling unsafe direct billing for clinic users."
          eyebrow="Manual billing"
          title="Activate paid bank-transfer plan"
          wide
        >
          <div className="dashboard-command">
            <div className="blueprint-copy">
              <strong>
                Current plan: {debugView.subscription?.plan ?? "none"} /{" "}
                {debugView.subscription?.status ?? "no subscription"}
              </strong>
              <p>
                Manual activation is super-admin only. Invoice requests are recorded in audit
                logs; this button is the explicit operator confirmation that money arrived.
              </p>
            </div>
            <div className="dashboard-command-actions">
              <ManualSubscriptionAdminButton organizationId={organizationId} plan="starter" />
              <ManualSubscriptionAdminButton organizationId={organizationId} plan="growth" />
              <ManualSubscriptionAdminButton organizationId={organizationId} plan="scale" />
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard
          description="Operational hints for this tenant before forcing replays or escalating to provider support."
          eyebrow="Runbook"
          title="Tenant recovery guide"
          wide
        >
          <div className="support-stat-grid">
            <div className="compact-alert info aligned-left">
              <strong>Global receipt recovery</strong>
              <span>
                {debugView.runtime.recovery.receipts.recoverable} recoverable,{" "}
                {debugView.runtime.recovery.receipts.deadLetter} dead-letter
              </span>
            </div>
            <div className="compact-alert info aligned-left">
              <strong>Global outbox recovery</strong>
              <span>
                {debugView.runtime.recovery.outbox.recoverable} recoverable,{" "}
                {debugView.runtime.recovery.outbox.deadLetter} dead-letter
              </span>
            </div>
            <div
              className={`compact-alert ${
                debugView.runtime.reconciliation.staleIntegrations > 0 ? "warning" : "info"
              } aligned-left`}
            >
              <strong>Silent integrations</strong>
              <span>
                {debugView.runtime.reconciliation.staleIntegrations} stale integration(s)
              </span>
            </div>
            <div
              className={`compact-alert ${
                debugView.runtime.reconciliation.lateReceipts24h > 0 ? "warning" : "info"
              } aligned-left`}
            >
              <strong>Late receipts · 24h</strong>
              <span>
                {debugView.runtime.reconciliation.lateReceipts24h} late,{" "}
                {debugView.runtime.reconciliation.failedReceipts24h} failed
              </span>
            </div>
          </div>
          <div className="event-list">
            {debugView.runtime.runbookHints.map((hint) => (
              <div className="event-row" key={hint}>
                <strong>Runbook hint</strong>
                <p>{hint}</p>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard
          description="Current provider status, health score, and last sync markers for this tenant."
          eyebrow="Integrations"
          title="Tenant integration health"
          wide
        >
          <div className="event-list">
            {debugView.integrations.map((integration) => (
              <div className="event-row admin-event-row" key={integration.id}>
                <div className="admin-event-main">
                  <div className="admin-event-title-row">
                    <strong>{integration.provider}</strong>
                    <span className={`status-dot ${mapStatusTone(integration.status)}`}>
                      {integration.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <span>
                    health {integration.healthScore}
                    {integration.externalAccountId
                      ? ` · account ${integration.externalAccountId}`
                      : ""}
                    {integration.lastSyncAt ? ` · last sync ${formatTimestamp(integration.lastSyncAt)}` : ""}
                  </span>
                  {integration.errorState ? <p>{integration.errorState}</p> : null}
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard
          description="Reconciliation view of silence risk based on recent provider activity and historical baseline receipts."
          eyebrow="Reconciliation"
          title="Integration silence analysis"
          wide
        >
          <div className="event-list">
            {debugView.runtime.reconciliation.integrations.map((integration) => (
              <div className="event-row admin-event-row" key={integration.integrationId}>
                <div className="admin-event-main">
                  <div className="admin-event-title-row">
                    <strong>{integration.provider}</strong>
                    <span
                      className={`status-dot ${
                        integration.isSilenceStale ? "pending" : mapStatusTone(integration.currentStatus)
                      }`}
                    >
                      {integration.isSilenceStale ? "silence risk" : integration.currentStatus.replaceAll("_", " ")}
                    </span>
                  </div>
                  <span>
                    {integration.minutesSinceActivity} min since activity · threshold{" "}
                    {integration.silenceThresholdMinutes} min · baseline{" "}
                    {integration.baselineReceipts}
                  </span>
                  <p>
                    next status {integration.nextStatus.replaceAll("_", " ")}
                    {integration.lastSyncAt ? ` · sync ${formatTimestamp(integration.lastSyncAt)}` : ""}
                    {integration.lastReceiptAt ? ` · last receipt ${formatTimestamp(integration.lastReceiptAt)}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>

        {debugView.runtime.reconciliation.lateReceiptSamples.length > 0 ? (
          <SurfaceCard
            description="Recent receipts where provider occurrence time is materially older than platform receipt time."
            eyebrow="Reconciliation"
            title="Late delivery samples"
            wide
          >
            <div className="event-list">
              {debugView.runtime.reconciliation.lateReceiptSamples.map((receipt) => (
                <div className="event-row admin-event-row" key={receipt.id}>
                  <div className="admin-event-main">
                    <div className="admin-event-title-row">
                      <strong>{receipt.channelProvider ?? receipt.provider}</strong>
                      <span className={`status-dot ${mapStatusTone(receipt.processingStatus)}`}>
                        {receipt.processingStatus.replaceAll("_", " ")}
                      </span>
                    </div>
                    <span>{receipt.externalEventId}</span>
                    <p>
                      delay {receipt.delayMinutes} min - occurred{" "}
                      {formatTimestamp(receipt.occurredAt)} - received{" "}
                      {formatTimestamp(receipt.receivedAt)}
                    </p>
                  </div>
                  <div className="row-actions">
                    <Link
                      className="secondary-button compact-button"
                      href={`/platform/${organizationId}?receiptId=${receipt.id}`}
                    >
                      Inspect
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </SurfaceCard>
        ) : null}

        <SurfaceCard
          description="Merged runtime sequence across ingress, dispatch, usage and audit facts."
          eyebrow="Timeline"
          title="Tenant event timeline"
          wide
        >
          <div className="event-list">
            {debugView.timeline.map((item) => (
              <div className="event-row admin-event-row" key={item.id}>
                <div className="admin-event-main">
                  <div className="admin-event-title-row">
                    <strong>{item.title}</strong>
                    <span className={`status-dot ${mapStatusTone(item.status)}`}>
                      {item.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <span>
                    {item.kind.replaceAll("_", " ")}
                    {item.provider ? ` · ${item.provider}` : ""}
                    {item.correlationId ? ` · corr ${item.correlationId}` : ""}
                  </span>
                  <p>{item.detail}</p>
                </div>
                <div className="admin-event-meta">
                  <strong>{formatTimestamp(item.occurredAt)}</strong>
                  {item.externalEventId ? <span>{item.externalEventId}</span> : null}
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard
          description="Newest ingress receipts with direct drill-down into the related incident."
          eyebrow="Ingress"
          title="Recent receipts"
          wide
        >
          <div className="data-table">
            <div className="table-head tenant-receipt-grid">
              <span>Receipt</span>
              <span>Status</span>
              <span>Correlation</span>
              <span>Outbox</span>
              <span>Updated</span>
              <span>Actions</span>
            </div>
            {debugView.receipts.map((receipt) => (
              <div className="table-row tenant-receipt-grid" key={receipt.id}>
                <div className="lead-name">
                  <strong>{receipt.provider}</strong>
                  <span>{receipt.externalEventId}</span>
                </div>
                <div className="admin-cell-stack">
                  <span className={`status-dot ${mapStatusTone(receipt.processingStatus)}`}>
                    {receipt.processingStatus.replaceAll("_", " ")}
                  </span>
                  <span>{receipt.signatureStatus.replaceAll("_", " ")}</span>
                </div>
                <div className="admin-cell-stack">
                  <strong>{receipt.correlationId}</strong>
                  <span>{receipt.payloadSummary ?? "No payload summary"}</span>
                </div>
                <div className="admin-cell-stack">
                  <strong>{receipt.outboxEvents.length}</strong>
                  <span>
                    {receipt.outboxEvents.map((event) => event.status).join(" · ") || "No outbox"}
                  </span>
                </div>
                <div className="admin-cell-stack">
                  <strong>{formatTimestamp(receipt.lastProcessedAt ?? receipt.receivedAt)}</strong>
                  <span>
                    retry {receipt.retryCount}
                    {receipt.lastErrorCode ? ` · ${receipt.lastErrorCode}` : ""}
                  </span>
                </div>
                <div className="row-actions admin-row-actions">
                  <Link
                    className="secondary-button compact-button"
                    href={`/platform/${organizationId}?receiptId=${receipt.id}`}
                  >
                    Inspect
                  </Link>
                  <ReplayEventButton
                    endpoint={`/api/v1/admin/support/receipts/${receipt.id}/replay`}
                    force={false}
                    label="Replay receipt"
                    tone={
                      receipt.processingStatus === "failed" ||
                      receipt.processingStatus === "dead_letter"
                        ? "danger"
                        : "neutral"
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>

        {debugView.selectedIncident ? (
          <SurfaceCard
            description="Correlated detail for the selected receipt, including related domain records and replay handles."
            eyebrow="Incident"
            title={`Incident detail · ${debugView.selectedIncident.receipt.id}`}
            wide
          >
            <div className="incident-grid">
              <div className="admin-nested-card">
                <div className="section-heading compact-heading">
                  <div>
                    <p className="eyebrow">Receipt</p>
                    <h3>Ingress fact</h3>
                  </div>
                </div>
                <div className="inspector-list">
                  <div className="info-line">
                    <span>Provider</span>
                    <strong>{debugView.selectedIncident.receipt.provider}</strong>
                  </div>
                  <div className="info-line">
                    <span>Status</span>
                    <strong>{debugView.selectedIncident.receipt.processingStatus}</strong>
                  </div>
                  <div className="info-line">
                    <span>Correlation</span>
                    <strong>{debugView.selectedIncident.receipt.correlationId}</strong>
                  </div>
                  <div className="info-line">
                    <span>Received</span>
                    <strong>{formatTimestamp(debugView.selectedIncident.receipt.receivedAt)}</strong>
                  </div>
                </div>
              </div>

              <div className="admin-nested-card">
                <div className="section-heading compact-heading">
                  <div>
                    <p className="eyebrow">Related records</p>
                    <h3>Domain materialization</h3>
                  </div>
                </div>
                <div className="inspector-list">
                  <div className="info-line">
                    <span>Contact</span>
                    <strong>
                      {debugView.selectedIncident.relatedRecords.contact?.displayName ?? "Not found"}
                    </strong>
                  </div>
                  <div className="info-line">
                    <span>Lead</span>
                    <strong>{debugView.selectedIncident.relatedRecords.lead?.id ?? "Not found"}</strong>
                  </div>
                  <div className="info-line">
                    <span>Conversation</span>
                    <strong>
                      {debugView.selectedIncident.relatedRecords.conversation?.id ?? "Not found"}
                    </strong>
                  </div>
                  <div className="info-line">
                    <span>Message</span>
                    <strong>
                      {debugView.selectedIncident.relatedRecords.message?.id ?? "Not found"}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="admin-nested-card incident-span-2">
                <div className="section-heading compact-heading">
                  <div>
                    <p className="eyebrow">Outbox chain</p>
                    <h3>Replay handles</h3>
                  </div>
                </div>
                <div className="event-list">
                  {debugView.selectedIncident.outboxEvents.map((event) => (
                    <div className="event-row admin-event-row" key={event.id}>
                      <div className="admin-event-main">
                        <div className="admin-event-title-row">
                          <strong>{event.eventName}</strong>
                          <span className={`status-dot ${mapStatusTone(event.status)}`}>
                            {event.status.replaceAll("_", " ")}
                          </span>
                        </div>
                        <span>
                          {event.aggregateType} · {event.aggregateId}
                        </span>
                        {event.lastErrorMessage ? <p>{event.lastErrorMessage}</p> : null}
                      </div>
                      <div className="admin-row-actions">
                        <ReplayEventButton
                          endpoint={`/api/v1/admin/support/outbox/${event.id}/replay`}
                          force={false}
                          label="Replay outbox"
                          tone={
                            event.status === "failed" || event.status === "dead_letter"
                              ? "danger"
                              : "neutral"
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="admin-nested-card incident-span-2">
                <div className="section-heading compact-heading">
                  <div>
                    <p className="eyebrow">Replay ledger</p>
                    <h3>Attempts and safety decisions</h3>
                  </div>
                </div>
                {debugView.selectedIncident.replayAttempts.length === 0 ? (
                  <div className="compact-alert info aligned-left">
                    <ShieldCheck size={16} />
                    <span>No replay attempts are recorded for this incident yet.</span>
                  </div>
                ) : (
                  <div className="event-list">
                    {debugView.selectedIncident.replayAttempts.map((attempt) => (
                      <div className="event-row admin-event-row" key={attempt.id}>
                        <div className="admin-event-main">
                          <div className="admin-event-title-row">
                            <strong>
                              {attempt.targetType.replaceAll("_", " ")} replay
                            </strong>
                            <span className={`status-dot ${mapStatusTone(attempt.status)}`}>
                              {attempt.status.replaceAll("_", " ")}
                            </span>
                          </div>
                          <span>
                            {attempt.source.replaceAll("_", " ")}
                            {attempt.force ? " - forced" : " - safe"}
                            {attempt.reason ? ` - ${attempt.reason.replaceAll("_", " ")}` : ""}
                          </span>
                          <p>
                            corr {attempt.correlationId}
                            {attempt.durationMs !== null ? ` - ${attempt.durationMs}ms` : ""}
                            {attempt.errorMessage ? ` - ${attempt.errorMessage}` : ""}
                          </p>
                        </div>
                        <div className="admin-event-meta">
                          <strong>{formatTimestamp(attempt.completedAt ?? attempt.startedAt)}</strong>
                          <span>{attempt.targetId}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="admin-nested-card incident-span-2">
                <div className="section-heading compact-heading">
                  <div>
                    <p className="eyebrow">Payloads</p>
                    <h3>Raw receipt and outbox JSON</h3>
                  </div>
                </div>
                <div className="json-grid">
                  <div>
                    <strong className="json-heading">Receipt payload</strong>
                    <pre className="json-preview">{renderJson(debugView.selectedIncident.receipt.payloadJson)}</pre>
                  </div>
                  {debugView.selectedIncident.outboxEvents.map((event) => (
                    <div key={event.id}>
                      <strong className="json-heading">{event.eventName}</strong>
                      <pre className="json-preview">{renderJson(event.payloadJson)}</pre>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SurfaceCard>
        ) : (
          <SurfaceCard
            description="Select a receipt from the table above to inspect the correlated incident detail."
            eyebrow="Incident"
            title="No selected incident"
            wide
          >
            <div className="empty-state compact-empty">
              <FileWarning size={28} />
              <h2>No incident selected</h2>
              <p>Pick a receipt from Recent receipts to inspect related records and replay options.</p>
            </div>
          </SurfaceCard>
        )}
      </section>
    );
}
