import type { CSSProperties } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock3,
  DollarSign,
  Inbox,
  RadioTower,
  Search,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import styles from "./dashboard-screen.module.css";

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

const channelStatusLabel: Record<DashboardChannelRow["state"], string> = {
  configured: "Configured",
  degraded: "Degraded",
  disconnected: "Disconnected",
  receiving: "Receiving",
  setup: "Setup",
};

const statusStrength: Record<DashboardChannelRow["state"], number> = {
  configured: 62,
  degraded: 38,
  disconnected: 12,
  receiving: 92,
  setup: 24,
};

const statusTone: Record<DashboardChannelRow["state"], string> = {
  configured: styles.statusActive,
  degraded: styles.statusWarning,
  disconnected: styles.statusRisk,
  receiving: styles.statusSuccess,
  setup: styles.statusMuted,
};

const mapNodes = [
  {
    className: styles.nodeSourceA,
    id: "sources",
    label: "Patient channels",
    metric: "4 sources",
    subLabel: "WhatsApp / IG / web / Telegram",
    tone: styles.nodeBlue,
  },
  {
    className: styles.nodeScanner,
    id: "scanner",
    label: "SLA scanner",
    metric: "live",
    subLabel: "reply pressure + value",
    tone: styles.nodeGreen,
  },
  {
    className: styles.nodeTriage,
    id: "triage",
    label: "AI triage",
    metric: "ranked",
    subLabel: "intent + risk",
    tone: styles.nodeAccent,
  },
  {
    className: styles.nodeDraft,
    id: "draft",
    label: "Draft engine",
    metric: "review",
    subLabel: "safe replies only",
    tone: styles.nodePurple,
  },
  {
    className: styles.nodeStaff,
    id: "staff",
    label: "Staff approval",
    metric: "human",
    subLabel: "send / call / book",
    tone: styles.nodeAmber,
  },
  {
    className: styles.nodeOutcome,
    id: "outcome",
    label: "Recovered revenue",
    metric: "reported",
    subLabel: "owner-visible",
    tone: styles.nodeGreen,
  },
] as const;

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
  const topQueue = queue[0];

  return (
    <section className={`${styles.dashboard} dashboard-ops-shell`}>
      <header className={styles.header}>
        <div className={styles.headerCopy}>
          <span className={styles.kicker}>
            <Zap size={14} />
            Live recovery cockpit
          </span>
          <h1>Dashboard</h1>
          <p className={styles.clinicName}>{clinicName}</p>
          <p className={styles.summaryText}>
            Good morning, {firstName}. {summary.waiting} patients waiting,{" "}
            {summary.atRisk} at risk, {summary.revenueAtRisk} visible revenue at risk.
          </p>
        </div>
        <div className={styles.headerActions}>
          <span className={styles.userPill}>
            {userName} / {role.replaceAll("_", " ")}
          </span>
          <Link className={styles.primaryAction} href="/inbox">
            Open priority queue
            <ArrowRight size={15} />
          </Link>
        </div>
      </header>

      <section className={styles.metricStrip} aria-label="Dashboard metrics">
        {metrics.map((metric) => {
          const Icon = metricIcons[metric.tone];

          return (
            <article className={`${styles.metricCard} ${styles[metric.tone]}`} key={metric.label}>
              <span>
                <Icon size={15} />
                {metric.label}
              </span>
              <strong>{metric.value}</strong>
              <p>{metric.detail}</p>
            </article>
          );
        })}
      </section>

      <div className={styles.mainGrid}>
        <section className={styles.signalMapPanel} aria-label="Recovery signal map">
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.kicker}>Signal map</span>
              <h2>Every patient signal flows to one recovery action.</h2>
            </div>
            <div className={styles.toolbar} aria-label="Map filters">
              <span>Interval: last 5 min</span>
              <span>Risk: live</span>
              <span>
                <Search size={13} />
                Quick search
              </span>
            </div>
          </div>

          <div className={styles.mapCanvas}>
            <svg aria-hidden="true" className={styles.mapLines} viewBox="0 0 1000 460">
              <path d="M118 228 C220 228 240 146 338 146" />
              <path d="M118 228 C230 228 250 304 368 304" />
              <path d="M420 146 C508 146 514 228 594 228" />
              <path d="M442 304 C522 304 520 228 594 228" />
              <path d="M670 228 C742 228 748 132 828 132" />
              <path d="M670 228 C752 228 758 318 844 318" />
              <path d="M888 132 C936 178 934 256 878 318" />
            </svg>

            <span className={`${styles.mapDot} ${styles.dotA}`} />
            <span className={`${styles.mapDot} ${styles.dotB}`} />
            <span className={`${styles.mapDot} ${styles.dotC}`} />
            <span className={styles.mapLabelA}>SLA + value</span>
            <span className={styles.mapLabelB}>{summary.revenueAtRisk}</span>
            <span className={styles.mapLabelC}>human approval</span>

            {mapNodes.map((node) => (
              <article
                className={`${styles.mapNode} ${node.className} ${node.tone}`}
                key={node.id}
              >
                <span>{node.metric}</span>
                <strong>{node.label}</strong>
                <small>{node.subLabel}</small>
              </article>
            ))}
          </div>
        </section>

        <aside className={styles.controlRail}>
          <section className={`${styles.sidePanel} ${styles.aiPanel}`}>
            <div className={styles.panelHeaderCompact}>
              <span>
                <Sparkles size={14} />
                AI recommendation
              </span>
              <b>Review</b>
            </div>
            <h2>{aiRecommendation.title}</h2>
            <p>{aiRecommendation.body}</p>
            <div className={styles.aiBoundary}>
              <Bot size={16} />
              Drafting and ranking only. Staff approves the final patient message.
            </div>
          </section>

          <section className={styles.sidePanel}>
            <div className={styles.panelHeaderCompact}>
              <span>
                <RadioTower size={14} />
                Channel health
              </span>
              <b>{channels.length} sources</b>
            </div>
            <div className={styles.channelList}>
              {channels.map((channel) => (
                <article className={styles.channelRow} key={channel.label}>
                  <div>
                    <strong>{channel.label}</strong>
                    <span>{channel.volume}</span>
                  </div>
                  <em className={`${styles.status} ${statusTone[channel.state]}`}>
                    {channelStatusLabel[channel.state]}
                  </em>
                  <small>{channel.detail}</small>
                  <span className={styles.progressTrack}>
                    <span
                      className={styles.progressFill}
                      style={{ "--value": `${statusStrength[channel.state]}%` } as CSSProperties}
                    />
                  </span>
                  <small>{channel.lastEvent}</small>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <div className={styles.lowerGrid}>
        <section className={styles.queuePanel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.kicker}>Priority queue</span>
              <h2>Patients that need staff action now</h2>
            </div>
            <Link className={styles.secondaryAction} href="/inbox">
              View inbox
            </Link>
          </div>

          {queue.length > 0 ? (
            <div className={styles.queueTable}>
              {queue.map((row, index) => (
                <article className={styles.queueRow} key={`${row.patient}-${row.intent}`}>
                  <span className={styles.queueIndex}>{String(index + 1).padStart(2, "0")}</span>
                  <div className={styles.queuePatient}>
                    <strong>{row.patient}</strong>
                    <small>
                      {row.channel} / {row.intent}
                    </small>
                  </div>
                  <span className={`${styles.status} ${styles.statusWarning}`}>{row.waiting}</span>
                  <span className={`${styles.status} ${styles.statusRisk}`}>{row.risk}</span>
                  <b>{row.value}</b>
                  <p>{row.action}</p>
                  <Link href="/inbox">Review</Link>
                </article>
              ))}
            </div>
          ) : (
            <section className={styles.emptyQueue}>
              <Inbox size={28} />
              <h3>No urgent patient conversations.</h3>
              <p>Connect a channel or send a website-form test lead to start measuring response time.</p>
            </section>
          )}
        </section>

        <section className={styles.activityPanel}>
          <div className={styles.panelHeaderCompact}>
            <span>
              <Activity size={14} />
              Recent activity
            </span>
            <b>Workspace signals</b>
          </div>

          <div className={styles.activityList}>
            {activities.map((activity) => (
              <article className={styles.activityRow} key={`${activity.label}-${activity.meta}`}>
                <span className={`${styles.status} ${styles[activity.tone]}`}>
                  {activity.tone}
                </span>
                <strong>{activity.label}</strong>
                <small>{activity.meta}</small>
              </article>
            ))}
          </div>

          <div className={styles.fastPath}>
            <ShieldCheck size={16} />
            <span>
              Fast path: no dashboard client state, no chart library, server-rendered SVG map.
            </span>
          </div>
        </section>
      </div>

      {topQueue ? (
        <Link className={styles.floatingAction} href="/inbox">
          Reply to {topQueue.patient}
          <ArrowRight size={15} />
        </Link>
      ) : null}
    </section>
  );
}
