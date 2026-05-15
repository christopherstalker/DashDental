import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  BarChart3,
  Bot,
  CheckCircle2,
  Clock3,
  FileText,
  Inbox,
  LayoutDashboard,
  MessageCircle,
  Settings2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export type CockpitQueueRow = {
  action: string;
  channel: string;
  draft: string;
  excerpt: string;
  initials: string;
  intent: string;
  riskReason: string;
  status: string;
  urgency: string;
  value: string;
  waiting: string;
};

export type CockpitMetric = {
  helper: string;
  label: string;
  tone: "active" | "default" | "risk" | "success" | "warning";
  value: string;
};

type RecoveryCockpitProps = {
  activeChannels?: string;
  ctaHref?: string;
  ctaLabel?: string;
  embedded?: boolean;
  metrics?: CockpitMetric[];
  queueRows?: CockpitQueueRow[];
  sampleMode?: boolean;
  selectedIndex?: number;
  userLabel?: string;
  workspaceName?: string;
};

const fallbackMetrics: CockpitMetric[] = [
  {
    helper: "Estimated treatment opportunity, not a booking promise",
    label: "Money at risk today",
    tone: "risk",
    value: "$7.8k",
  },
  {
    helper: "Across active patient channels",
    label: "Unanswered patients",
    tone: "warning",
    value: "12",
  },
  {
    helper: "Above the clinic target",
    label: "Avg first response",
    tone: "default",
    value: "38m",
  },
  {
    helper: "Marked booked or protected this month",
    label: "Recovered conversations",
    tone: "success",
    value: "21",
  },
  {
    helper: "Connected or monitored intake channels",
    label: "Active channels",
    tone: "active",
    value: "4",
  },
];

const fallbackQueueRows: CockpitQueueRow[] = [
  {
    action: "Offer the nearest emergency slot and ask for callback number.",
    channel: "WhatsApp",
    draft:
      "Hi, we can help. We have an emergency slot today. Can you confirm your phone number so our front desk can call you now?",
    excerpt: "Emergency tooth pain since last night. Can someone call me today?",
    initials: "EP",
    intent: "Emergency tooth pain",
    riskReason: "High-urgency patient intent with no visible staff response yet.",
    status: "Needs staff reply",
    urgency: "High urgency",
    value: "$420",
    waiting: "22m waiting",
  },
  {
    action: "Move from DM to consult booking with two available times.",
    channel: "Instagram",
    draft:
      "Hi, veneer pricing depends on the smile plan. We can book a short consult and show options. Would today 16:30 or tomorrow 10:00 work?",
    excerpt: "Hi, can you send veneer prices and appointment availability?",
    initials: "MK",
    intent: "Veneers pricing",
    riskReason: "Cosmetic lead is comparing options and has waited over an hour.",
    status: "AI draft ready",
    urgency: "Cosmetic",
    value: "$1,200",
    waiting: "1h 14m waiting",
  },
  {
    action: "Call back before lunch and confirm implant consultation interest.",
    channel: "Website form",
    draft:
      "Thanks for asking about implants. Our coordinator can call you today to understand your case and offer consultation times.",
    excerpt: "I want to understand implant options and whether I can book a consult.",
    initials: "ON",
    intent: "Implant consult",
    riskReason: "High-value inquiry arrived through a form and needs a same-day callback.",
    status: "Owner visible",
    urgency: "High value",
    value: "$1,500",
    waiting: "2h waiting",
  },
  {
    action: "Share safe whitening booking path and ask preferred day.",
    channel: "Telegram",
    draft:
      "We can help with whitening options. Which day is better for a quick visit this week?",
    excerpt: "Do you have whitening this week? I am free after work.",
    initials: "SL",
    intent: "Whitening inquiry",
    riskReason: "Medium-intent lead is still warm but needs a booking path.",
    status: "Follow-up",
    urgency: "Medium",
    value: "$180",
    waiting: "46m waiting",
  },
];

const sidebarItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Overview" },
  { href: "/queue", icon: Inbox, label: "Recovery queue" },
  { href: "/integrations", icon: MessageCircle, label: "Channels" },
  { href: "/reports", icon: BarChart3, label: "Reports" },
  { href: "/ai", icon: Bot, label: "AI drafts" },
  { href: "/setup", icon: Settings2, label: "Settings" },
  { href: "/security", icon: ShieldCheck, label: "Security" },
] as const;

