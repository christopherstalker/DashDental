"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  Activity,
  Bot,
  CheckCircle2,
  Clock3,
  FileText,
  Inbox,
  MessageCircle,
  Play,
  RadioTower,
  ShieldCheck,
  Sparkles,
  Target,
  Settings2,
  Zap,
  type LucideIcon,
} from "lucide-react";
import styles from "./landing-system.module.css";

type StudioModeId = "triage" | "draft" | "summary";

const studioModes: Array<{
  color: string;
  id: StudioModeId;
  label: string;
  output: string;
  prompt: string;
  title: string;
}> = [
  {
    color: "#4fe7d2",
    id: "triage",
    label: "Triage",
    output: "Move Eva to critical queue, assign reception, offer same-day callback windows.",
    prompt:
      "Find patient messages with urgent symptoms, high booking intent, or SLA risk. Return the next action only.",
    title: "Detect missed patient demand",
  },
  {
    color: "#7db7ff",
    id: "draft",
    label: "Draft",
    output: "Draft a receptionist-safe reply with two appointment windows and no clinical promises.",
    prompt:
      "Write a warm reply that asks for callback number, offers available appointment windows, and keeps treatment claims out.",
    title: "Generate staff-reviewed replies",
  },
  {
    color: "#b39cff",
    id: "summary",
    label: "Summary",
    output: "Summarize channel, intent, wait time, estimated value, and owner-visible leakage.",
    prompt:
      "Create a short owner summary of unanswered demand by channel, revenue risk, and recovered outcomes.",
    title: "Explain revenue leakage",
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
  ["WhatsApp", "3 urgent threads", "Watch", "86%"],
  ["Instagram", "5 cosmetic DMs", "Live", "64%"],
  ["Website forms", "2 callbacks late", "Risk", "71%"],
  ["Telegram", "4 follow-ups", "Live", "39%"],
] as const;

const sideNav: Array<{ icon: LucideIcon; label: string; active?: boolean }> = [
  { icon: Sparkles, label: "AI studio", active: true },
  { icon: Inbox, label: "Inbox" },
  { icon: Target, label: "Revenue" },
  { icon: RadioTower, label: "Channels" },
  { icon: ShieldCheck, label: "Safety" },
];

const runSettings = [
  ["Model", "Gemini recovery"],
  ["Temperature", "0.3"],
  ["Clinical boundary", "Strict"],
  ["Send mode", "Human approval"],
] as const;

export function HeroConsole() {
  const [activeMode, setActiveMode] = useState<StudioModeId>("triage");

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveMode((current) => {
        const currentIndex = studioModes.findIndex((mode) => mode.id === current);
        return studioModes[(currentIndex + 1) % studioModes.length].id;
      });
    }, 5200);

    return () => window.clearInterval(interval);
  }, []);

  const active = useMemo(
    () => studioModes.find((mode) => mode.id === activeMode) ?? studioModes[0],
    [activeMode],
  );

  return (
    <aside
      aria-label="Dash Dental AI recovery studio preview"
      className={styles.studioConsole}
      style={{ "--tab-color": active.color } as CSSProperties}
    >
      <nav aria-label="Studio sections" className={styles.studioRail}>
        <span aria-hidden="true" className={styles.studioRailMark}>
          DD
        </span>
        {sideNav.map(({ active: isActive, icon: Icon, label }) => (
          <button
            aria-label={label}
            aria-pressed={isActive ? "true" : "false"}
            className={isActive ? styles.studioRailButtonActive : styles.studioRailButton}
            key={label}
            type="button"
          >
            <Icon size={18} />
          </button>
        ))}
      </nav>

      <section className={styles.studioWorkbench}>
        <div className={styles.studioTopbar}>
          <div className={styles.studioTitleBlock}>
            <span>
              <Sparkles size={15} />
              Recovery Studio
            </span>
            <strong>Missed-message AI workflow</strong>
          </div>
          <div className={styles.studioTopbarActions}>
            <span className={styles.studioModelPill}>Gemini connected</span>
            <button className={styles.studioIconButton} aria-label="Open run settings" type="button">
              <Settings2 size={17} />
            </button>
            <button className={styles.studioRunButton} type="button">
              <Play size={16} />
              Run
            </button>
          </div>
        </div>

        <div className={styles.studioPromptTabs} role="tablist" aria-label="AI workflow modes">
          {studioModes.map((mode) => (
            <button
              aria-controls={`studio-mode-${mode.id}`}
              aria-selected={active.id === mode.id}
              id={`studio-tab-${mode.id}`}
              key={mode.id}
              onClick={() => setActiveMode(mode.id)}
              role="tab"
              type="button"
            >
              {mode.label}
            </button>
          ))}
        </div>

        <section
          aria-labelledby={`studio-tab-${active.id}`}
          className={styles.studioPromptPanel}
          id={`studio-mode-${active.id}`}
          role="tabpanel"
        >
          <div className={styles.studioPromptHeader}>
            <div>
              <span>System instruction</span>
              <h3>{active.title}</h3>
            </div>
            <span className={styles.studioStatusPill}>Draft only</span>
          </div>

          <div className={styles.studioPromptBox}>
            <p>{active.prompt}</p>
            <div className={styles.studioPromptChips}>
              <span>WhatsApp</span>
              <span>Instagram</span>
              <span>Website forms</span>
              <span>Clinic SLA</span>
            </div>
          </div>

          <div className={styles.studioContextGrid}>
            <article className={styles.studioPatientCard}>
              <div className={styles.studioMiniHeader}>
                <span>
                  <MessageCircle size={14} />
                  Incoming context
                </span>
                <em>22m late</em>
              </div>
              <p>
                Patient says severe tooth pain, asks if the clinic can see them today,
                and has not received a reply.
              </p>
            </article>
            <article className={styles.studioPatientCard}>
              <div className={styles.studioMiniHeader}>
                <span>
                  <FileText size={14} />
                  Clinic data
                </span>
                <em>$420 risk</em>
              </div>
              <p>
                Emergency slots: 14:30 and 16:00. Staff policy requires phone
                confirmation before booking.
              </p>
            </article>
          </div>

          <article className={styles.studioOutputCard}>
            <div className={styles.studioMiniHeader}>
              <span>
                <Bot size={14} />
                Generated recovery plan
              </span>
              <em>Human review required</em>
            </div>
            <p>{active.output}</p>
            <div className={styles.studioChecklist}>
              {["No diagnosis", "No autonomous sending", "Owner-visible audit"].map((item) => (
                <span key={item}>
                  <CheckCircle2 size={14} />
                  {item}
                </span>
              ))}
            </div>
          </article>
        </section>
      </section>

      <aside className={styles.studioInspector} aria-label="Run settings and live signals">
        <div className={styles.studioInspectorHeader}>
          <span>
            <Zap size={14} />
            Run settings
          </span>
          <strong>Safe assist</strong>
        </div>
        <div className={styles.studioSettingsList}>
          {runSettings.map(([label, value]) => (
            <article key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </article>
          ))}
        </div>

        <div className={styles.studioMetricStack}>
          <ConsoleMetric icon={Target} label="Revenue at risk" value="$7.8k" />
          <ConsoleMetric icon={Inbox} label="Unanswered" value="12" />
          <ConsoleMetric icon={Clock3} label="Avg response" value="38m" />
        </div>

        <section aria-label="Sample patient queue" className={styles.studioQueuePanel}>
          <div className={styles.studioInspectorHeader}>
            <span>
              <Activity size={14} />
              Priority queue
            </span>
            <strong>Live</strong>
          </div>
          {patientRows.map((row) => (
            <article className={styles.studioQueueRow} key={row.intent}>
              <span>{row.initials}</span>
              <div>
                <strong>{row.intent}</strong>
                <small>
                  {row.channel} - {row.wait}
                </small>
              </div>
              <em>{row.value}</em>
            </article>
          ))}
        </section>

        <section className={styles.studioChannelPanel} aria-label="Channel health">
          <div className={styles.studioInspectorHeader}>
            <span>
              <RadioTower size={14} />
              Channel health
            </span>
            <strong>4 sources</strong>
          </div>
          <div className={styles.studioChannelList}>
            {channelHealth.map(([channel, detail, status, value]) => (
              <article key={channel}>
                <div>
                  <strong>{channel}</strong>
                  <small>{detail}</small>
                </div>
                <span>{status}</span>
                <ConsoleProgress label={channel} value={Number(value.replace("%", ""))} />
              </article>
            ))}
          </div>
        </section>
      </aside>
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
    <article className={styles.studioMetricPanel}>
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
    <div className={styles.studioProgressRow}>
      <span className={styles.visuallyHidden}>{label}</span>
      <span className={styles.studioProgressTrack}>
        <span className={styles.studioProgressFill} style={{ "--value": `${value}%` } as CSSProperties} />
      </span>
    </div>
  );
}
