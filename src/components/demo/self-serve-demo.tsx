"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  BellRing,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Inbox,
  MessageCircle,
  Send,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

type DemoConversation = {
  id: string;
  patient: string;
  channel: "WhatsApp" | "Instagram" | "Website";
  intent: string;
  value: number;
  waiting: string;
  urgency: "alert" | "warm" | "ok";
  assignedTo: string;
  booked: boolean;
  archived: boolean;
};

const initialConversations: DemoConversation[] = [
  {
    id: "mila",
    patient: "Mila K.",
    channel: "WhatsApp",
    intent: "Implant consultation slots this week",
    value: 1800,
    waiting: "SLA 2 min",
    urgency: "alert",
    assignedTo: "Anna",
    booked: false,
    archived: false,
  },
  {
    id: "daniel",
    patient: "Daniel R.",
    channel: "Instagram",
    intent: "Veneers pricing and financing",
    value: 1200,
    waiting: "11m",
    urgency: "warm",
    assignedTo: "Oleh",
    booked: false,
    archived: false,
  },
  {
    id: "ava",
    patient: "Ava P.",
    channel: "WhatsApp",
    intent: "Emergency tooth pain callback",
    value: 420,
    waiting: "4m",
    urgency: "ok",
    assignedTo: "Anna",
    booked: false,
    archived: false,
  },
  {
    id: "noah",
    patient: "Noah S.",
    channel: "Website",
    intent: "New website form inquiry",
    value: 650,
    waiting: "31m",
    urgency: "warm",
    assignedTo: "Marta",
    booked: false,
    archived: false,
  },
];

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function useRemainingMs(expiresAt: string) {
  const expiry = useMemo(() => Date.parse(expiresAt), [expiresAt]);
  const [remainingMs, setRemainingMs] = useState(() => Math.max(0, expiry - Date.now()));

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRemainingMs(Math.max(0, expiry - Date.now()));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [expiry]);

  return remainingMs;
}

export function DemoExpiredState() {
  return (
    <main className="ddr-reset demo-live-page demo-live-expired">
      <section className="demo-live-expired-card">
        <span className="ddr-public-eyebrow">Demo expired</span>
        <h1>Your 15-minute sample workspace has ended.</h1>
        <p>
          Demo sessions use fake clinic data and shut off automatically. Start another
          instant demo or create a clinic workspace to continue with your own setup.
        </p>
        <div className="demo-live-actions">
          <Link className="ddr-button ddr-button-primary" href="/demo/start">
            Start another demo
          </Link>
          <Link className="ddr-button ddr-button-ghost" href="/register">
            Create account
          </Link>
        </div>
      </section>
    </main>
  );
}

