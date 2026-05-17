"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  Activity,
  Bot,
  Clock3,
  Inbox,
  MessageCircle,
  RadioTower,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import styles from "./landing-system.module.css";

type ConsoleTabId = "queue" | "revenue" | "channels" | "ai";

const consoleTabs: Array<{
  bars: Array<{ label: string; value: number }>;
  color: string;
  id: ConsoleTabId;
  insight: string;
  label: string;
  metric: string;
  metricLabel: string;
  title: string;
}> = [
  {
    bars: [
      { label: "Critical SLA pressure", value: 84 },
      { label: "High-value consults", value: 66 },
      { label: "Follow-up clarity", value: 52 },
    ],
    color: "#4fe7d2",
    id: "queue",
    insight: "Emergency pain and implant consults are above the clinic SLA target.",
    label: "Queue",
    metric: "12",
    metricLabel: "patients waiting",
    title: "Priority recovery queue",
  },
  {
    bars: [
      { label: "Implant opportunities", value: 78 },
      { label: "Cosmetic demand", value: 62 },
      { label: "Emergency bookings", value: 48 },
    ],
    color: "#79d99a",
    id: "revenue",
    insight: "Estimated opportunity is concentrated in cosmetic DMs and website forms.",
    label: "Revenue",
    metric: "$7.8k",
    metricLabel: "estimated at risk",
    title: "Money-at-risk scanner",
  },
  {
    bars: [
      { label: "WhatsApp urgency", value: 74 },
      { label: "Instagram intent", value: 58 },
      { label: "Website callback risk", value: 41 },
    ],
    color: "#7db7ff",
    id: "channels",
    insight: "WhatsApp needs immediate attention. Instagram is driving cosmetic consults.",
    label: "Channels",
    metric: "4",
    metricLabel: "sources monitored",
    title: "Channel health radar",
  },
  {
    bars: [
      { label: "Intent summary", value: 88 },
      { label: "Reply draft quality", value: 76 },
      { label: "Clinical boundary check", value: 18 },
    ],
    color: "#b39cff",
    id: "ai",
    insight: "AI suggests the reply, but staff review stays required before sending.",
    label: "AI",
    metric: "Draft",
    metricLabel: "human approval",
    title: "Human-reviewed AI assist",
  },
];

const patientRows = [
  {
    channel: "WhatsApp",
    initials: "EP",
    intent: "Emergency tooth pain",
    status: "Critical",
    value: "$420",
    wait: "22m",
  },
  {
    channel: "Instagram",
    initials: "MK",
    intent: "Veneers pricing",
    status: "High intent",
    value: "$1,200",
    wait: "1h 14m",
  },
  {
    channel: "Website",
    initials: "ON",
    intent: "Implant consult",
    status: "High value",
    value: "$1,500",
    wait: "2h",
  },
] as const;

const channelHealth = [
  ["WhatsApp", "3 urgent threads", "Watch"],
  ["Instagram", "5 cosmetic DMs", "Live"],
  ["Website forms", "2 callbacks late", "Risk"],
  ["Telegram", "4 follow-ups", "Live"],
] as const;