const aiBoundaries = [
  "Summaries",
  "Reply drafts",
  "Human review required",
  "No clinical decisions",
] as const;

const revenueAssumptions = [
  ["Implant consult", "$1,500"],
  ["Veneers inquiry", "$1,200"],
  ["Emergency visit", "$420"],
  ["Whitening inquiry", "$180"],
] as const;

const channelHealth = [
  ["WhatsApp", "Guided setup"],
  ["Instagram", "Requires approval"],
  ["Website forms", "Available"],
  ["Telegram", "Guided setup"],
] as const;

export function RecoveryCockpit({
  activeChannels = "4",
  ctaHref = "/support#request",
  ctaLabel = "Book 15-min clinic demo",
  embedded = false,
  metrics = fallbackMetrics,
  queueRows = fallbackQueueRows,
  sampleMode = false,
  selectedIndex = 0,
  userLabel = "Owner view",
  workspaceName = "Sample clinic",
}: RecoveryCockpitProps) {
  const rows = queueRows.length > 0 ? queueRows : fallbackQueueRows;
  const selected = rows[Math.min(selectedIndex, rows.length - 1)] ?? fallbackQueueRows[0];
  const metricRows = metrics.length > 0 ? metrics : fallbackMetrics;

  return (
    <section
      className={`dd-cockpit ${embedded ? "dd-cockpit-embedded" : ""}`}
      aria-label="Dash Dental recovery cockpit"
    >
      {embedded ? null : (
        <aside className="dd-cockpit-sidebar" aria-label="Dashboard navigation">
          <div className="dd-cockpit-brand">
            <span className="dd-cockpit-brand-mark" aria-hidden="true">
              <Image alt="" height={160} src="/dental-recovery-mark.svg" unoptimized width={160} />
            </span>
            <div>
              <strong>Dash Dental</strong>
              <small>{workspaceName}</small>
            </div>
          </div>

          <nav className="dd-cockpit-nav" aria-label="Dashboard sections">
            {sidebarItems.map((item, index) => (
              <Link className={index === 0 ? "active" : ""} href={sampleMode ? "/demo" : item.href} key={item.label}>
                <item.icon size={16} />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="dd-cockpit-sidebar-footer">
            {sampleMode ? <SampleDataBadge /> : <span className="dd-cockpit-chip active">Live workspace</span>}
            <div className="dd-cockpit-user">
              <span>{userLabel}</span>
              <strong>{workspaceName}</strong>
              <small>{activeChannels} active channels watched</small>
            </div>
          </div>
        </aside>
      )}

      <div className="dd-cockpit-workspace">
        <header className="dd-cockpit-topbar clinic-console-header">
          <div className="clinic-console-title">
            <span className="dd-cockpit-kicker">Missed-message recovery cockpit</span>
            <h1>Dashboard</h1>
          <p className="clinic-console-summary">
            Good morning. Prioritize unanswered patients, estimate money at risk, and keep
            staff-reviewed AI drafts in one operating view.
          </p>
          </div>
          <div className="dd-cockpit-topbar-actions">
            <Link className="dd-cockpit-button primary" href={ctaHref}>
              {ctaLabel}
            </Link>
            <Link className="dd-cockpit-button secondary" href={sampleMode ? "/register" : "/queue"}>
              Open recovery queue
            </Link>
          </div>
        </header>

        <div className="dd-cockpit-metrics">
          {metricRows.map((metric) => (
            <MetricCard key={metric.label} metric={metric} />
          ))}
        </div>

        <div className="dd-cockpit-center-grid">
          <div className="clinic-main-column">
            <ConsolePanel
              action={<span className="dd-cockpit-chip ai">AI draft ready</span>}
              className="dd-cockpit-queue-panel"
              eyebrow="Priority recovery queue"
              title="Conversations most likely to disappear"
            >
              <div className="dd-cockpit-queue">
                {rows.map((row, index) => (
                  <QueueItem active={index === selectedIndex} key={`${row.channel}-${row.intent}`} row={row} />
                ))}
              </div>
            </ConsolePanel>
          </div>

          <div className="clinic-side-column">
            <ConversationPreview row={selected} />
          </div>
        </div>
      </div>

      <InsightPanel sampleMode={sampleMode} />
    </section>
  );
}

function MetricCard({ metric }: { metric: CockpitMetric }) {
  return (
    <article className={`dd-cockpit-metric ${metric.tone}`}>
      <span>{metric.label}</span>
      <strong>{metric.value}</strong>
      <small>{metric.helper}</small>
    </article>
  );
}

function ConsolePanel({
  action,
  children,
  className = "",
  eyebrow,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <section className={`dd-cockpit-panel ${className}`}>
      <div className="dd-cockpit-panel-header">
        <div>
          <span>{eyebrow}</span>
          <strong>{title}</strong>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function QueueItem({ active, row }: { active: boolean; row: CockpitQueueRow }) {
  return (
    <article className={`dd-cockpit-queue-row ${active ? "active" : ""}`}>
      <span className="dd-cockpit-initials">{row.initials}</span>
      <div className="dd-cockpit-row-main">
        <strong>{row.intent}</strong>
        <span>
          {row.channel} / {row.urgency} / {row.waiting}
        </span>
      </div>
      <span className="dd-cockpit-channel">{row.channel}</span>
      <span className="dd-cockpit-chip warning">{row.urgency}</span>
      <b>{row.value}</b>
      <small>{row.action}</small>
      <em>{row.status}</em>
      <button type="button">Review</button>
    </article>
  );
}

function ConversationPreview({ row }: { row: CockpitQueueRow }) {
  return (
    <ConsolePanel
      action={<span className="dd-cockpit-chip danger">Staff owned</span>}
      className="dd-cockpit-preview"
      eyebrow="Selected conversation"
      title={`${row.initials} / ${row.intent}`}
    >
      <div className="dd-cockpit-preview-profile">
        <span className="dd-cockpit-initials large">{row.initials}</span>
        <div>
          <strong>{row.channel}</strong>
          <span>{row.intent}</span>
        </div>
      </div>
      <dl className="dd-cockpit-preview-list">
        <div>
          <dt>Latest safe message excerpt</dt>
          <dd>&quot;{row.excerpt}&quot;</dd>
        </div>
        <div>
          <dt>Risk reason</dt>
          <dd>{row.riskReason}</dd>
        </div>
        <div>
          <dt>Suggested next action</dt>
          <dd>{row.action}</dd>
        </div>
      </dl>
      <aside className="dd-cockpit-draft">
        <span>
          <Sparkles size={15} />
          AI draft reply
        </span>
        <p>{row.draft}</p>
        <b>Draft only - staff review required</b>
      </aside>
    </ConsolePanel>
  );
}

function InsightPanel({ sampleMode }: { sampleMode: boolean }) {
  return (
    <aside className="dd-cockpit-insights" aria-label="Recovery settings">
      <div className="dd-cockpit-insight-title">
        <Settings2 size={18} />
        <strong>Recovery settings</strong>
      </div>

      <InsightSection title="Active channels">
        {channelHealth.map(([label, value]) => (
          <div className="dd-cockpit-insight-row" key={label}>
            <strong>{label}</strong>
            <b>{value}</b>
          </div>
        ))}
      </InsightSection>

      <InsightSection title="AI boundaries">
        {aiBoundaries.map((item) => (
          <div className="dd-cockpit-insight-check" key={item}>
            <CheckCircle2 size={14} />
            {item}
          </div>
        ))}
      </InsightSection>

      <InsightSection title="Revenue assumptions">
        {revenueAssumptions.map(([label, value]) => (
          <div className="dd-cockpit-insight-row" key={label}>
            <strong>{label}</strong>
            <b>{value}</b>
          </div>
        ))}
      </InsightSection>

      <InsightSection title="Channel health">
        <div className="dd-cockpit-health-line">
          <Clock3 size={15} />
          Delivery and provider status stay visible.
        </div>
        <div className="dd-cockpit-health-line">
          <MessageCircle size={15} />
          Provider approvals are not marked live until configured.
        </div>
      </InsightSection>

      {sampleMode ? (
        <section className="dd-cockpit-sample-notice">
          <FileText size={16} />
          <p>This dashboard uses illustrative data and does not show real patients.</p>
        </section>
      ) : null}
    </aside>
  );
}

function InsightSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="dd-cockpit-insight-section">
      <span>{title}</span>
      {children}
    </section>
  );
}

function SampleDataBadge() {
  return <span className="dd-cockpit-chip sample">Sample data</span>;
}
