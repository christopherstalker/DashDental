import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  CalendarClock,
  CheckCircle2,
  Clock3,
  DollarSign,
  Inbox,
  RadioTower,
  Sparkles,
} from "lucide-react";

export interface DashboardMetric {
  detail: string;
  label: string;
  tone: "active" | "default" | "risk" | "success" | "warning";
  value: string;
}

export interface DashboardQueueRow {
  action: string;
  channel: string;
  intent: string;
  patient: string;
  risk: string;
  value: string;
  waiting: string;
}

export interface DashboardChannelRow {
  detail: string;
  label: string;
  lastEvent: string;
  state: "configured" | "degraded" | "disconnected" | "receiving" | "setup";
  volume: string;
}

export interface DashboardActivityRow {
  label: string;
  meta: string;
  tone: "active" | "default" | "risk" | "warning";
}

const metricIcons = {
  active: RadioTower,
  default: Clock3,
  risk: DollarSign,
  success: CheckCircle2,
  warning: AlertTriangle,
} as const;

const demoRequestHref =
  "/support?category=Demo%20or%20onboarding%20call&urgency=Normal&channel=Not%20channel-specific&message=Please%20book%20or%20reschedule%20a%20Dash%20Dental%20demo.%20I%20want%20to%20review%20the%20dashboard%20workflow.#request";

const channelStatusLabel: Record<DashboardChannelRow["state"], string> = {
  configured: "Configured",
  degraded: "Degraded",
  disconnected: "Disconnected",
  receiving: "Receiving",
  setup: "Setup",
};

export function DashboardScreen({
  activities,
  aiRecommendation,
  channels,
  clinicName,
  metrics,
  queue,
  role,
  summary,
  userName,
}: {
  activities: DashboardActivityRow[];
  aiRecommendation: {
    body: string;
    title: string;
  };
  channels: DashboardChannelRow[];
  clinicName: string;
  metrics: DashboardMetric[];
  queue: DashboardQueueRow[];
  role: string;
  summary: {
    atRisk: number;
    revenueAtRisk: string;
    waiting: number;
  };
  userName: string;
}) {
  const firstName = userName.split(" ")[0] || "team";

  return (
    <section className="operator-dashboard">
      <header className="operator-hero">
        <div>
          <p className="eyebrow">Recovery command center</p>
          <h1>Dashboard</h1>
          <p className="operator-clinic-name">{clinicName}</p>
          <p className="clinic-console-summary">
            Good morning, {firstName}. {summary.waiting} patients waiting -{" "}
            {summary.atRisk} at risk - {summary.revenueAtRisk} revenue at risk.
          </p>
        </div>
        <div className="operator-hero-actions">
          <span className="operator-user-pill">
            {userName} - {role.replaceAll("_", " ")}
          </span>
          <Link className="primary-button" href="/inbox">
            Open priority queue
            <ArrowRight size={16} />
          </Link>
        </div>
      </header>

      <div className="operator-metric-grid">
        {metrics.map((metric) => {
          const Icon = metricIcons[metric.tone];

          return (
            <article className={`operator-metric ${metric.tone}`} key={metric.label}>
              <span>
                <Icon size={16} />
                {metric.label}
              </span>
              <strong>{metric.value}</strong>
              <p>{metric.detail}</p>
            </article>
          );
        })}
      </div>

      <div className="operator-main-grid">
        <section className="operator-panel operator-queue-panel clinic-main-column">
          <div className="operator-panel-header">
            <div>
              <p className="eyebrow">Priority queue</p>
              <h2>Patients that need staff action now</h2>
            </div>
            <Link className="secondary-button compact-button" href="/inbox">
              View inbox
            </Link>
          </div>
          <div className="operator-queue">
            {queue.length > 0 ? (
              queue.map((row) => (
                <article className="operator-queue-row" key={`${row.patient}-${row.intent}`}>
                  <div>
                    <strong>{row.patient}</strong>
                    <span>
                      {row.channel} - {row.intent}
                    </span>
                  </div>
                  <span className="operator-status warning">{row.waiting}</span>
                  <span className="operator-status risk">{row.risk}</span>
                  <b>{row.value}</b>
                  <p>{row.action}</p>
                </article>
              ))
            ) : (
              <section className="operator-empty">
                <Inbox size={28} />
                <h3>No urgent patient conversations.</h3>
                <p>
                  Connect a channel or send a website-form test lead to start
                  measuring response time.
                </p>
              </section>
            )}
          </div>
        </section>

        <aside className="operator-side-stack clinic-side-column">
          <section className="operator-panel operator-ai-panel">
            <div className="operator-panel-header">
              <div>
                <p className="eyebrow">AI recommendation</p>
                <h2>{aiRecommendation.title}</h2>
              </div>
              <span className="operator-status active">
                <Sparkles size={14} />
                Human review
              </span>
            </div>
            <p>{aiRecommendation.body}</p>
            <div className="operator-ai-boundary">
              <Bot size={17} />
              AI drafts and prioritizes. Clinic staff approves final messages.
              No diagnosis, clinical decisioning, or billing truth.
            </div>
          </section>

          <section className="operator-panel operator-demo-panel">
            <div className="operator-panel-header">
              <div>
                <p className="eyebrow">Demo support</p>
                <h2>Book or reschedule a dashboard demo</h2>
              </div>
              <CalendarClock size={18} />
            </div>
            <p>
              Opens a pre-filled support request so the team can respond with the
              next available demo slot.
            </p>
            <Link className="primary-button compact-button" href={demoRequestHref}>
              Book demo
              <ArrowRight size={15} />
            </Link>
          </section>

          <section className="operator-panel">
            <div className="operator-panel-header">
              <div>
                <p className="eyebrow">Channel health</p>
                <h2>Inbound signal quality</h2>
              </div>
            </div>
            <div className="operator-channel-list">
              {channels.map((channel) => (
                <article className="operator-channel-row" key={channel.label}>
                  <div>
                    <strong>{channel.label}</strong>
                    <span>{channel.detail}</span>
                  </div>
                  <span className={`operator-status ${channel.state}`}>
                    {channelStatusLabel[channel.state]}
                  </span>
                  <small>{channel.volume}</small>
                  <small>{channel.lastEvent}</small>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <section className="operator-panel operator-activity-panel">
        <div className="operator-panel-header">
          <div>
            <p className="eyebrow">Recent activity</p>
            <h2>Workspace signals</h2>
          </div>
          <Activity size={18} />
        </div>
        <div className="operator-activity-grid">
          {activities.map((activity) => (
            <article className="operator-activity-row" key={`${activity.label}-${activity.meta}`}>
              <span className={`operator-status ${activity.tone}`}>{activity.tone}</span>
              <strong>{activity.label}</strong>
              <small>{activity.meta}</small>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
