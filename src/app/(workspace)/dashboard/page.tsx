export const dynamic = "force-dynamic";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import {
  canAccess,
  formatCurrency,
  getLeadRiskLevel,
  minutesBetween,
} from "@/domain/business-rules";
import type { Lead, Provider } from "@/domain/types";
import { getWorkspaceShellBootstrap } from "@/features/app-shell/data/workspace-bootstrap";
import {
  RecoveryCockpit,
  type CockpitMetric,
  type CockpitQueueRow,
} from "@/features/dashboard/components/recovery-cockpit";
import { LocalizedText } from "@/features/i18n/components/localized-text";
const riskRank = {
  critical: 4,
  high: 3,
  watch: 2,
  clear: 1,
} as const;

export default async function DashboardPage() {
  const bootstrap = await getWorkspaceShellBootstrap("manager");
  const hasAccess = bootstrap.session ? canAccess("manager", bootstrap.session.role) : false;

  if (!hasAccess) {
    return <WorkspaceAccessRequired requiredRole="manager" />;
  }

  const nowIso = new Date().toISOString();
  const organization = bootstrap.organization;
  const leads = bootstrap.state.leads.filter(
    (lead) => lead.organizationId === organization.id,
  );
  const activeIntegrations = bootstrap.state.integrations.filter(
    (integration) =>
      integration.organizationId === organization.id && integration.status === "active",
  );

  const triageLeads = leads
    .map((lead) => {
      const risk = getLeadRiskLevel(lead, nowIso);

      return {
        lead,
        risk,
        waitingMinutes: minutesBetween(lead.firstMessageAt, nowIso),
      };
    })
    .filter(
      (item) =>
        item.risk !== "clear" &&
        item.lead.status !== "booked" &&
        item.lead.status !== "lost",
    )
    .toSorted(
      (left, right) =>
        riskRank[right.risk] - riskRank[left.risk] ||
        right.lead.estimatedValue - left.lead.estimatedValue ||
        right.waitingMinutes - left.waitingMinutes,
    );

  const recoverableRevenue = triageLeads.reduce(
    (sum, item) => sum + item.lead.estimatedValue,
    0,
  );
  const bookedLeads = leads
    .filter((lead) => lead.status === "booked")
    .toSorted(
      (left, right) =>
        new Date(right.bookedAt ?? right.updatedAt).getTime() -
        new Date(left.bookedAt ?? left.updatedAt).getTime(),
  );
  const firstName = bootstrap.session?.user.name.split(" ")[0] ?? "team";

  const dashboardMetrics: CockpitMetric[] = [
    {
      helperKey: "dashboard.metric.revenueAtRiskSub",
      labelKey: "dashboard.metric.revenueAtRisk",
      tone: "risk",
      value: formatCurrency(recoverableRevenue, organization),
    },
    {
      helperKey: "dashboard.metric.unansweredSub",
      labelKey: "dashboard.metric.unanswered",
      tone: "warning",
      value: String(bootstrap.overview.unanswered),
    },
    {
      helperKey: "dashboard.metric.avgResponseSub",
      labelKey: "dashboard.metric.avgResponse",
      tone: "default",
      value: `${bootstrap.overview.averageResponseMinutes}m`,
    },
    {
      helperKey: "dashboard.metric.recoveredSub",
      labelKey: "dashboard.metric.recovered",
      tone: "success",
      value: String(bookedLeads.length),
    },
    {
      helperKey: "dashboard.metric.activeChannelsSub",
      labelKey: "dashboard.metric.activeChannels",
      tone: "active",
      value: String(activeIntegrations.length),
    },
  ];

  const dashboardQueueRows: CockpitQueueRow[] = triageLeads.slice(0, 4).map((item) => ({
    action: "Review the thread, confirm the safest callback path, and offer appointment options.",
    channel: providerDisplayName(item.lead.source),
    draft:
      "Thanks for reaching out. Our front desk can help with booking options today. Can you confirm the best callback number and preferred time?",
    excerpt: "I would like to book a visit and understand the next available options.",
    initials: patientInitials(item.lead.name),
    intent: recoveryIntentLabel(item.lead),
    riskReason:
      item.risk === "critical"
        ? "High-priority patient message is outside the clinic response target."
        : "Unanswered patient intent is visible in the recovery queue before it goes cold.",
    status: item.risk === "critical" ? "Needs staff reply" : "AI draft ready",
    urgency: riskDisplayName(item.risk),
    value: formatCurrency(item.lead.estimatedValue, organization),
    waiting: formatWaiting(item.waitingMinutes),
  }));

  return (
    <RecoveryCockpit
      activeChannels={String(activeIntegrations.length)}
      ctaHref="/inbox"
      ctaLabelKey="dashboard.hero.openInbox"
      embedded
      embeddedContext={{
        atRisk: bootstrap.overview.atRisk,
        clinicName: organization.name,
        firstName,
        unanswered: bootstrap.overview.unanswered,
      }}
      metrics={dashboardMetrics}
      queueRows={dashboardQueueRows}
      userLabel={`${firstName} Â· ${bootstrap.session?.role ?? "manager"}`}
      workspaceName={organization.name}
    />
  );
}

function WorkspaceAccessRequired({ requiredRole }: { requiredRole: string }) {
  return (
    <section className="view-grid">
      <header className="topbar blueprint-topbar">
        <div>
          <p className="eyebrow">
            <LocalizedText k="workspace.sidebar.readiness" />
          </p>
          <h1>
            <LocalizedText k="dashboard.access.title" />
          </h1>
          <p className="blueprint-copy">
            <LocalizedText k="dashboard.access.copy" />
          </p>
        </div>
      </header>
      <section className="empty-state">
        <ShieldCheck size={34} />
        <h2>
          <LocalizedText k="dashboard.access.requires" /> {requiredRole}
        </h2>
        <p>
          <LocalizedText k="dashboard.access.body" />
        </p>
        <Link className="primary-button" href="/">
          <LocalizedText k="dashboard.access.goLogin" />
        </Link>
      </section>
    </section>
  );
}

function patientInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((chunk) => chunk[0]?.toUpperCase())
      .join("") || "PT"
  );
}

function providerDisplayName(provider: Provider) {
  const names: Record<Provider, string> = {
    clinic_database: "Clinic DB",
    instagram: "Instagram",
    telegram: "Telegram",
    web_form: "Website form",
    whatsapp: "WhatsApp",
  };

  return names[provider];
}

function recoveryIntentLabel(lead: Lead) {
  if (lead.estimatedValue >= 1200) return "Implant or cosmetic consult";
  if (lead.estimatedValue >= 400) return "Emergency or treatment inquiry";
  if (lead.source === "instagram") return "Cosmetic pricing";
  if (lead.source === "telegram") return "Follow-up inquiry";
  return "Patient booking request";
}

function riskDisplayName(risk: "clear" | "watch" | "high" | "critical") {
  const names = {
    clear: "Clear",
    critical: "High urgency",
    high: "High value",
    watch: "Medium",
  } as const;

  return names[risk];
}

function formatWaiting(waitingMinutes: number) {
  if (waitingMinutes < 60) return `${waitingMinutes}m waiting`;

  const hours = Math.floor(waitingMinutes / 60);
  const minutes = waitingMinutes % 60;

  return minutes ? `${hours}h ${minutes}m waiting` : `${hours}h waiting`;
}

