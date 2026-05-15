"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MessageSquare, BarChart3, Settings, Bell, Search,
  ChevronDown, Send, Trash2, AlertTriangle, Clock,
  CheckCircle2, Instagram, Globe, LogOut, User, RefreshCw,
  Inbox, TrendingUp, Filter, MoreHorizontal, ArrowLeft,
} from "lucide-react";

// ── Colour tokens ──────────────────────────────────────────────
const C = {
  bg:       "#0f1011",
  panel1:   "#1b1c1e",
  panel2:   "#202124",
  border:   "rgba(255,255,255,0.08)",
  text:     "#f1f3f4",
  muted:    "#a7adb5",
  blue:     "#8ab4f8",
  green:    "#81c995",
  amber:    "#fdd663",
  red:      "#f28b82",
  purple:   "#c58af9",
};

// ── Sample data ────────────────────────────────────────────────
const metrics = [
  { label: "Money at risk today", value: "$4,200", sub: "3 implant + 1 veneer lead", color: C.red, icon: AlertTriangle },
  { label: "Unanswered patients", value: "17", sub: "across all channels", color: C.amber, icon: MessageSquare },
  { label: "Avg first response", value: "6.4 min", sub: "last 7 days", color: C.blue, icon: Clock },
  { label: "Recovered conversations", value: "12", sub: "this week", color: C.green, icon: CheckCircle2 },
];

type Risk = "HIGH" | "MED" | "LOW";
const riskColor: Record<Risk, string> = { HIGH: C.red, MED: C.amber, LOW: C.muted };

interface Thread {
  id: number;
  name: string;
  msg: string;
  tag: string;
  risk: Risk;
  channel: string;
  channelColor: string;
  age: string;
  unread: boolean;
  value: string;
  fullMsg: string;
}

const threads: Thread[] = [
  {
    id: 1, name: "Carlos Mendez", msg: "Interested in full implant consultation, saw your ad...",
    tag: "Implant", risk: "HIGH", channel: "WhatsApp", channelColor: C.green,
    age: "2h 14m", unread: true, value: "$1,800",
    fullMsg: "Hi! I saw your ad about dental implants and I&apos;m very interested in scheduling a consultation. I&apos;ve been missing a molar for about two years and I think an implant would be the right solution. What are the costs typically? Is a consultation free?",
  },
  {
    id: 2, name: "Priya Kapoor", msg: "Severe tooth pain, need emergency appointment ASAP",
    tag: "Emergency", risk: "HIGH", channel: "Instagram", channelColor: C.purple,
    age: "47m", unread: true, value: "$600",
    fullMsg: "I&apos;m in a lot of pain right now. I have severe throbbing pain in my upper right molar. It started last night and I can&apos;t sleep. Do you have any emergency slots today or tomorrow morning? Please help!",
  },
  {
    id: 3, name: "Tom Whitfield", msg: "How much are porcelain veneers? Saw your post...",
    tag: "Veneer", risk: "HIGH", channel: "Web", channelColor: C.blue,
    age: "4h 02m", unread: true, value: "$2,400",
    fullMsg: "Hey, I came across your clinic on Instagram and loved the smile transformations you posted. I&apos;ve always wanted to get veneers on my top 6 teeth. Do you offer financing? What&apos;s the rough cost per veneer?",
  },
  {
    id: 4, name: "Sofia Ramirez", msg: "Do you do Invisalign? Looking for a consultation",
    tag: "Ortho", risk: "MED", channel: "Telegram", channelColor: C.blue,
    age: "6h 30m", unread: false, value: "$1,200",
    fullMsg: "Hello! I&apos;m interested in straightening my teeth with Invisalign. I had braces as a teenager but my teeth have shifted. Do you offer Invisalign? How long does it usually take? Would love to book a free consultation if available.",
  },
  {
    id: 5, name: "Ahmed Hassan", msg: "Is teeth whitening included in your checkup package?",
    tag: "Whitening", risk: "LOW", channel: "WhatsApp", channelColor: C.green,
    age: "1d 2h", unread: false, value: "$300",
    fullMsg: "Hi there, I booked a regular checkup for next Tuesday. I saw on your website that you do teeth whitening. Is it possible to add that to the same appointment? What&apos;s the cost difference?",
  },
  {
    id: 6, name: "Lisa Park", msg: "Looking for a dentist for my whole family, do you...",
    tag: "Family", risk: "LOW", channel: "Web", channelColor: C.blue,
    age: "1d 8h", unread: false, value: "$800",
    fullMsg: "Hi! We just moved to the area and are looking for a family dentist. We have two kids (ages 7 and 10) and two adults. Do you take new patients? Do you work with dental insurance? We&apos;re on Blue Cross.",
  },
];