export function HeroConsole() {
  const [activeTab, setActiveTab] = useState<ConsoleTabId>("queue");

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveTab((current) => {
        const currentIndex = consoleTabs.findIndex((tab) => tab.id === current);
        return consoleTabs[(currentIndex + 1) % consoleTabs.length].id;
      });
    }, 4600);

    return () => window.clearInterval(interval);
  }, []);

  const active = useMemo(
    () => consoleTabs.find((tab) => tab.id === activeTab) ?? consoleTabs[0],
    [activeTab],
  );

  return (
    <aside
      aria-label="Interactive Dash Dental product console"
      className={styles.console}
      style={{ "--tab-color": active.color } as CSSProperties}
    >
      <div className={styles.consoleTopbar}>
        <div className={styles.consoleTitle}>
          <span aria-hidden="true" className={styles.liveDot} />
          <div>
            <strong>Dash Dental live cockpit</strong>
            <span>Owner view with front-desk actions</span>
          </div>
        </div>
        <span className={styles.sampleTag}>Illustrative data</span>
      </div>

      <div aria-label="Console preview tabs" className={styles.tabList} role="tablist">
        {consoleTabs.map((tab) => (
          <button
            aria-controls={`hero-console-${tab.id}`}
            aria-selected={active.id === tab.id}
            id={`hero-console-tab-${tab.id}`}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section
        aria-labelledby={`hero-console-tab-${active.id}`}
        className={styles.activePanel}
        id={`hero-console-${active.id}`}
        role="tabpanel"
      >
        <div className={styles.metricHero}>
          <span>{active.title}</span>
          <strong>{active.metric}</strong>
          <small>{active.metricLabel}</small>
        </div>
        <div className={styles.nextAction}>
          <div className={styles.nextActionHeader}>
            <span>
              <Sparkles size={15} />
              AI next action
            </span>
            <span className={styles.statusTag}>Review</span>
          </div>
          <h3>{active.insight}</h3>
          <p>
            Reply with specific appointment windows, ask for the best callback number,
            and keep the thread owned by reception until booked or clearly closed.
          </p>
          <div className={styles.progressStack}>
            {active.bars.map((bar) => (
              <ConsoleProgress key={`${active.id}-${bar.label}`} label={bar.label} value={bar.value} />
            ))}
          </div>
        </div>
      </section>

      <div className={styles.consoleMetrics}>
        <ConsoleMetric icon={Target} label="Revenue at risk" value="$7.8k" />
        <ConsoleMetric icon={TrendingUp} label="Saved revenue" value="$12.4k" />
        <ConsoleMetric icon={Inbox} label="Unanswered" value="12" />
        <ConsoleMetric icon={Clock3} label="Avg response" value="38m" />
      </div>

      <div className={styles.consoleGrid}>
        <section aria-label="Sample patient recovery queue" className={styles.queuePanel}>
          <div className={styles.panelHeader}>
            <div>
              <strong>Patient queue</strong>
              <span>Sorted by SLA, intent, and value</span>
            </div>
            <Activity size={17} />
          </div>
          {patientRows.map((row) => (
            <article className={styles.queueRow} key={row.intent}>
              <span className={styles.avatar}>{row.initials}</span>
              <div>
                <strong>{row.intent}</strong>
                <small>
                  {row.channel} - {row.wait} waiting
                </small>
              </div>
              <span className={styles.queueValue}>
                {row.value}
                <em>{row.status}</em>
              </span>
            </article>
          ))}
        </section>

        {active.id === "channels" ? (
          <section className={styles.channelPanel}>
            <div className={styles.panelHeader}>
              <div>
                <strong>Channel health</strong>
                <span>Where attention is needed</span>
              </div>
              <RadioTower size={17} />
            </div>
            <div className={styles.healthList}>
              {channelHealth.map(([channel, detail, status]) => (
                <article key={channel}>
                  <div>
                    <strong>{channel}</strong>
                    <small>{detail}</small>
                  </div>
                  <span className={styles.healthStatus}>{status}</span>
                </article>
              ))}
            </div>
          </section>
        ) : active.id === "ai" ? (
          <section className={styles.aiPanel}>
            <div className={styles.panelHeader}>
              <div>
                <strong>AI guardrails</strong>
                <span>Drafting support only</span>
              </div>
              <Bot size={17} />
            </div>
            <p>
              AI summarizes intent and drafts a receptionist-safe reply. It does not
              diagnose, promise treatment, or send without staff approval.
            </p>
            <div className={styles.aiChecklist}>
              {["Summarize intent", "Suggest next action", "Human sends", "Audit context remains"].map(
                (item) => (
                  <span key={item}>
                    <ShieldCheck size={14} />
                    {item}
                  </span>
                ),
              )}
            </div>
          </section>
        ) : (
          <section className={styles.scannerPanel}>
            <div className={styles.panelHeader}>
              <div>
                <strong>SLA scanner</strong>
                <span>Response pressure by thread</span>
              </div>
              <MessageCircle size={17} />
            </div>
            <div className={styles.scannerBars}>
              {[
                ["Emergency", 88],
                ["Implants", 72],
                ["Cosmetic", 61],
                ["Whitening", 34],
              ].map(([label, value]) => (
                <ConsoleProgress key={label} label={String(label)} value={Number(value)} />
              ))}
            </div>
          </section>
        )}
      </div>
    </aside>
  );
}

function ConsoleMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <article className={styles.metricPanel}>
      <span>
        <Icon size={14} />
        {label}
      </span>
      <strong>{value}</strong>
    </article>
  );
}

function ConsoleProgress({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.progressRow}>
      <div className={styles.progressLabel}>
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <span className={styles.progressTrack}>
        <span className={styles.progressFill} style={{ "--value": `${value}%` } as CSSProperties} />
      </span>
    </div>
  );
}
