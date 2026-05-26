import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BellRing,
  FileText,
  History,
  Inbox,
  KeyRound,
  MessageCircle,
  Plug,
  RadioTower,
  Send,
  ShieldCheck,
  Webhook,
} from "lucide-react";
import type {
  DashboardActivityItem,
  DashboardChannelHealth,
  DashboardOverviewMetric,
  DashboardPriorityThread,
  DashboardStaffLoad,
  DashboardWorkflowCard,
} from "@/features/dashboard/redesign-view-model";

function badgeClass(tone: string): string {
  if (tone === "alert") return "ddr-badge-alert";
  if (tone === "warm") return "ddr-badge-warm";
  if (tone === "ok") return "ddr-badge-ok";
  return "ddr-badge-info";
}

function iconForWorkflow(label: string) {
  if (label.includes("Patient")) return History;
  if (label.includes("Reply")) return FileText;
  if (label.includes("Snooze")) return BellRing;
  if (label.includes("Webhook")) return Webhook;
  if (label.includes("API")) return KeyRound;
  return Inbox;
}

function iconForActivity(label: string) {
  if (label.includes("reply")) return Send;
  if (label.includes("Webhook")) return RadioTower;
  return MessageCircle;
}

export function DashboardOverview({
  activities,
  channels,
  clinicName,
  digest,
  metrics,
  priorityThreads,
  role,
  staffLoad,
  summary,
  userName,
  workflow,
}: {
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
}) {
  return (
    <section className="ddr-dashboard-overview" aria-label="Dashboard overview">
      <div className="ddr-dashboard-hero ddr-card">
        <div>
          <span className="ddr-badge ddr-badge-info">Live dashboard</span>
          <h1>{clinicName}</h1>
          <p>
            Good morning, {userName.split(" ")[0] || "team"}. Your front desk has{" "}
            {summary.openConversations} open conversations, {summary.scheduledReminders} reminders,
            and {summary.templates} saved reply templates.
          </p>
        </div>
        <div className="ddr-dashboard-hero-actions">
          <span className="ddr-badge ddr-badge-ok">{role.replaceAll("_", " ")}</span>
          <Link className="ddr-button ddr-button-primary" href="/inbox">
            Open inbox
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>

      <div className="ddr-kpi-grid">
        {metrics.map((metric) => (
          <article className="ddr-card ddr-kpi-card" key={metric.label}>
            <div className="ddr-kpi-topline">
              <span className="ddr-feature-icon">
                <Activity size={17} />
              </span>
              <span className={`ddr-badge ${badgeClass(metric.tone)}`}>{metric.delta}</span>
            </div>
            <span className="ddr-kpi-label">{metric.label}</span>
            <strong className="ddr-kpi-value">{metric.value}</strong>
            <svg className="ddr-sparkline" viewBox="0 0 100 34" aria-hidden="true">
              <polyline points={metric.sparkline} />
            </svg>
          </article>
        ))}
      </div>

      <div className="ddr-dashboard-grid">
        <section className="ddr-card ddr-priority-panel">
          <div className="ddr-card-heading">
            <h2>Priority patient queue</h2>
            <p>Ranked by SLA pressure, patient value, and ownership state.</p>
          </div>
          <div className="ddr-priority-list">
            {priorityThreads.length > 0 ? (
              priorityThreads.map((thread) => (
                <Link
                  className={`ddr-priority-row ${thread.tone}`}
                  href={thread.conversationId ? `/inbox/${thread.conversationId}` : "/inbox"}
                  key={`${thread.patientName}-${thread.waiting}`}
                >
                  <span className={`ddr-channel-dot ${thread.channel}`}>
                    {thread.channel.slice(0, 2).toUpperCase()}
                  </span>
                  <div>
                    <strong>{thread.patientName}</strong>
                    <span>{thread.lastMessage}</span>
                  </div>
                  <div>
                    <span className={`ddr-badge ${badgeClass(thread.tone)}`}>{thread.riskLabel}</span>
                    <small>{thread.value}</small>
                  </div>
                  <div>
                    <small>{thread.waiting}</small>
                    <small>{thread.assignedTo}</small>
                  </div>
                </Link>
              ))
            ) : (
              <div className="ddr-empty-state">No priority threads right now.</div>
            )}
          </div>
        </section>

        <aside className="ddr-card ddr-ops-panel">
          <div className="ddr-card-heading">
            <h2>Operating model</h2>
            <p>Data-backed modules aligned with the redesigned workspace.</p>
          </div>
          <div className="ddr-workflow-grid-compact">
            {workflow.map((item) => {
              const Icon = iconForWorkflow(item.label);

              return (
                <div className="ddr-workflow-card" key={item.label}>
                  <span className="ddr-feature-icon">
                    <Icon size={16} />
                  </span>
                  <div>
                    <strong>{item.value}</strong>
                    <span>{item.label}</span>
                    <p>{item.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>

      <div className="ddr-dashboard-grid secondary">
        <section className="ddr-card ddr-channel-health-panel">
          <div className="ddr-card-heading">
            <h2>Channel and webhook health</h2>
            <p>Connected sources, thread volume, and integration readiness.</p>
          </div>
          <div className="ddr-channel-health-list">
            {channels.map((channel) => (
              <div className="ddr-channel-health-row" key={channel.label}>
                <span className="ddr-feature-icon">
                  <Plug size={16} />
                </span>
                <div>
                  <strong>{channel.label}</strong>
                  <span>{channel.detail}</span>
                </div>
                <div className="ddr-health-bar" aria-hidden="true">
                  <span style={{ width: `${Math.max(4, Math.min(100, channel.healthScore))}%` }} />
                </div>
                <span className={`ddr-badge ${badgeClass(channel.tone)}`}>{channel.status}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="ddr-card ddr-staff-load-panel">
          <div className="ddr-card-heading">
            <h2>Staff load</h2>
            <p>Ownership, replies, and SLA discipline by active seat.</p>
          </div>
          <div className="ddr-staff-load-list">
            {staffLoad.map((member) => (
              <div className="ddr-staff-load-row" key={member.name}>
                <span className="ddr-mini-avatar">{member.initials}</span>
                <div>
                  <strong>{member.name}</strong>
                  <span>{member.assigned} assigned</span>
                </div>
                <span>{member.replied} replied</span>
                <span className="ddr-badge ddr-badge-ok">{member.slaMet} SLA</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="ddr-dashboard-grid tertiary">
        <section className="ddr-card ddr-activity-panel">
          <div className="ddr-card-heading">
            <h2>Recent activity</h2>
            <p>Messages, replies, and webhook state changes from the live workspace.</p>
          </div>
          <div className="ddr-activity-list">
            {activities.map((item) => {
              const Icon = iconForActivity(item.label);

              return (
                <div className="ddr-activity-row" key={`${item.label}-${item.when}-${item.detail}`}>
                  <span className={`ddr-feature-icon ${item.tone}`}>
                    <Icon size={16} />
                  </span>
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.detail}</span>
                  </div>
                  <time>{item.when}</time>
                </div>
              );
            })}
          </div>
        </section>

        <aside className="ddr-card ddr-owner-digest-card">
          <div className="ddr-card-heading">
            <h2>Owner digest</h2>
            <p>Weekly email state for the clinic owner.</p>
          </div>
          <div className="ddr-owner-digest-body">
            <span className="ddr-feature-icon">
              <ShieldCheck size={18} />
            </span>
            <strong>{digest.status}</strong>
            <span>{digest.recipient}</span>
            <p>
              {summary.activeWebhooks} active webhooks, {summary.activeApiKeys} API keys, and{" "}
              {summary.enabledFlags} enabled feature flags are included in the operational view.
            </p>
            <Link className="ddr-button ddr-button-ghost" href="/dashboard/settings">
              Tune settings
              <ArrowRight size={15} />
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}