const navItems = [
  { icon: Inbox, label: "Queue", active: true },
  { icon: BarChart3, label: "Reports", active: false },
  { icon: MessageSquare, label: "Channels", active: false },
  { icon: Settings, label: "Settings", active: false },
];

// ── Component ──────────────────────────────────────────────────
export default function DashboardPage() {
  const [selected, setSelected] = useState<Thread>(threads[0]);
  const [draftText, setDraftText] = useState(
    "Hi Carlos! Thanks for reaching out about dental implants. We'd love to help — our consultations are completely free and we'd be happy to discuss your options. Are you available this week for a quick chat?"
  );
  const [filter, setFilter] = useState<"ALL" | Risk>("ALL");

  const filtered = filter === "ALL" ? threads : threads.filter((t) => t.risk === filter);

  return (
    <div
      style={{ backgroundColor: C.bg, color: C.text, height: "100vh", display: "flex", flexDirection: "column", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", overflow: "hidden" }}
    >
      {/* ── Top bar ─────────────────────────────────────────── */}
      <header style={{ backgroundColor: C.panel1, borderBottom: `1px solid ${C.border}`, height: 52, display: "flex", alignItems: "center", padding: "0 16px", gap: 12, shrink: 0, flexShrink: 0 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: C.blue, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: C.bg, fontSize: 11, fontWeight: 700 }}>D</span>
          </div>
          <span style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>Dash Dental</span>
        </Link>

        <div style={{ flex: 1, position: "relative", maxWidth: 320 }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.muted }} />
          <input
            placeholder="Search patients, channels…"
            style={{ width: "100%", height: 32, backgroundColor: C.panel2, border: `1px solid ${C.border}`, borderRadius: 6, paddingLeft: 32, paddingRight: 12, fontSize: 13, color: C.text, outline: "none" }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
          <div
            style={{ fontSize: 11, padding: "3px 10px", borderRadius: 999, border: `1px solid rgba(253,214,99,0.35)`, backgroundColor: "rgba(253,214,99,0.08)", color: C.amber }}
          >
            Sample data
          </div>
          <button style={{ padding: 6, borderRadius: 6, color: C.muted, position: "relative", background: "none", border: "none" }}>
            <Bell size={16} />
            <span style={{ position: "absolute", top: 5, right: 5, width: 6, height: 6, borderRadius: "50%", backgroundColor: C.red }} />
          </button>
          <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", borderRadius: 6, background: "none", border: "none", color: C.muted, fontSize: 13 }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", backgroundColor: C.blue, color: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>DR</div>
            Dr. Kim <ChevronDown size={13} />
          </button>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── Left sidebar nav ─────────────────────────────── */}
        <nav style={{ width: 56, backgroundColor: C.panel1, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 0", gap: 4, flexShrink: 0 }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                title={item.label}
                style={{
                  width: 38, height: 38, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                  backgroundColor: item.active ? "rgba(138,180,248,0.12)" : "transparent",
                  color: item.active ? C.blue : C.muted,
                  border: "none", cursor: "pointer",
                }}
              >
                <Icon size={17} />
              </button>
            );
          })}
          <div style={{ flex: 1 }} />
          <Link href="/" title="Back to home" style={{ width: 38, height: 38, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted }}>
            <ArrowLeft size={17} />
          </Link>
          <button title="Sign out" style={{ width: 38, height: 38, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, border: "none", background: "none", cursor: "pointer" }}>
            <LogOut size={17} />
          </button>
        </nav>

        {/* ── Queue panel ───────────────────────────────────── */}
        <div style={{ width: 300, backgroundColor: C.panel1, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
          {/* Queue header */}
          <div style={{ padding: "14px 14px 10px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontWeight: 600, fontSize: 13, color: C.text }}>Recovery Queue</span>
              <button style={{ color: C.muted, background: "none", border: "none", cursor: "pointer" }}>
                <RefreshCw size={13} />
              </button>
            </div>
            {/* Risk filter */}
            <div style={{ display: "flex", gap: 4 }}>
              {(["ALL", "HIGH", "MED", "LOW"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    flex: 1, fontSize: 10, fontWeight: 600, padding: "3px 0", borderRadius: 4, border: "none", cursor: "pointer",
                    backgroundColor: filter === f ? (f === "ALL" ? "rgba(138,180,248,0.15)" : f === "HIGH" ? "rgba(242,139,130,0.15)" : f === "MED" ? "rgba(253,214,99,0.15)" : "rgba(255,255,255,0.06)") : "rgba(255,255,255,0.04)",
                    color: filter === f ? (f === "ALL" ? C.blue : f === "HIGH" ? C.red : f === "MED" ? C.amber : C.muted) : C.muted,
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Thread list */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {filtered.map((t) => (
              <button
                key={t.id}
                onClick={() => { setSelected(t); setDraftText(`Hi ${t.name.split(" ")[0]}! Thanks for reaching out. We'd love to help — can you share a bit more about what you're looking for so we can best assist you?`); }}
                style={{
                  width: "100%", textAlign: "left", padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start",
                  borderBottom: `1px solid ${C.border}`, cursor: "pointer", border: "none",
                  backgroundColor: selected.id === t.id ? "rgba(138,180,248,0.07)" : "transparent",
                  borderLeft: selected.id === t.id ? `2px solid ${C.blue}` : "2px solid transparent",
                }}
              >
                {/* Avatar */}
                <div style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: `${t.channelColor}20`, color: t.channelColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0, position: "relative" }}>
                  {t.name.split(" ").map((n) => n[0]).join("")}
                  {t.unread && (
                    <span style={{ position: "absolute", top: -1, right: -1, width: 8, height: 8, borderRadius: "50%", backgroundColor: C.blue, border: `1.5px solid ${C.panel1}` }} />
                  )}
                </div>
                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                    <span style={{ fontSize: 12, fontWeight: t.unread ? 600 : 400, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 120 }}>{t.name}</span>
                    <span style={{ fontSize: 10, color: C.muted, flexShrink: 0 }}>{t.age}</span>
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 4 }}>{t.msg}</div>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, backgroundColor: `${riskColor[t.risk]}15`, color: riskColor[t.risk], fontWeight: 600 }}>{t.risk}</span>
                    <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, backgroundColor: "rgba(255,255,255,0.06)", color: C.muted }}>{t.tag}</span>
                    <span style={{ fontSize: 9, color: t.channelColor, marginLeft: "auto" }}>{t.channel}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Center: metrics + conversation ───────────────── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          {/* Metric cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, borderBottom: `1px solid ${C.border}`, flexShrink: 0, backgroundColor: C.border }}>
            {metrics.map((m) => {
              const Icon = m.icon;
              return (
                <div key={m.label} style={{ backgroundColor: C.panel2, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon size={13} style={{ color: m.color }} />
                    <span style={{ fontSize: 11, color: C.muted }}>{m.label}</span>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: m.color, lineHeight: 1 }}>{m.value}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{m.sub}</div>
                </div>
              );
            })}
          </div>

          {/* Conversation */}
          <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Convo header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: `${selected.channelColor}20`, color: selected.channelColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>
                  {selected.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{selected.name}</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: selected.channelColor }}>{selected.channel}</span>
                    <span style={{ fontSize: 11, color: C.muted }}>&middot;</span>
                    <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 3, backgroundColor: `${riskColor[selected.risk]}15`, color: riskColor[selected.risk], fontWeight: 600 }}>{selected.risk} risk</span>
                    <span style={{ fontSize: 11, color: C.muted }}>&middot; {selected.tag} &middot; {selected.value} potential</span>
                  </div>
                </div>
              </div>
              <button style={{ color: C.muted, background: "none", border: "none", cursor: "pointer" }}>
                <MoreHorizontal size={16} />
              </button>
            </div>

            {/* Patient message bubble */}
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: `${selected.channelColor}20`, color: selected.channelColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                {selected.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: C.text }}>{selected.name}</span>
                  <span style={{ fontSize: 11, color: C.muted }}>{selected.age} ago</span>
                </div>
                <div style={{ backgroundColor: C.panel2, border: `1px solid ${C.border}`, borderRadius: "4px 12px 12px 12px", padding: "10px 14px", fontSize: 13, color: C.text, lineHeight: 1.6, maxWidth: 480 }}>
                  {selected.fullMsg}
                </div>
              </div>
            </div>

            {/* No staff reply yet indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, height: 1, backgroundColor: C.border }} />
              <span style={{ fontSize: 11, color: C.muted, padding: "0 8px" }}>No reply yet &middot; {selected.age}</span>
              <div style={{ flex: 1, height: 1, backgroundColor: C.border }} />
            </div>
          </div>
        </div>

        {/* ── Right panel: AI draft + settings ─────────────── */}
        <div style={{ width: 280, backgroundColor: C.panel1, borderLeft: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 0, flexShrink: 0, overflowY: "auto" }}>
          {/* AI Draft */}
          <div style={{ padding: 16, borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>AI Draft</span>
              <button style={{ background: "none", border: "none", cursor: "pointer", color: C.muted }}>
                <RefreshCw size={12} />
              </button>
            </div>

            {/* Warning label */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, backgroundColor: "rgba(138,180,248,0.08)", border: `1px solid rgba(138,180,248,0.2)`, borderRadius: 6, padding: "6px 10px", marginBottom: 10 }}>
              <AlertTriangle size={11} style={{ color: C.blue, flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: C.blue, lineHeight: 1.4 }}>Draft only — staff review required</span>
            </div>

            <textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              rows={6}
              style={{ width: "100%", backgroundColor: C.panel2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 12, color: C.text, lineHeight: 1.6, resize: "none", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
            />

            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <button style={{ flex: 1, padding: "7px 0", borderRadius: 6, fontSize: 12, fontWeight: 600, backgroundColor: C.blue, color: C.bg, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                <Send size={12} /> Edit &amp; Send
              </button>
              <button style={{ padding: "7px 10px", borderRadius: 6, fontSize: 12, backgroundColor: "rgba(255,255,255,0.05)", color: C.muted, border: `1px solid ${C.border}`, cursor: "pointer" }}>
                <Trash2 size={12} />
              </button>
            </div>
          </div>

          {/* Recovery settings */}
          <div style={{ padding: 16, borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Recovery Settings</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Risk threshold", value: "Med + High", color: C.amber },
                { label: "Auto-escalate after", value: "3 hours", color: C.text },
                { label: "Assigned to", value: "Front Desk", color: C.text },
                { label: "Notification", value: "SMS + App", color: C.text },
              ].map((row) => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: C.muted }}>{row.label}</span>
                  <span style={{ fontSize: 12, color: row.color, fontWeight: 500 }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Patient context */}
          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Lead Context</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: C.muted }}>Procedure interest</span>
                <span style={{ fontSize: 12, color: C.text }}>{selected.tag}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: C.muted }}>Est. value</span>
                <span style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>{selected.value}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: C.muted }}>Channel</span>
                <span style={{ fontSize: 12, color: selected.channelColor }}>{selected.channel}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: C.muted }}>Waiting</span>
                <span style={{ fontSize: 12, color: riskColor[selected.risk], fontWeight: 600 }}>{selected.age}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: C.muted }}>Risk level</span>
                <span style={{ fontSize: 12, color: riskColor[selected.risk], fontWeight: 600 }}>{selected.risk}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
