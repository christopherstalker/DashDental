export const dynamic = "force-dynamic";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Plug,
  ShieldCheck,
  Target,
  UserPlus,
} from "lucide-react";
import {
  canAccess,
  formatCurrency,
  getPlanCatalog,
  isSubscriptionAccessActive,
} from "@/domain/business-rules";
import type { Provider } from "@/domain/types";
import { MetricTile } from "@/features/design-system/components/metric-tile";
import { PageHeader } from "@/features/design-system/components/page-header";
import { SurfaceCard } from "@/features/design-system/components/surface-card";
import { getWorkspaceShellBootstrap } from "@/features/app-shell/data/workspace-bootstrap";
import { GuidedOnboardingWizard } from "@/features/onboarding/components/guided-onboarding-wizard";
import { LocalizedText } from "@/features/i18n/components/localized-text";
import { LaunchPageEvent } from "@/features/launch-analytics/components/launch-event-tracker";
import { buildSetupLaunchReview } from "@/server/launch-analytics";

type LaunchStepStatus = "complete" | "pending";

interface LaunchStep {
  id: string;
  title: ReactNode;
  detail: ReactNode;
  owner: ReactNode;
  href: string;
  status: LaunchStepStatus;
}

export default async function SetupPage() {
  const bootstrap = await getWorkspaceShellBootstrap("admin");
  const hasAccess = bootstrap.session ? canAccess("admin", bootstrap.session.role) : false;

  if (!hasAccess) {
    return <SetupAccessRequired />;
  }

  const organization = bootstrap.organization;
  const integrations = bootstrap.state.integrations.filter(
    (integration) => integration.organizationId === organization.id,
  );
  const activeIntegrations = integrations.filter(
    (integration) => integration.status === "active",
  );
  const memberships = bootstrap.state.memberships.filter(
    (membership) => membership.organizationId === organization.id,
  );
  const activeMemberships = memberships.filter((membership) => membership.status === "active");
  const contract = bootstrap.state.dataAccessContracts.find(
    (item) => item.organizationId === organization.id && item.provider === "clinic_database",
  );
  const clinicDb = integrations.find((integration) => integration.provider === "clinic_database");
  const subscription = bootstrap.state.subscriptions.find(
    (item) => item.organizationId === organization.id,
  );
  const usage = bootstrap.state.usageLimits.find(
    (item) => item.organizationId === organization.id,
  );
  const liveLeadCount = bootstrap.state.leads.filter(
    (lead) => lead.organizationId === organization.id,
  ).length;
  const launchSteps = buildLaunchSteps({
    activeIntegrations: activeIntegrations.map((integration) => integration.provider),
    activeMembers: activeMemberships.length,
    clinicDbConfigured: Boolean(clinicDb?.encryptedCredentials),
    contractApproved: contract?.status === "approved",
    hasSession: Boolean(bootstrap.session),
    liveLeadCount,
    organizationValue: organization.averagePatientValue,
    subscriptionReady: isSubscriptionAccessActive(subscription, new Date().toISOString()),
  });
  const completed = launchSteps.filter((step) => step.status === "complete").length;
  const progress = Math.round((completed / launchSteps.length) * 100);
  const nextStep = launchSteps.find((step) => step.status === "pending");
  const planLabel = subscription ? getPlanCatalog(subscription.plan).label : "No plan";
  const launchReview = buildSetupLaunchReview({
    billingDaysRemaining: bootstrap.billing.daysRemaining,
    billingStatus: bootstrap.billing.status,
    completedGates: completed,
    nextStep: nextStep
      ? {
          href: nextStep.href,
          id: nextStep.id,
          title: launchStepPlainLabels[nextStep.id] ?? "next launch gate",
        }
      : undefined,
    totalGates: launchSteps.length,
  });

  return (
    <section className="view-grid setup-grid">
      <LaunchPageEvent
        billingStatus={bootstrap.billing.status}
        completedGates={completed}
        event="workspace.setup.viewed"
        onboardingStep={nextStep?.id ?? "daily-review"}
        page="/setup"
        role={bootstrap.session?.role}
        section="setup-page"
        setupProgress={progress}
        totalGates={launchSteps.length}
      />
      <PageHeader
        actions={
          <div className="notice">
            <ShieldCheck size={16} />
            <span>
              <LocalizedText k="setup.notice.launchReadiness" /> - {completed}/
              {launchSteps.length} <LocalizedText k="setup.notice.complete" />
            </span>
          </div>
        }
        description={<LocalizedText k="setup.header.description" />}
        eyebrow={<LocalizedText k="setup.header.eyebrow" />}
        title={<LocalizedText k="setup.header.title" />}
      />

      <GuidedOnboardingWizard
        clinicName={organization.name}
        timezone={organization.timezone}
      />

      <section className="dashboard-command">
        <div>
          <p className="eyebrow">
            <LocalizedText k="setup.next.eyebrow" />
          </p>
          <strong>
            {nextStep ? nextStep.title : <LocalizedText k="setup.next.ready" />}
          </strong>
          <p className="blueprint-copy">
            {nextStep ? (
              <>
                {nextStep.detail} <LocalizedText k="setup.next.owner" />{" "}
                {nextStep.owner}.
              </>
            ) : (
              <LocalizedText k="setup.next.allComplete" />
            )}
          </p>
        </div>
        <div className="dashboard-command-actions">
          <Link
            className="primary-button"
            data-launch-billing-status={bootstrap.billing.status}
            data-launch-completed-gates={completed}
            data-launch-event="workspace.setup.next_action_clicked"
            data-launch-onboarding-step={nextStep?.id ?? "daily-review"}
            data-launch-page="/setup"
            data-launch-role={bootstrap.session?.role}
            data-launch-section="setup-command"
            data-launch-setup-progress={progress}
            data-launch-target={nextStep?.href ?? "/dashboard"}
            data-launch-total-gates={launchSteps.length}
            href={nextStep?.href ?? "/dashboard"}
          >
            {nextStep ? (
              <LocalizedText k="setup.action.resolveBlocker" />
            ) : (
              <LocalizedText k="setup.action.openDashboard" />
            )}
            <ArrowRight size={16} />
          </Link>
          <Link
            className="secondary-button"
            data-launch-event="workspace.setup.channel_clicked"
            data-launch-onboarding-step="intake-channels"
            data-launch-page="/setup"
            data-launch-section="setup-command"
            data-launch-target="/integrations"
            href="/integrations"
          >
            <Plug size={16} />
            <LocalizedText k="setup.action.channels" />
          </Link>
        </div>
      </section>

      <SurfaceCard
        description="Use this as the owner review before inviting the front desk into daily use."
        eyebrow="Launch analytics"
        title="Launch drop-off review"
        wide
      >
        <div className="launch-review-grid">
          <div className={`launch-review-risk ${launchReview.riskLevel}`}>
            <span>Drop-off risk</span>
            <strong>{launchReview.riskLevel}</strong>
            <p>{launchReview.riskSummary}</p>
          </div>
          <div className="launch-review-action">
            <span>Next measurable action</span>
            <strong>{launchReview.nextAction}</strong>
            <p>
              {launchReview.stalledGates} launch gates remain. Trial or billing status is{" "}
              {bootstrap.billing.status.replaceAll("_", " ")} with{" "}
              {bootstrap.billing.daysRemaining} day
              {bootstrap.billing.daysRemaining === 1 ? "" : "s"} remaining.
            </p>
          </div>
          <Link
            className="secondary-button"
            data-launch-billing-status={bootstrap.billing.status}
            data-launch-completed-gates={completed}
            data-launch-event="workspace.setup.next_action_clicked"
            data-launch-onboarding-step={nextStep?.id ?? "daily-review"}
            data-launch-page="/setup"
            data-launch-role={bootstrap.session?.role}
            data-launch-section="launch-review"
            data-launch-setup-progress={progress}
            data-launch-target={launchReview.nextHref}
            data-launch-total-gates={launchSteps.length}
            href={launchReview.nextHref}
          >
            Open next action
            <ArrowRight size={16} />
          </Link>
        </div>
      </SurfaceCard>

      <div className="metrics-row">
        <MetricTile
          icon={Target}
          label={<LocalizedText k="setup.metric.readiness" />}
          subtitle={
            <>
              {completed}/{launchSteps.length}{" "}
              <LocalizedText k="setup.metric.gatesComplete" />
            </>
          }
          tone={progress < 70 ? "warning" : "neutral"}
          value={`${progress}%`}
        />
        <MetricTile
          icon={Plug}
          label={<LocalizedText k="setup.metric.liveChannels" />}
          subtitle={<LocalizedText k="setup.metric.liveChannelsSub" />}
          tone={activeIntegrations.length === 0 ? "warning" : "neutral"}
          value={activeIntegrations.length}
        />
        <MetricTile
          icon={UserPlus}
          label={<LocalizedText k="setup.metric.activeSeats" />}
          subtitle={
            usage ? (
              <>
                {usage.maxUsers} <LocalizedText k="setup.metric.includedInPlan" />
              </>
            ) : (
              <LocalizedText k="setup.metric.planLimitPending" />
            )
          }
          value={activeMemberships.length}
        />
        <MetricTile
          icon={ClipboardCheck}
          label={<LocalizedText k="setup.metric.billing" />}
          subtitle={subscription?.status ?? <LocalizedText k="common.status.notConfigured" />}
          tone={subscription?.status === "past_due" ? "danger" : "neutral"}
          value={planLabel}
        />
      </div>

      <section className="radar-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              <LocalizedText k="setup.score.eyebrow" />
            </p>
            <h2>{organization.name}</h2>
            <p className="blueprint-copy">
              <LocalizedText k="setup.score.averageValue" />{" "}
              {formatCurrency(organization.averagePatientValue, organization)}.{" "}
              <LocalizedText k="setup.score.proveValue" />
            </p>
          </div>
          <span className="count-pill">{progress}%</span>
        </div>
        <div className="usage-track setup-progress">
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="compact-alert-grid setup-readiness-grid">
          <ReadinessCard
            label={<LocalizedText k="setup.readiness.access" />}
            status={bootstrap.session ? "complete" : "pending"}
            value={bootstrap.session?.user.name ?? <LocalizedText k="setup.readiness.noSession" />}
          />
          <ReadinessCard
            label={<LocalizedText k="setup.readiness.dataApproval" />}
            status={contract?.status === "approved" ? "complete" : "pending"}
            value={contract?.status.replaceAll("_", " ") ?? <LocalizedText k="setup.readiness.draft" />}
          />
          <ReadinessCard
            label={<LocalizedText k="setup.readiness.firstLead" />}
            status={liveLeadCount > 0 ? "complete" : "pending"}
            value={
              <>
                {liveLeadCount} <LocalizedText k="setup.readiness.captured" />
              </>
            }
          />
        </div>
      </section>

      <SurfaceCard
        description={<LocalizedText k="setup.checklist.description" />}
        eyebrow={<LocalizedText k="setup.checklist.eyebrow" />}
        title={<LocalizedText k="setup.checklist.title" />}
        wide
      >
        <div className="setup-step-list">
          {launchSteps.map((step, index) => (
            <div className={`setup-step ${step.status}`} key={step.id}>
              <div className="step-index">{index + 1}</div>
              <div>
                <strong>{step.title}</strong>
                <p>{step.detail}</p>
              </div>
              <span className={`status-dot ${step.status === "complete" ? "active" : "pending"}`}>
                <LocalizedText
                  k={step.status === "complete" ? "common.status.complete" : "common.status.pending"}
                />
              </span>
              <Link className="secondary-button" href={step.href}>
                <LocalizedText k="common.action.open" />
              </Link>
            </div>
          ))}
        </div>
      </SurfaceCard>

      <SurfaceCard
        description={<LocalizedText k="setup.channel.description" />}
        eyebrow={<LocalizedText k="setup.channel.eyebrow" />}
        title={<LocalizedText k="setup.channel.title" />}
      >
        <div className="connection-checks">
          <ConnectionCheck
            label={<LocalizedText k="setup.check.telegram" />}
            ok={isProviderActive(activeIntegrations, "telegram")}
          />
          <ConnectionCheck
            label={<LocalizedText k="setup.check.webForm" />}
            ok={isProviderActive(activeIntegrations, "web_form")}
          />
          <ConnectionCheck
            label={<LocalizedText k="setup.check.clinicDbApproved" />}
            ok={contract?.status === "approved"}
          />
          <ConnectionCheck
            label={<LocalizedText k="setup.check.clinicDbCredentials" />}
            ok={Boolean(clinicDb?.encryptedCredentials)}
          />
        </div>
      </SurfaceCard>

      <SurfaceCard
        description={<LocalizedText k="setup.playbook.description" />}
        eyebrow={<LocalizedText k="setup.playbook.eyebrow" />}
        title={<LocalizedText k="setup.playbook.title" />}
      >
        <div className="event-list">
          <div className="event-row">
            <strong>
              <LocalizedText k="setup.playbook.testTitle" />
            </strong>
            <span>
              <LocalizedText k="setup.playbook.testCopy" />
            </span>
          </div>
          <div className="event-row">
            <strong>
              <LocalizedText k="setup.playbook.ownerTitle" />
            </strong>
            <span>
              <LocalizedText k="setup.playbook.ownerCopy" />
            </span>
          </div>
          <div className="event-row">
            <strong>
              <LocalizedText k="setup.playbook.billingTitle" />
            </strong>
            <span>
              <LocalizedText k="setup.playbook.billingCopy" />
            </span>
          </div>
        </div>
      </SurfaceCard>
    </section>
  );
}

