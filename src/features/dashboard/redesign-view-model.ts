import {
  formatCurrency,
  formatProvider,
  getLeadRiskLevel,
  minutesBetween,
} from "@/domain/business-rules";
import type { Lead, Provider } from "@/domain/types";
import type { WorkspaceShellBootstrap } from "@/features/app-shell/data/workspace-bootstrap";

export type DashboardRiskTone = "alert" | "info" | "ok" | "warm";

export interface DashboardOverviewMetric {
  delta: string;
  label: string;
  sparkline: string;
  tone: DashboardRiskTone;
  value: string;
}

export interface DashboardPriorityThread {
  assignedTo: string;
  channel: Provider;
  conversationId?: string;
  lastMessage: string;
  patientName: string;
  riskLabel: string;
  tone: DashboardRiskTone;
  value: string;
  waiting: string;
}

export interface DashboardChannelHealth {
  detail: string;
  healthScore: number;
  label: string;
  status: string;
  threadCount: number;
  tone: DashboardRiskTone;
}

export interface DashboardWorkflowCard {
  detail: string;
  label: string;
  tone: DashboardRiskTone;
  value: string;
}

export interface DashboardStaffLoad {
  assigned: number;
  initials: string;
  name: string;
  replied: number;
  slaMet: string;
}

export interface DashboardActivityItem {
  detail: string;
  label: string;
  tone: DashboardRiskTone;
  when: string;
}

export interface DashboardOverviewModel {
  activities: DashboardActivityItem[];
  channels: DashboardChannelHealth[];
  clinicName: string;
  digest: {
    recipient: string;
    status: string;
  };
  metrics: DashboardOverviewMetric[];
  priorityThreads: DashboardPriorityThread[];
  role: string;
  staffLoad: DashboardStaffLoad[];
  summary: {
    activeApiKeys: number;
    activeWebhooks: number;
    enabledFlags: number;
    openConversations: number;
    scheduledReminders: number;
    templates: number;
  };
  userName: string;
  workflow: DashboardWorkflowCard[];
}

const riskRank = {
  critical: 4,
  high: 3,
  watch: 2,
  clear: 1,
} as const;

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "DD"
  );
}

function percent(value: number, total: number): string {
  return total ? `${Math.round((value / total) * 100)}%` : "0%";
}

