"use client";

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
import { LocalizedText } from "@/features/i18n/components/localized-text";
import type { TranslationKey } from "@/features/i18n/translations";
import { RecoveryCockpitSidebar } from "@/features/dashboard/components/recovery-cockpit-sidebar";

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
  helper?: string;
  helperKey?: TranslationKey;
  label?: string;
  labelKey?: TranslationKey;
  tone: "active" | "default" | "risk" | "success" | "warning";
  value: string;
};

type RecoveryCockpitProps = {
  activeChannels?: string;
  ctaHref?: string;
  ctaLabel?: string;
  ctaLabelKey?: TranslationKey;
  embedded?: boolean;
  embeddedContext?: {
    atRisk: number;
    clinicName: string;
    firstName: string;
    unanswered: number;
  };
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
  ["Website forms", "Guided setup"],
  ["Telegram", "Guided setup"],
] as const;

export function RecoveryCockpit({
  activeChannels = "4",
  ctaHref = "/support#request",
  ctaLabel = "Book 15-min clinic demo",
  ctaLabelKey,
  embedded = false,
  embeddedContext,
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
  const queueHref = sampleMode ? "/register" : "/queue";
  const ctaPrimary =
    ctaLabelKey !== undefined ? (
      <LocalizedText k={ctaLabelKey} />
    ) : (
      ctaLabel
    );

  return (
    <section
      className={`dd-cockpit ${embedded ? "dd-cockpit-embedded" : ""}`}
      aria-label="Dash Dental recovery cockpit"
    >
      {embedded ? null : (
        <RecoveryCockpitSidebar
          activeChannels={activeChannels}
          items={sidebarItems}
          sampleMode={sampleMode}
          userLabel={userLabel}
          workspaceName={workspaceName}
        />
      )}

      <div className="dd-cockpit-workspace">
        <header
          className={`dd-cockpit-topbar clinic-console-header ${embedded ? "dd-cockpit-topbar-embedded" : ""}`}
        >
          <div className="clinic-console-title">
            {embedded && embeddedContext ? (
              <>
                <span className="dd-cockpit-kicker dd-cockpit-kicker-muted">
                  <LocalizedText k="dashboard.cockpit.embeddedKicker" />
                </span>
                <p className="dd-cockpit-clinic-line">{embeddedContext.clinicName}</p>
                <h1>
                  <LocalizedText k="workspace.nav.dashboard" />
                </h1>
                <p className="clinic-console-summary dd-cockpit-summary-compact">
                  <span className="dd-cockpit-greet-line">
                    <LocalizedText k="dashboard.hero.greeting" /> {embeddedContext.firstName}
                  </span>
                  <span className="dd-cockpit-meta-line">
                    {embeddedContext.unanswered}{" "}
                    <LocalizedText k="dashboard.cockpit.unansweredPatients" />
                    {" · "}
                    {embeddedContext.atRisk}{" "}
                    <LocalizedText k="dashboard.cockpit.atRiskItems" />
                  </span>
                </p>
              </>
            ) : (
              <>
                <span className="dd-cockpit-kicker dd-cockpit-kicker-demo">
                  <LocalizedText k="dashboard.cockpit.demoKicker" />
                </span>
                <h1>
                  <LocalizedText k="workspace.nav.dashboard" />
                </h1>
                <p className="clinic-console-summary">
                  <LocalizedText k="dashboard.cockpit.heroSummary" />
                </p>
              </>
            )}
          </div>
          <div className="dd-cockpit-topbar-actions">
            <Link className="dd-cockpit-button primary" href={ctaHref}>
              {ctaPrimary}
            </Link>
            <Link className="dd-cockpit-button secondary" href={queueHref}>
              <LocalizedText k="dashboard.cockpit.openQueue" />
            </Link>
          </div>
        </header>

        <div className="dd-cockpit-metrics">
          {metricRows.map((metric, index) => (
            <MetricCard
              key={metric.labelKey ?? metric.label ?? `metric-${index}`}
              metric={metric}
            />
          ))}
        </div>

        <div className="dd-cockpit-center-grid">
          <div className="clinic-main-column">
            <ConsolePanel
              action={
                <span className="dd-cockpit-chip ai">
                  <LocalizedText k="dashboard.cockpit.aiChipReady" />
                </span>
              }
              className="dd-cockpit-queue-panel"
              eyebrow={<LocalizedText k="dashboard.cockpit.queueEyebrow" />}
              title={<LocalizedText k="dashboard.cockpit.queueTitle" />}
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
  const label =
    metric.labelKey !== undefined ? <LocalizedText k={metric.labelKey} /> : metric.label;
  const helper =
    metric.helperKey !== undefined ? <LocalizedText k={metric.helperKey} /> : metric.helper;

  return (
    <article className={`dd-cockpit-metric ${metric.tone}`}>
      <span>{label}</span>
      <strong>{metric.value}</strong>
      {helper ? <small>{helper}</small> : null}
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
  eyebrow: ReactNode;
  title: ReactNode;
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
      <button aria-label={`Review ${row.intent}`} type="button">
        <LocalizedText k="dashboard.cockpit.review" />
      </button>
    </article>
  );
}

function ConversationPreview({ row }: { row: CockpitQueueRow }) {
  return (
    <ConsolePanel
      action={
        <span className="dd-cockpit-chip danger">
          <LocalizedText k="dashboard.cockpit.staffOwned" />
        </span>
      }
      className="dd-cockpit-preview"
      eyebrow={<LocalizedText k="dashboard.cockpit.previewEyebrow" />}
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
          <dt>
            <LocalizedText k="dashboard.cockpit.excerptLabel" />
          </dt>
          <dd>&quot;{row.excerpt}&quot;</dd>
        </div>
        <div>
          <dt>
            <LocalizedText k="dashboard.cockpit.riskLabel" />
          </dt>
          <dd>{row.riskReason}</dd>
        </div>
        <div>
          <dt>
            <LocalizedText k="dashboard.cockpit.nextActionLabel" />
          </dt>
          <dd>{row.action}</dd>
        </div>
      </dl>
      <aside className="dd-cockpit-draft">
        <span>
          <Sparkles size={15} aria-hidden />
          <LocalizedText k="dashboard.cockpit.aiDraftLabel" />
        </span>
        <p>{row.draft}</p>
        <b>
          <LocalizedText k="dashboard.cockpit.draftNotice" />
        </b>
      </aside>
    </ConsolePanel>
  );
}

function InsightPanel({ sampleMode }: { sampleMode: boolean }) {
  return (
    <aside className="dd-cockpit-insights" aria-label="Recovery settings">
      <div className="dd-cockpit-insight-title">
        <Settings2 size={18} aria-hidden />
        <strong>
          <LocalizedText k="dashboard.cockpit.recoverySettings" />
        </strong>
      </div>

      <InsightSection title={<LocalizedText k="dashboard.cockpit.sectionChannels" />}>
        {channelHealth.map(([label, value]) => (
          <div className="dd-cockpit-insight-row" key={label}>
            <strong>{label}</strong>
            <b>{value}</b>
          </div>
        ))}
      </InsightSection>

      <InsightSection title={<LocalizedText k="dashboard.cockpit.sectionAiBoundaries" />}>
        {aiBoundaries.map((item) => (
          <div className="dd-cockpit-insight-check" key={item}>
            <CheckCircle2 size={14} aria-hidden />
            {item}
          </div>
        ))}
      </InsightSection>

      <InsightSection title={<LocalizedText k="dashboard.cockpit.sectionRevenue" />}>
        {revenueAssumptions.map(([label, value]) => (
          <div className="dd-cockpit-insight-row" key={label}>
            <strong>{label}</strong>
            <b>{value}</b>
          </div>
        ))}
      </InsightSection>

      <InsightSection title={<LocalizedText k="dashboard.cockpit.sectionChannelHealth" />}>
        <div className="dd-cockpit-health-line">
          <Clock3 size={15} aria-hidden />
          <LocalizedText k="dashboard.cockpit.healthLine1" />
        </div>
        <div className="dd-cockpit-health-line">
          <MessageCircle size={15} aria-hidden />
          <LocalizedText k="dashboard.cockpit.healthLine2" />
        </div>
      </InsightSection>

      {sampleMode ? (
        <section className="dd-cockpit-sample-notice" aria-label="Sample data notice">
          <FileText size={16} aria-hidden />
          <div>
            <strong>
              <LocalizedText k="dashboard.cockpit.sampleNoticeTitle" />
            </strong>
            <p>
              <LocalizedText k="dashboard.cockpit.sampleNoticeBody" />
            </p>
          </div>
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
  title: ReactNode;
}) {
  return (
    <section className="dd-cockpit-insight-section">
      <span>{title}</span>
      {children}
    </section>
  );
}