export function SelfServeDemo({
  expiresAt,
}: {
  expiresAt: string;
}) {
  const remainingMs = useRemainingMs(expiresAt);
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedId, setSelectedId] = useState("mila");
  const [draft, setDraft] = useState(
    "Hi Mila, we can offer an implant consultation today at 16:30 or tomorrow morning. Which works better?",
  );

  const selected = conversations.find((item) => item.id === selectedId) ?? conversations[0];
  const visibleConversations = conversations.filter((item) => !item.archived);
  const bookedCount = conversations.filter((item) => item.booked).length;
  const revenueRecovered = conversations
    .filter((item) => item.booked)
    .reduce((sum, item) => sum + item.value, 0);

  if (remainingMs <= 0) {
    return <DemoExpiredState />;
  }

  function updateSelected(patch: Partial<DemoConversation>) {
    setConversations((current) =>
      current.map((item) => (item.id === selected.id ? { ...item, ...patch } : item)),
    );
  }

  return (
    <main className="ddr-reset demo-live-page">
      <header className="demo-live-topbar">
        <Link className="ddr-public-brand" href="/" aria-label="Dash Dental home">
          <span>
            <MessageCircle size={17} />
          </span>
          <strong>Dash Dental</strong>
        </Link>
        <div className="demo-live-session">
          <span className="ddr-badge ddr-badge-info">Fake-data demo</span>
          <strong>{formatRemaining(remainingMs)}</strong>
        </div>
        <div className="demo-live-actions">
          <ThemeToggle />
          <Link className="ddr-button ddr-button-ghost" href="/register">
            Create account
          </Link>
        </div>
      </header>

      <section className="demo-live-grid">
        <aside className="demo-live-sidebar">
          <span className="demo-live-mark">
            <Sparkles size={18} />
          </span>
          <nav aria-label="Demo navigation">
            <span className="active">
              <Inbox size={16} />
              Inbox
            </span>
            <span>
              <Clock3 size={16} />
              SLA
            </span>
            <span>
              <BellRing size={16} />
              Alerts
            </span>
          </nav>
          <div className="demo-live-side-note">
            <strong>Local only</strong>
            <span>No real workspace APIs are called in this demo.</span>
          </div>
        </aside>

        <section className="demo-live-main">
          <div className="demo-live-kpis">
            <article className="ddr-card">
              <span>Total inquiries</span>
              <strong>{conversations.length}</strong>
            </article>
            <article className="ddr-card">
              <span>Booked in demo</span>
              <strong>{bookedCount}</strong>
            </article>
            <article className="ddr-card">
              <span>Recovered value</span>
              <strong>${revenueRecovered.toLocaleString()}</strong>
            </article>
          </div>

          <div className="demo-live-workspace">
            <section className="demo-live-list">
              <div className="demo-live-panel-head">
                <div>
                  <span>Priority queue</span>
                  <h2>Reply first</h2>
                </div>
                <span className="ddr-badge ddr-badge-alert">3 SLA risks</span>
              </div>
              {visibleConversations.map((conversation) => (
                <button
                  className={`demo-live-row ${conversation.urgency} ${
                    selected.id === conversation.id ? "selected" : ""
                  }`}
                  key={conversation.id}
                  onClick={() => setSelectedId(conversation.id)}
                  type="button"
                >
                  <span className={`demo-live-channel ${conversation.channel.toLowerCase()}`}>
                    {conversation.channel.slice(0, 2).toUpperCase()}
                  </span>
                  <span>
                    <strong>{conversation.patient}</strong>
                    <small>{conversation.intent}</small>
                  </span>
                  <em>{conversation.waiting}</em>
                </button>
              ))}
            </section>

            <section className="demo-live-thread">
              <div className="demo-live-panel-head">
                <div>
                  <span>{selected.channel}</span>
                  <h2>{selected.patient}</h2>
                </div>
                <span className={`ddr-badge ddr-badge-${selected.urgency}`}>
                  Assigned to {selected.assignedTo}
                </span>
              </div>

              <div className="demo-live-messages">
                <p className="incoming">{selected.intent}</p>
                <p className="outgoing">
                  Yes, we can offer today at 16:30 or tomorrow morning.
                </p>
                <div className="demo-live-note">
                  <ShieldCheck size={16} />
                  <span>
                    <strong>Team-only note</strong>
                    Returning patient. Mention financing and confirm callback number.
                  </span>
                </div>
              </div>

              <div className="demo-live-composer">
                <textarea value={draft} onChange={(event) => setDraft(event.target.value)} />
                <button className="ddr-icon-button" type="button" aria-label="Insert template">
                  <Sparkles size={16} />
                </button>
                <button className="ddr-button ddr-button-primary" type="button">
                  <Send size={16} />
                  Send
                </button>
              </div>
            </section>

            <aside className="demo-live-actions-panel">
              <button
                className="ddr-button ddr-button-primary"
                onClick={() => updateSelected({ booked: true })}
                type="button"
              >
                <CheckCircle2 size={16} />
                Mark booked
              </button>
              <button className="ddr-button ddr-button-ghost" type="button">
                <CalendarClock size={16} />
                Snooze
              </button>
              <button
                className="ddr-button ddr-button-ghost"
                onClick={() => updateSelected({ archived: true })}
                type="button"
              >
                <Archive size={16} />
                Archive
              </button>
              <div className="demo-live-history">
                <UserRoundCheck size={18} />
                <strong>Returning patient</strong>
                <span>Last appointment: Jan 14. Two prior threads detected.</span>
              </div>
            </aside>
          </div>
        </section>
      </section>
    </main>
  );
}