const launchStepPlainLabels: Record<string, string> = {
  billing: "billing activation",
  "clinic-db": "clinic database setup",
  "clinic-profile": "clinic profile",
  "data-contract": "data approval",
  "first-lead": "first live lead",
  "intake-channels": "intake channels",
  "team-access": "team access",
  "workspace-access": "workspace access",
};

function SetupAccessRequired() {
  return (
    <section className="view-grid">
      <PageHeader
        description={<LocalizedText k="setup.access.description" />}
        eyebrow={<LocalizedText k="setup.header.eyebrow" />}
        title={<LocalizedText k="setup.access.title" />}
      />
      <section className="empty-state">
        <ShieldCheck size={34} />
        <h2>
          <LocalizedText k="setup.access.requires" />
        </h2>
        <p>
          <LocalizedText k="setup.access.body" />
        </p>
        <Link className="primary-button" href="/">
          <LocalizedText k="dashboard.access.goLogin" />
        </Link>
      </section>
    </section>
  );
}

function ReadinessCard({
  label,
  status,
  value,
}: {
  label: ReactNode;
  status: LaunchStepStatus;
  value: ReactNode;
}) {
  return (
    <div className={`compact-alert ${status === "complete" ? "info" : "warning"}`}>
      <strong>{label}</strong>
      <span>{value}</span>
    </div>
  );
}

