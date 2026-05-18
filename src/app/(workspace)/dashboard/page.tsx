export const dynamic = "force-dynamic";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import {
  canAccess,
  formatCurrency,
  formatProvider,
  getLeadRiskLevel,
  minutesBetween,
} from "@/domain/business-rules";
import type { Lead, Provider } from "@/domain/types";
import { getWorkspaceShellBootstrap } from "@/features/app-shell/data/workspace-bootstrap";
import {
  DashboardScreen,
  type DashboardActivityRow,
  type DashboardChannelRow,
  type DashboardMetric,
  type DashboardQueueRow,
} from "@/features/dashboard/components/dashboard-screen";
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

  const dashboardMetrics: DashboardMetric[] = [
    {
      detail: "Estimated treatment opportunity that still needs staff action.",
      label: "Revenue at risk",
      tone: "risk",
      value: formatCurrency(recoverableRevenue, organization),
    },
    {
      detail: "Patients waiting for a first human reply.",
      label: "Unanswered patients",
      tone: "warning",
      value: String(bootstrap.overview.unanswered),
    },
    {
      detail: "Measured from inbound message to first staff response.",
      label: "Avg first response",
      tone: "default",
      value: `${bootstrap.overview.averageResponseMinutes}m`,
    },
    {
      detail: "Marked booked in the current visible workspace data.",
      label: "Booked patients",
      tone: "success",
      value: String(bookedLeads.length),
    },
    {
      detail: "Configured channels with current workspace visibility.",
      label: "Active channels",
      tone: "active",
      value: String(activeIntegrations.length),
    },
  ];

  const dashboardQueueRows: DashboardQueueRow[] = triageLeads.slice(0, 6).map((item) => ({
    action: "Review the thread, confirm the safest callback path, and offer appointment options.",
    channel: providerDisplayName(item.lead.source),
    intent: recoveryIntentLabel(item.lead),
    patient: item.lead.name,
    risk: riskDisplayName(item.risk),
    value: formatCurrency(item.lead.estimatedValue, organization),
    waiting: formatWaiting(item.waitingMinutes),
  }));
  const dashboardChannels: DashboardChannelRow[] = ([
    "whatsapp",
    "instagram",
    "telegram",
    "web_form",
  ] as Provider[]).map((provider) => {
    const integration = bootstrap.state.integrations.find(
      (item) => item.organizationId === organization.id && item.provider === provider,
    );
    const events = bootstrap.state.integrationEvents
      .filter((event) => event.provider === provider)
      .toSorted(
        (left, right) =>
          Date.parse(right.processedAt ?? right.createdAt) -
          Date.parse(left.processedAt ?? left.createdAt),
      );
    const messages = bootstrap.state.conversations.filter(
      (conversation) => conversation.provider === provider,
    ).length;
    const hasProcessed = events.some((event) => event.status === "processed");

    return {
      detail:
        integration?.errorState ??
        (hasProcessed
          ? "Inbound events are landing in the workspace."
          : "No inbound event has been seen yet."),
      label: formatProvider(provider),
      lastEvent: events[0]
        ? formatActivityTime(events[0].processedAt ?? events[0].createdAt)
        : "No event",
      state: !integration
        ? "setup"
        : integration.status === "degraded"
          ? "degraded"
          : integration.status === "disconnected"
            ? "disconnected"
            : integration.status === "active" && hasProcessed
              ? "receiving"
              : integration.status === "active"
                ? "configured"
                : "setup",
      volume: `${messages} thread${messages === 1 ? "" : "s"}`,
    };
  });
  const dashboardActivities: DashboardActivityRow[] = [
    ...bootstrap.state.messages
      .toSorted((left, right) => Date.parse(right.sentAt) - Date.parse(left.sentAt))
      .slice(0, 3)
      .map((message) => ({
        label: message.direction === "inbound" ? "Inbound message" : "Reply queued",
        meta: `${message.text.slice(0, 82)}${message.text.length > 82 ? "..." : ""}`,
        tone: message.direction === "inbound" ? "warning" : "active",
      }) satisfies DashboardActivityRow),
    ...bootstrap.state.integrationEvents.slice(0, 2).map((event) => ({
      label: `${formatProvider(event.provider)} event ${event.status}`,
      meta: event.errorMessage ?? formatActivityTime(event.processedAt ?? event.createdAt),
      tone: event.status === "failed" ? "risk" : "default",
    }) satisfies DashboardActivityRow),
  ].slice(0, 5);
  const topQueue = dashboardQueueRows[0];

  return (
    <DashboardScreen
      activities={dashboardActivities}
      aiRecommendation={{
        title: topQueue
          ? `Reply to ${topQueue.patient} first`
          : "Connect a channel to start recovery",
        body: topQueue
          ? `${topQueue.patient} is waiting through ${topQueue.channel}. Offer two appointment windows, confirm callback details, and keep clinical guidance out of the draft.`
          : "No urgent patient thread is visible yet. Activate the website form or a messaging channel, then send a test lead to validate inbox materialization.",
      }}
      channels={dashboardChannels}
      clinicName={organization.name}
      metrics={dashboardMetrics}
      queue={dashboardQueueRows}
      role={bootstrap.session?.role ?? "manager"}
      summary={{
        atRisk: bootstrap.overview.atRisk,
        revenueAtRisk: formatCurrency(recoverableRevenue, organization),
        waiting: bootstrap.overview.unanswered + bootstrap.overview.atRisk,
      }}
      userName={firstName}
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

function formatActivityTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
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

