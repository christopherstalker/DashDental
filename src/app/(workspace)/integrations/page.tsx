export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Database,
  Globe2,
  MessageCircle,
  PhoneCall,
  Plug,
  Send,
  ShieldCheck,
} from "lucide-react";
import { canAccess, formatProvider } from "@/domain/business-rules";
import type { Integration, IntegrationStatus, Provider } from "@/domain/types";
import { PageHeader } from "@/features/design-system/components/page-header";
import { MetricTile } from "@/features/design-system/components/metric-tile";
import { SurfaceCard } from "@/features/design-system/components/surface-card";
import { LocalizedText } from "@/features/i18n/components/localized-text";
import type { TranslationKey } from "@/features/i18n/translations";
import { getWorkspaceShellBootstrap } from "@/features/app-shell/data/workspace-bootstrap";
import { IntegrationConnectionPanel } from "@/features/integrations/components/integration-connection-panel";
import { getMessagingSetupGuide, getWebFormSetupGuide } from "@/server/integration-onboarding";

type ProviderSlot = {
  provider: Provider;
  title: string;
  titleKey: TranslationKey;
  description: string;
  descriptionKey: TranslationKey;
  category: string;
  categoryKey: TranslationKey;
  cta: string;
  ctaKey: TranslationKey;
};

const providerSlots: ProviderSlot[] = [
  {
    provider: "telegram",
    title: "Telegram bot",
    titleKey: "integrations.provider.telegram.title",
    description: "Guided channel for validating inbound messages and reply flow.",
    descriptionKey: "integrations.provider.telegram.description",
    category: "Messaging",
    categoryKey: "integrations.common.messaging",
    cta: "Create bot in BotFather",
    ctaKey: "integrations.provider.telegram.cta",
  },
  {
    provider: "whatsapp",
    title: "WhatsApp Cloud API",
    titleKey: "integrations.provider.whatsapp.title",
    description: "Patient messaging through Meta Cloud API after approval and webhook setup.",
    descriptionKey: "integrations.provider.whatsapp.description",
    category: "Messaging",
    categoryKey: "integrations.common.messaging",
    cta: "Prepare Meta app",
    ctaKey: "integrations.provider.whatsapp.cta",
  },
  {
    provider: "instagram",
    title: "Instagram DMs",
    titleKey: "integrations.provider.instagram.title",
    description: "Capture high-intent DMs from the clinic profile and keep them in one inbox.",
    descriptionKey: "integrations.provider.instagram.description",
    category: "Social",
    categoryKey: "integrations.common.social",
    cta: "Connect business page",
    ctaKey: "integrations.provider.instagram.cta",
  },
  {
    provider: "phone",
    title: "Missed calls",
    titleKey: "integrations.provider.phone.title",
    description: "Capture missed calls as urgent inbox threads and send instant SMS follow-up.",
    descriptionKey: "integrations.provider.phone.description",
    category: "Phone",
    categoryKey: "integrations.common.phone",
    cta: "Connect Twilio",
    ctaKey: "integrations.provider.phone.cta",
  },
  {
    provider: "web_form",
    title: "Website form",
    titleKey: "integrations.provider.webForm.title",
    description: "Receive website leads through a signed webhook endpoint.",
    descriptionKey: "integrations.provider.webForm.description",
    category: "Website",
    categoryKey: "integrations.common.website",
    cta: "Copy endpoint",
    ctaKey: "integrations.provider.webForm.cta",
  },
  {
    provider: "clinic_database",
    title: "Clinic DB read-only sync",
    titleKey: "integrations.provider.clinicDb.title",
    description: "Optional read-only sync for patient context, appointments, and compliance evidence.",
    descriptionKey: "integrations.provider.clinicDb.description",
    category: "Data",
    categoryKey: "integrations.common.data",
    cta: "Approve contract",
    ctaKey: "integrations.provider.clinicDb.cta",
  },
];

function getProviderIcon(provider: Provider) {
  switch (provider) {
    case "telegram":
      return Send;
    case "whatsapp":
      return MessageCircle;
    case "instagram":
      return Camera;
    case "phone":
      return PhoneCall;
    case "web_form":
      return Globe2;
    case "clinic_database":
      return Database;
  }
}

function getStatusCopyKey(status: IntegrationStatus | "not_created"): TranslationKey {
  switch (status) {
    case "active":
      return "integrations.status.live";
    case "pending":
      return "integrations.status.needsSetup";
    case "degraded":
      return "integrations.status.needsAttention";
    case "disconnected":
      return "integrations.status.disconnected";
    case "not_created":
      return "integrations.status.available";
  }
}

function getStatusTone(status: IntegrationStatus | "not_created") {
  if (status === "active") {
    return "active";
  }

  if (status === "degraded" || status === "disconnected") {
    return "degraded";
  }

  return "pending";
}

function integrationFor(
  integrations: Integration[],
  provider: Provider,
): Integration | undefined {
  return integrations.find((integration) => integration.provider === provider);
}

function getIntegrationErrorKey(errorState: string): TranslationKey | undefined {
  if (errorState === "Add credentials to activate this channel.") {
    return "integrations.error.addCredentials";
  }

  if (errorState === "Add a clinic database connection before the first sync.") {
    return "integrations.error.addClinicDb";
  }

  return undefined;
}