function formatWaiting(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function riskTone(risk: ReturnType<typeof getLeadRiskLevel>): DashboardRiskTone {
  if (risk === "critical") {
    return "alert";
  }

  if (risk === "high") {
    return "warm";
  }

  if (risk === "clear") {
    return "ok";
  }

  return "info";
}

function riskLabel(risk: ReturnType<typeof getLeadRiskLevel>): string {
  const labels = {
    clear: "Clear",
    critical: "SLA overdue",
    high: "SLA warning",
    watch: "Watching",
  } satisfies Record<ReturnType<typeof getLeadRiskLevel>, string>;

  return labels[risk];
}

function channelTone(status: string): DashboardRiskTone {
  if (status === "active") return "ok";
  if (status === "degraded" || status === "pending") return "warm";
  if (status === "disconnected") return "alert";
  return "info";
}

function patientMemoryCount(leads: Lead[]): number {
  const seen = new Map<string, number>();

  for (const lead of leads) {
    const key = lead.phone || lead.providerContactId || lead.name.trim().toLowerCase();
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }

  return Array.from(seen.values()).filter((count) => count > 1).length;
}

export function buildDashboardOverviewModel(
  bootstrap: WorkspaceShellBootstrap,
): DashboardOverviewModel {
  const organization = bootstrap.organization;
  const organizationId = organization.id;
  const nowIso = new Date().toISOString();
  const leads = bootstrap.state.leads.filter((lead) => lead.organizationId === organizationId);
  const conversations = bootstrap.state.conversations.filter(
    (conversation) => conversation.organizationId === organizationId,
  );
  const usersById = new Map(bootstrap.state.users.map((user) => [user.id, user]));
  const conversationByLeadId = new Map(conversations.map((conversation) => [conversation.leadId, conversation]));
  const messagesByConversation = new Map(
    conversations.map((conversation) => [
      conversation.id,
      bootstrap.state.messages
        .filter((message) => message.conversationId === conversation.id)
        .toSorted(
          (left, right) =>
            new Date(left.sentAt).getTime() - new Date(right.sentAt).getTime(),
        ),
    ]),
  );
  const responseTimes = leads
    .filter((lead) => lead.firstHumanResponseAt)
    .map((lead) => minutesBetween(lead.firstMessageAt, lead.firstHumanResponseAt ?? lead.firstMessageAt));
  const avgResponse = responseTimes.length
    ? Math.round(responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length)
    : 0;
  const replied = leads.filter((lead) => Boolean(lead.firstHumanResponseAt)).length;
  const booked = leads.filter((lead) => lead.status === "booked").length;
  const triage = leads
    .map((lead) => {
      const risk = getLeadRiskLevel(lead, nowIso);
      return {
        lead,
        risk,
        waitingMinutes: minutesBetween(lead.firstMessageAt, nowIso),
      };
    })
    .filter((item) => item.risk !== "clear" && item.lead.status !== "booked" && item.lead.status !== "lost")
    .toSorted(
      (left, right) =>
        riskRank[right.risk] - riskRank[left.risk] ||
        right.lead.estimatedValue - left.lead.estimatedValue ||
        right.waitingMinutes - left.waitingMinutes,
    );
  const recoverableRevenue = triage.reduce((sum, item) => sum + item.lead.estimatedValue, 0);
  const threadCountByProvider = new Map<Provider, number>();

  for (const conversation of conversations) {
    threadCountByProvider.set(
      conversation.provider,
      (threadCountByProvider.get(conversation.provider) ?? 0) + 1,
    );
  }

  const priorityThreads: DashboardPriorityThread[] = triage.slice(0, 6).map((item) => {
    const conversation = conversationByLeadId.get(item.lead.id);
    const lastMessage = conversation ? messagesByConversation.get(conversation.id)?.at(-1) : undefined;
    const assignee = item.lead.assignedTo ? usersById.get(item.lead.assignedTo) : undefined;

    return {
      assignedTo: assignee?.name ?? "Unassigned",
      channel: item.lead.source,
      conversationId: conversation?.id,
      lastMessage: lastMessage?.text ?? "No message preview available.",
      patientName: item.lead.name,
      riskLabel: riskLabel(item.risk),
      tone: riskTone(item.risk),
      value: formatCurrency(item.lead.estimatedValue, organization),
      waiting: `${formatWaiting(item.waitingMinutes)} waiting`,
    };
  });
  const channels: DashboardChannelHealth[] = bootstrap.state.integrations
    .filter((integration) => integration.organizationId === organizationId)
    .map((integration) => ({
      detail: integration.errorState || `${threadCountByProvider.get(integration.provider) ?? 0} active threads`,
      healthScore: integration.healthScore,
      label: formatProvider(integration.provider),
      status: integration.status,
      threadCount: threadCountByProvider.get(integration.provider) ?? 0,
      tone: channelTone(integration.status),
    }))
    .toSorted((left, right) => right.threadCount - left.threadCount || right.healthScore - left.healthScore);
  const activeWebhooks = bootstrap.state.outgoingWebhookEndpoints.filter(
    (webhook) => webhook.organizationId === organizationId && webhook.status === "active",
  ).length;
  const activeApiKeys = bootstrap.state.partnerApiKeys.filter(
    (key) => key.organizationId === organizationId && key.status === "active",
  ).length;
  const scheduledReminders = bootstrap.state.conversationReminders.filter(
    (reminder) => reminder.organizationId === organizationId && reminder.status === "scheduled",
  ).length;
  const templates = bootstrap.state.replyTemplates.filter(
    (template) => template.organizationId === organizationId,
  ).length;
  const enabledFlags = bootstrap.state.featureFlags.filter(
    (flag) => flag.organizationId === organizationId && flag.enabled,
  ).length;
  const digest = bootstrap.state.weeklyDigests
    .filter((item) => item.organizationId === organizationId)
    .toSorted((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .at(0);
  const workflow: DashboardWorkflowCard[] = [
    {
      detail: `${conversations.length} total patient threads`,
      label: "Unified inbox",
      tone: "ok",
      value: String(bootstrap.summary.openConversations),
    },
    {
      detail: "Repeat contacts recognized by phone/contact id",
      label: "Patient memory",
      tone: "info",
      value: String(patientMemoryCount(leads)),
    },
    {
      detail: "Saved replies in composer modal",
      label: "Reply templates",
      tone: "ok",
      value: String(templates),
    },
    {
      detail: `${scheduledReminders} scheduled callbacks`,
      label: "Snooze reminders",
      tone: scheduledReminders ? "warm" : "info",
      value: String(scheduledReminders),
    },
    {
      detail: `${activeWebhooks} active endpoints`,
      label: "Webhooks",
      tone: activeWebhooks ? "ok" : "info",
      value: String(activeWebhooks),
    },
    {
      detail: "Partner clinic API access",
      label: "API keys",
      tone: activeApiKeys ? "ok" : "info",
      value: String(activeApiKeys),
    },
  ];
  const staffLoad: DashboardStaffLoad[] = bootstrap.state.memberships
    .filter(
      (membership) =>
        membership.organizationId === organizationId &&
        membership.status === "active" &&
        membership.role !== "super_admin",
    )
    .map((membership) => {
      const user = usersById.get(membership.userId);
      const assigned = leads.filter((lead) => lead.assignedTo === membership.userId);
      const assignedReplied = assigned.filter((lead) => Boolean(lead.firstHumanResponseAt));
      const slaMet = assignedReplied.filter(
        (lead) =>
          lead.firstHumanResponseAt &&
          minutesBetween(lead.firstMessageAt, lead.firstHumanResponseAt) <= 15,
      );

      return {
        assigned: assigned.length,
        initials: initials(user?.name ?? "Team"),
        name: user?.name ?? "Team member",
        replied: assignedReplied.length,
        slaMet: percent(slaMet.length, assigned.length),
      };
    });
  const activities: DashboardActivityItem[] = [
    ...bootstrap.state.messages
      .filter((message) => conversations.some((conversation) => conversation.id === message.conversationId))
      .toSorted((left, right) => Date.parse(right.sentAt) - Date.parse(left.sentAt))
      .slice(0, 4)
      .map<DashboardActivityItem>((message) => ({
        detail: message.text,
        label: message.direction === "inbound" ? "New patient message" : "Clinic reply queued",
        tone: message.direction === "inbound" ? "warm" : "ok",
        when: formatWhen(message.sentAt),
      })),
    ...bootstrap.state.integrationEvents
      .filter((event) => event.organizationId === organizationId)
      .toSorted((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
      .slice(0, 2)
      .map<DashboardActivityItem>((event) => ({
        detail: event.errorMessage || `${formatProvider(event.provider)} webhook ${event.status}`,
        label: "Webhook health",
        tone: event.status === "failed" ? "alert" : "info",
        when: formatWhen(event.processedAt ?? event.createdAt),
      })),
  ].slice(0, 6);

  return {
    activities,
    channels,
    clinicName: organization.name,
    digest: {
      recipient: digest?.recipientEmail ?? bootstrap.session?.user.email ?? "owner@clinic.com",
      status: digest?.status ?? "not configured",
    },
    metrics: [
      {
        delta: `${triage.length} active`,
        label: "Revenue at risk",
        sparkline: "2,8 18,13 34,10 50,22 66,11 82,16 98,9",
        tone: triage.length ? "alert" : "ok",
        value: formatCurrency(recoverableRevenue, organization),
      },
      {
        delta: `${bootstrap.overview.unanswered} waiting`,
        label: "Response rate",
        sparkline: "2,28 18,22 34,18 50,16 66,12 82,10 98,6",
        tone: "ok",
        value: percent(replied, leads.length),
      },
      {
        delta: "human replies",
        label: "Avg response",
        sparkline: "2,12 18,10 34,15 50,18 66,14 82,12 98,9",
        tone: avgResponse > 15 ? "warm" : "ok",
        value: `${avgResponse}m`,
      },
      {
        delta: `${leads.length} inquiries`,
        label: "Booked",
        sparkline: "2,26 18,19 34,24 50,15 66,14 82,10 98,7",
        tone: "ok",
        value: String(booked),
      },
    ],
    priorityThreads,
    role: bootstrap.session?.role ?? "manager",
    staffLoad,
    summary: {
      activeApiKeys,
      activeWebhooks,
      enabledFlags,
      openConversations: bootstrap.summary.openConversations,
      scheduledReminders,
      templates,
    },
    userName: bootstrap.session?.user.name ?? "Clinic team",
    workflow,
  };
}