function ConnectionCheck({ label, ok }: { label: ReactNode; ok: boolean }) {
  return (
    <div className={`connection-check ${ok ? "ok" : "warn"}`}>
      {ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
      <span>{label}</span>
    </div>
  );
}

function isProviderActive(activeProviders: Array<{ provider: Provider }>, provider: Provider) {
  return activeProviders.some((integration) => integration.provider === provider);
}

function buildLaunchSteps(input: {
  activeIntegrations: Provider[];
  activeMembers: number;
  clinicDbConfigured: boolean;
  contractApproved: boolean;
  hasSession: boolean;
  liveLeadCount: number;
  organizationValue: number;
  subscriptionReady: boolean;
}): LaunchStep[] {
  return [
    {
      id: "workspace-access",
      title: <LocalizedText k="setup.step.workspace.title" />,
      detail: <LocalizedText k="setup.step.workspace.detail" />,
      href: "/dashboard",
      owner: <LocalizedText k="setup.step.owner.clinic" />,
      status: input.hasSession ? "complete" : "pending",
    },
    {
      id: "clinic-profile",
      title: <LocalizedText k="setup.step.profile.title" />,
      detail: (
        <>
          <LocalizedText k="setup.step.profile.prefix" />{" "}
          {input.organizationValue.toLocaleString("en-US")}{" "}
          <LocalizedText k="setup.step.profile.suffix" />
        </>
      ),
      href: "/dashboard",
      owner: <LocalizedText k="setup.step.owner.implementation" />,
      status: input.organizationValue > 0 ? "complete" : "pending",
    },
    {
      id: "team-access",
      title: <LocalizedText k="setup.step.team.title" />,
      detail: (
        <>
          {input.activeMembers} <LocalizedText k="setup.step.team.prefix" />
        </>
      ),
      href: "/setup",
      owner: <LocalizedText k="setup.step.owner.admin" />,
      status: input.activeMembers >= 1 ? "complete" : "pending",
    },
    {
      id: "intake-channels",
      title: <LocalizedText k="setup.step.channels.title" />,
      detail: (
        <>
          {input.activeIntegrations.length}{" "}
          <LocalizedText k="setup.step.channels.prefix" />
        </>
      ),
      href: "/integrations",
      owner: <LocalizedText k="setup.step.owner.implementation" />,
      status: input.activeIntegrations.length > 0 ? "complete" : "pending",
    },
    {
      id: "data-contract",
      title: <LocalizedText k="setup.step.contract.title" />,
      detail: input.contractApproved ? (
        <LocalizedText k="setup.step.contract.approved" />
      ) : (
        <LocalizedText k="setup.step.contract.pending" />
      ),
      href: "/compliance",
      owner: <LocalizedText k="setup.step.owner.it" />,
      status: input.contractApproved ? "complete" : "pending",
    },
    {
      id: "clinic-db",
      title: <LocalizedText k="setup.step.clinicDb.title" />,
      detail: input.clinicDbConfigured ? (
        <LocalizedText k="setup.step.clinicDb.saved" />
      ) : (
        <LocalizedText k="setup.step.clinicDb.pending" />
      ),
      href: "/integrations",
      owner: <LocalizedText k="setup.step.owner.implementation" />,
      status: input.clinicDbConfigured ? "complete" : "pending",
    },
    {
      id: "billing",
      title: <LocalizedText k="setup.step.billing.title" />,
      detail: input.subscriptionReady ? (
        <LocalizedText k="setup.step.billing.ready" />
      ) : (
        <LocalizedText k="setup.step.billing.pending" />
      ),
      href: "/billing",
      owner: <LocalizedText k="setup.step.owner.clinic" />,
      status: input.subscriptionReady ? "complete" : "pending",
    },
    {
      id: "first-lead",
      title: <LocalizedText k="setup.step.firstLead.title" />,
      detail: (
        <>
          {input.liveLeadCount} <LocalizedText k="setup.step.firstLead.prefix" />
        </>
      ),
      href: "/inbox",
      owner: <LocalizedText k="setup.step.owner.frontDesk" />,
      status: input.liveLeadCount > 0 ? "complete" : "pending",
    },
  ];
}