export default async function IntegrationsPage() {
  const bootstrap = await getWorkspaceShellBootstrap("admin");
  const hasAccess = bootstrap.session ? canAccess("admin", bootstrap.session.role) : false;

  if (!hasAccess) {
    return <IntegrationsAccessRequired />;
  }

  const organization = bootstrap.organization;
  const integrations = bootstrap.state.integrations.filter(
    (integration) => integration.organizationId === organization.id,
  );
  const activeIntegrations = integrations.filter(
    (integration) => integration.status === "active",
  );
  const pendingSlots = providerSlots.filter((slot) => {
    const integration = integrationFor(integrations, slot.provider);
    return integration?.status !== "active";
  });
  const failedEvents = bootstrap.state.integrationEvents.filter(
    (event) => event.status === "failed" || event.status === "dead_letter",
  ).length;
  const appUrl = process.env.APP_URL?.replace(/\/$/, "") ?? "https://dashdental.space";
  const messagingGuides = (["telegram", "whatsapp", "instagram"] as const).map((provider) =>
    getMessagingSetupGuide(appUrl, organization.id, provider),
  );
  const webFormGuide = getWebFormSetupGuide(appUrl, organization.id);
  const clinicDbContract = bootstrap.state.dataAccessContracts.find(
    (contract) =>
      contract.organizationId === organization.id &&
      contract.provider === "clinic_database",
  );
  const clinicDbIntegration = integrationFor(integrations, "clinic_database");

  return (
    <section className="view-grid integrations-grid">
      <PageHeader
        actions={
          <div className="notice">
            <ShieldCheck size={16} />
            <span>
              {bootstrap.billing.hasWorkspaceAccess
                ? <LocalizedText k="integrations.notice.unlocked" />
                : <LocalizedText k="integrations.notice.locked" />}
            </span>
          </div>
        }
        description={<LocalizedText k="integrations.header.description" />}
        eyebrow={<LocalizedText k="integrations.header.eyebrow" />}
        title={<LocalizedText k="integrations.header.title" />}
      />

      <section className="dashboard-command">
        <div>
          <p className="eyebrow">
            <LocalizedText k="integrations.command.kicker" />
          </p>
          <strong>
            <LocalizedText k="integrations.command.title" />
          </strong>
          <p className="blueprint-copy">
            <LocalizedText k="integrations.command.copy" />
          </p>
        </div>
        <div className="dashboard-command-actions">
          <Link className="primary-button" href="/billing">
            <LocalizedText k="integrations.action.openBilling" />
          </Link>
          <Link className="secondary-button" href="/setup">
            <LocalizedText k="integrations.action.launchChecklist" />
          </Link>
        </div>
      </section>

      <div className="metrics-row">
        <MetricTile
          icon={Plug}
          label={<LocalizedText k="integrations.metric.available" />}
          subtitle={<LocalizedText k="integrations.metric.availableSub" />}
          value={providerSlots.length}
        />
        <MetricTile
          icon={CheckCircle2}
          label={<LocalizedText k="integrations.metric.live" />}
          subtitle={<LocalizedText k="integrations.metric.liveSub" />}
          value={activeIntegrations.length}
        />
        <MetricTile
          icon={AlertTriangle}
          label={<LocalizedText k="integrations.metric.needSetup" />}
          subtitle={<LocalizedText k="integrations.metric.needSetupSub" />}
          tone={pendingSlots.length > 0 ? "warning" : "neutral"}
          value={pendingSlots.length}
        />
        <MetricTile
          icon={ShieldCheck}
          label={<LocalizedText k="integrations.metric.failed" />}
          subtitle={<LocalizedText k="integrations.metric.failedSub" />}
          tone={failedEvents > 0 ? "danger" : "neutral"}
          value={failedEvents}
        />
      </div>

      <SurfaceCard
        description={<LocalizedText k="integrations.inventory.description" />}
        eyebrow={<LocalizedText k="integrations.inventory.eyebrow" />}
        title={<LocalizedText k="integrations.inventory.title" />}
        wide
      >
        <div className="integration-card-grid">
          {providerSlots.map((slot) => {
            const integration = integrationFor(integrations, slot.provider);
            const status = integration?.status ?? "not_created";
            const Icon = getProviderIcon(slot.provider);

            return (
              <article className="provider-connection-card" key={slot.provider}>
                <div className="provider-connection-head">
                  <div className="provider-icon-badge">
                    <Icon size={18} />
                  </div>
                  <span className={`status-dot ${getStatusTone(status)}`}>
                    <LocalizedText k={getStatusCopyKey(status)} />
                  </span>
                </div>
                <div>
                  <p className="eyebrow">
                    <LocalizedText fallback={slot.category} k={slot.categoryKey} />
                  </p>
                  <h3><LocalizedText fallback={slot.title} k={slot.titleKey} /></h3>
                  <p><LocalizedText fallback={slot.description} k={slot.descriptionKey} /></p>
                </div>
                <div className="provider-connection-meta">
                  <span><LocalizedText k="integrations.meta.provider" /></span>
                  <strong>{formatProvider(slot.provider)}</strong>
                </div>
                <div className="provider-connection-meta">
                  <span><LocalizedText k="integrations.meta.health" /></span>
                  <strong>{integration ? `${integration.healthScore}%` : "0%"}</strong>
                </div>
                {integration?.errorState ? (
                  <p className="provider-error-copy">
                    {getIntegrationErrorKey(integration.errorState) ? (
                      <LocalizedText k={getIntegrationErrorKey(integration.errorState)!} />
                    ) : (
                      integration.errorState
                    )}
                  </p>
                ) : null}
                <span className="secondary-button compact-button">
                  <LocalizedText fallback={slot.cta} k={slot.ctaKey} />
                </span>
              </article>
            );
          })}
        </div>
      </SurfaceCard>

      <SurfaceCard
        description={<LocalizedText k="integrations.webhook.description" />}
        eyebrow={<LocalizedText k="integrations.webhook.eyebrow" />}
        title={<LocalizedText k="integrations.webhook.title" />}
        wide
      >
        <div className="provider-setup-list">
          {messagingGuides.map((guide) => (
            <div className="provider-setup-guide" key={guide.provider}>
              <div className="provider-setup-head">
                <div>
                  <p className="eyebrow">{formatProvider(guide.provider)}</p>
                  <h3>{guide.portalLabel}</h3>
                </div>
                <a className="docs-link" href={guide.docsUrl} rel="noreferrer" target="_blank">
                  <LocalizedText k="common.action.docs" />
                </a>
              </div>
              <div className="copyable-value">
                <div>
                  <span><LocalizedText k="integrations.webhook.callback" /></span>
                  <code>{guide.callbackUrl}</code>
                </div>
              </div>
              <div className="copyable-value">
                <div>
                  <span><LocalizedText k="integrations.webhook.verify" /></span>
                  <code>{guide.verifyToken}</code>
                </div>
              </div>
              <div className="event-list">
                {guide.steps.map((step) => (
                  <div className="event-row" key={step}>
                    <strong>{step}</strong>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SurfaceCard>

      <SurfaceCard
        description={<LocalizedText k="integrations.selfServe.description" />}
        eyebrow={<LocalizedText k="integrations.selfServe.eyebrow" />}
        title={<LocalizedText k="integrations.selfServe.title" />}
        wide
      >
        <IntegrationConnectionPanel
          clinicDbConfigured={Boolean(clinicDbIntegration?.encryptedCredentials)}
          clinicDbContractApproved={clinicDbContract?.status === "approved"}
          integrations={integrations}
          messagingGuides={messagingGuides}
          organizationId={organization.id}
          webFormGuide={webFormGuide}
        />
      </SurfaceCard>

      <SurfaceCard
        description={<LocalizedText k="integrations.webForm.description" />}
        eyebrow={<LocalizedText k="integrations.webForm.eyebrow" />}
        title={<LocalizedText k="integrations.webForm.title" />}
      >
        <div className="copyable-value">
          <div>
            <span><LocalizedText k="integrations.webForm.post" /></span>
            <code>{appUrl}/api/v1/webhooks/web-form</code>
          </div>
        </div>
        <div className="event-list">
          <div className="event-row">
            <strong><LocalizedText k="integrations.webForm.payload" /></strong>
            <span>organizationId, eventId, name, phone, email, message</span>
          </div>
          <div className="event-row">
            <strong><LocalizedText k="integrations.webForm.activation" /></strong>
            <span><LocalizedText k="integrations.webForm.activationCopy" /></span>
          </div>
          <div className="event-row">
            <strong><LocalizedText k="integrations.webForm.requiredHeader" /></strong>
            <span>x-webhook-secret: {webFormGuide.webhookSecret}</span>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard
        description={<LocalizedText k="integrations.clinicDb.description" />}
        eyebrow={<LocalizedText k="integrations.clinicDb.eyebrow" />}
        title={<LocalizedText k="integrations.clinicDb.title" />}
      >
        <div className="connection-checks">
          <div className="connection-check warn">
            <AlertTriangle size={16} />
            <span><LocalizedText k="integrations.clinicDb.approveBeforeSync" /></span>
          </div>
          <div className="connection-check warn">
            <AlertTriangle size={16} />
            <span><LocalizedText k="integrations.clinicDb.readOnly" /></span>
          </div>
        </div>
      </SurfaceCard>
    </section>
  );
}

function IntegrationsAccessRequired() {
  return (
    <section className="view-grid">
      <PageHeader
        description={<LocalizedText k="integrations.access.description" />}
        eyebrow={<LocalizedText k="integrations.header.eyebrow" />}
        title={<LocalizedText k="integrations.access.title" />}
      />
      <section className="empty-state">
        <ShieldCheck size={34} />
        <h2><LocalizedText k="integrations.access.requires" /></h2>
        <p>
          <LocalizedText k="integrations.access.body" />
        </p>
        <Link className="primary-button" href="/login">
          <LocalizedText k="dashboard.access.goLogin" />
        </Link>
      </section>
    </section>
  );
}

