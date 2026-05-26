"use client";

import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  Check,
  FileText,
  History,
  Lock,
  MessageCircle,
  MousePointer2,
  Play,
  Send,
  TrendingUp,
  UserCheck,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const formatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
  style: "currency",
  currency: "USD",
});

const featureCards = [
  {
    icon: UserCheck,
    title: "Assign every patient thread",
    description:
      "Receptionists see who owns each conversation, with handoff notes and SLA pressure visible before opening the thread.",
  },
  {
    icon: BellRing,
    title: "SLA alerts that reach the browser",
    description:
      "Push and sound alerts fire when high-intent WhatsApp or Instagram inquiries cross your clinic response threshold.",
  },
  {
    icon: History,
    title: "Returning patient history",
    description:
      "Dash Dental recognizes repeat patients and keeps prior conversations, last appointment context, and channel history together.",
  },
  {
    icon: FileText,
    title: "Templates, bulk actions, and reminders",
    description:
      "Saved replies, mark booked, archive, snooze, and tomorrow callback reminders are built into the same queue.",
  },
];

const comparisonRows = [
  ["Response time", "Manual", "Slow triage", "SLA-first queue"],
  ["Team assignment", "One phone owner", "Forwarded threads", "Named owner per patient"],
  ["SLA alerts", "No", "No", "Push + sound"],
  ["Patient history", "Fragmented", "Search inbox", "Repeat patient drawer"],
  ["Bulk actions", "Limited", "Manual labels", "Booked, snooze, archive"],
  ["Analytics", "Basic", "After-the-fact", "Owner digest + live KPIs"],
];

const plans = [
  {
    name: "Starter",
    monthly: 30,
    description: "For one front desk team validating the unified inbox.",
    features: ["2 channels", "3 seats", "Saved replies", "Weekly owner digest"],
  },
  {
    name: "Pro",
    monthly: 100,
    description: "For busy clinics using WhatsApp and Instagram daily.",
    features: ["All channels", "SLA alerts", "Bulk actions", "Patient history", "Guided onboarding"],
    popular: true,
  },
  {
    name: "Enterprise",
    monthly: 250,
    description: "For multi-location groups with custom operations.",
    features: ["White-label option", "Partner API keys", "Webhook health", "Priority support"],
  },
];

export function DashDentalRedesignLanding() {
  const [mode, setMode] = useState<"before" | "after">("after");
  const [dmCount, setDmCount] = useState(180);
  const [appointmentValue, setAppointmentValue] = useState(420);
  const [annual, setAnnual] = useState(false);
  const missedPerMonth = useMemo(
    () => Math.round(dmCount * 4.33 * 0.4 * 0.18 * appointmentValue),
    [dmCount, appointmentValue],
  );

  return (
    <main className="ddr-reset ddr-landing">
      <nav className="ddr-landing-nav" aria-label="Main navigation">
        <Link className="ddr-logo" href="/">
          <span className="ddr-logo-mark" aria-hidden="true">
            <MessageCircle size={17} />
          </span>
          <span>Dash Dental</span>
        </Link>
        <div className="ddr-landing-links">
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="#blog">Blog</a>
        </div>
        <div className="ddr-landing-actions">
          <ThemeToggle />
          <a className="ddr-button ddr-button-primary" href="#trial">
            Start free trial
          </a>
        </div>
      </nav>

      <section className="ddr-section ddr-hero">
        <div>
          <span className="ddr-tag">Now in beta · 12 clinics onboard</span>
          <h1>
            Never miss another
            <br />
            {" "}
            <span>patient inquiry</span>
          </h1>
          <p>
            Dash Dental brings WhatsApp, Instagram DMs, and clinic messages into one fast workspace for reception teams.
          </p>
          <div className="ddr-hero-actions">
            <a className="ddr-button ddr-button-primary" href="#trial">
              Get early access
              <ArrowRight size={15} />
            </a>
            <a className="ddr-button ddr-button-ghost" href="#demo">
              See demo
              <Play size={15} />
            </a>
          </div>
        </div>

        <div className="ddr-hero-visual" aria-label="Dash Dental inbox preview">
          <div className="ddr-card ddr-inbox-mockup">
            <div className="ddr-mock-sidebar">
              <div className="ddr-mock-search" />
              {[
                ["whatsapp", "Mila K.", "Implant consult today?", "4m", "urgent"],
                ["instagram", "Daniel R.", "Price for whitening", "11m", "warm"],
                ["whatsapp", "Ava P.", "Can I book tomorrow?", "18m", ""],
                ["web_form", "Noah S.", "New website form", "31m", ""],
              ].map(([channel, name, text, time, state]) => (
                <div
                  className={`ddr-mock-thread ${state === "urgent" ? "is-urgent" : ""} ${
                    state === "warm" ? "is-warm" : ""
                  }`}
                  key={name}
                >
                  <span className={`ddr-channel-dot ${channel}`}>{channel.slice(0, 2).toUpperCase()}</span>
                  <div>
                    <strong>{name}</strong>
                    <span>{text}</span>
                  </div>
                  <span className={state === "urgent" ? "ddr-badge ddr-badge-alert" : "ddr-row-time"}>
                    {time}
                  </span>
                </div>
              ))}
            </div>
            <div className="ddr-mock-main">
              <div className="ddr-mock-header">
                <div>
                  <strong>Mila K.</strong>
                  <span className="ddr-badge ddr-badge-alert">SLA 2 min</span>
                </div>
                <span className="ddr-badge ddr-badge-ok">Assigned to Anna</span>
              </div>
              <div className="ddr-mock-messages">
                <div className="ddr-mock-bubble in">Hi, do you have implant consultation slots this week?</div>
                <div className="ddr-mock-bubble out">Yes, we can offer today at 16:30 or tomorrow morning.</div>
                <div className="ddr-mock-bubble in">Today works. Can you send the address?</div>
              </div>
              <div className="ddr-mock-note">
                <span className="ddr-note-label">
                  <Lock size={13} />
                  Team-only note
                </span>
                Patient asked about implants last month. Mention financing.
              </div>
              <div className="ddr-mock-composer">
                <span />
                <button className="ddr-icon-button" type="button" aria-label="Send preview">
                  <Send size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="ddr-proof-bar">
        <div className="ddr-proof-inner">
          <p>Trusted by clinics in Kyiv, Warsaw, and Austin</p>
          <div className="ddr-avatar-stack" aria-hidden="true">
            <span className="ddr-avatar">OR</span>
            <span className="ddr-avatar">SK</span>
            <span className="ddr-avatar">ND</span>
          </div>
        </div>
      </section>

      <section className="ddr-section" id="blog">
        <div className="ddr-stat-grid">
          {[
            ["40%", "of DMs go unanswered"],
            ["3.2h", "average clinic response time"],
            ["$480", "lost per missed patient/month"],
          ].map(([value, label]) => (
            <article className="ddr-card ddr-stat-card" key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="ddr-section" id="features">
        <div className="ddr-section-heading">
          <h2>Built for reception teams who move fast</h2>
          <p>One interface for ownership, patient context, reminders, and owner visibility.</p>
        </div>
        <div className="ddr-feature-grid">
          <article className="ddr-card ddr-feature-card hero" id="demo">
            <div>
              <span className="ddr-feature-icon">
                <Zap size={18} />
              </span>
              <h3>60-second Loom walkthrough</h3>
              <p>
                A lightweight beta screencast shows the receptionist flow from missed DM to booked appointment.
              </p>
              <div className="ddr-hero-actions">
                <button className="ddr-button ddr-button-ghost" type="button">
                  Watch walkthrough
                  <Play size={15} />
                </button>
              </div>
            </div>
            <div className="ddr-mini-screen" aria-hidden="true">
              {["SLA alert", "Assign to Anna", "Insert pricing template"].map((label, index) => (
                <div className="ddr-mini-row" key={label}>
                  <span className="ddr-feature-icon">
                    {index === 0 ? <BellRing size={16} /> : index === 1 ? <UserCheck size={16} /> : <MousePointer2 size={16} />}
                  </span>
                  <div>
                    <strong>{label}</strong>
                    <span>Reception workflow step {index + 1}</span>
                  </div>
                  <span className={index === 0 ? "ddr-badge ddr-badge-alert" : "ddr-badge ddr-badge-ok"}>
                    Live
                  </span>
                </div>
              ))}
            </div>
          </article>
          {featureCards.map((feature) => {
            const FeatureIcon = feature.icon;

            return (
              <article className="ddr-card ddr-feature-card" key={feature.title}>
                <span className="ddr-feature-icon">
                  <FeatureIcon size={18} />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="ddr-section ddr-before-after">
        <div className="ddr-section-heading">
          <h2>Before and after the beta rollout</h2>
          <p>One clinic moved from scattered phones to a shared queue with owner visibility in week one.</p>
        </div>
        <div className="ddr-toggle" role="group" aria-label="Before and after selector">
          <button aria-pressed={mode === "before"} onClick={() => setMode("before")} type="button">
            Before Dash Dental
          </button>
          <button aria-pressed={mode === "after"} onClick={() => setMode("after")} type="button">
            After
          </button>
        </div>
        <article className="ddr-card ddr-comparison-card" key={mode}>
          <h3>{mode === "before" ? "Scattered channels, slow ownership" : "Unified queue, faster booking"}</h3>
          <p>
            {mode === "before"
              ? "Instagram requests were handled after calls slowed down, and WhatsApp stayed on one receptionist's phone."
              : "Receptionists now assign ownership, use saved templates, and snooze callbacks without losing the thread."}
          </p>
          <div className="ddr-comparison-stats">
            {(mode === "before"
              ? [
                  ["41%", "unanswered Instagram DMs"],
                  ["3.2h", "average first response"],
                  ["18", "missed bookings/month"],
                ]
              : [
                  ["12%", "unanswered Instagram DMs"],
                  ["24m", "average first response"],
                  ["31", "extra bookings/month"],
                ]
            ).map(([value, label]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="ddr-section">
        <div className="ddr-section-heading">
          <h2>WhatsApp Business and email are not a clinic workspace</h2>
          <p>Dash Dental gives front desk teams assignment, SLA context, and owner reporting in one place.</p>
        </div>
        <div className="ddr-table-wrap">
          <table className="ddr-table">
            <thead>
              <tr>
                <th>Workflow</th>
                <th>WhatsApp Business</th>
                <th>Email</th>
                <th className="highlight">Dash Dental</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, index) => (
                    <td className={index === 3 ? "highlight" : ""} key={`${row[0]}-${index}`}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="ddr-section">
        <div className="ddr-section-heading">
          <h2>ROI calculator</h2>
          <p>Estimate monthly lost revenue from unanswered patient DMs before you change the process.</p>
        </div>
        <div className="ddr-roi-grid">
          <div className="ddr-card ddr-roi-controls">
            <div className="ddr-slider">
              <label htmlFor="dm-count">
                <span>DMs per week</span>
                <strong>{dmCount}</strong>
              </label>
              <input
                id="dm-count"
                max={600}
                min={20}
                onChange={(event) => setDmCount(Number(event.target.value))}
                type="range"
                value={dmCount}
              />
            </div>
            <div className="ddr-slider">
              <label htmlFor="appointment-value">
                <span>Avg appointment value $</span>
                <strong>{appointmentValue}</strong>
              </label>
              <input
                id="appointment-value"
                max={1500}
                min={100}
                onChange={(event) => setAppointmentValue(Number(event.target.value))}
                step={20}
                type="range"
                value={appointmentValue}
              />
            </div>
          </div>
          <div className="ddr-card ddr-roi-output" aria-live="polite">
            <span>You are losing approximately</span>
            <strong>{formatter.format(missedPerMonth)}/month</strong>
            <span>Assumes 40% missed DMs and 18% of missed patients would book.</span>
          </div>
        </div>
      </section>

      <section className="ddr-section" id="pricing">
        <div className="ddr-pricing-header">
          <div className="ddr-section-heading">
            <h2>Pricing that matches beta speed</h2>
            <p>Annual billing includes a 17% discount. Guided onboarding is available for $200-500.</p>
          </div>
          <div className="ddr-toggle" role="group" aria-label="Billing cadence">
            <button aria-pressed={!annual} onClick={() => setAnnual(false)} type="button">
              Monthly
            </button>
            <button aria-pressed={annual} onClick={() => setAnnual(true)} type="button">
              Annual -17%
            </button>
          </div>
        </div>
        <div className="ddr-pricing-grid">
          {plans.map((plan) => {
            const monthly = annual ? Math.round(plan.monthly * 0.83) : plan.monthly;

            return (
              <article
                className={`ddr-card ddr-pricing-card ${plan.popular ? "featured" : ""}`}
                key={plan.name}
              >
                {plan.popular ? <span className="ddr-badge ddr-badge-ok">Most popular</span> : null}
                <h3>{plan.name}</h3>
                <p>{plan.description}</p>
                <div className="ddr-price">
                  {formatter.format(monthly)}
                  <span>/mo</span>
                </div>
                <ul className="ddr-feature-list">
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      <Check size={15} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <a className="ddr-button ddr-button-primary" href="#trial">
                  Start free trial
                </a>
              </article>
            );
          })}
        </div>
      </section>

      <section className="ddr-section ddr-cta ddr-card" id="trial">
        <TrendingUp size={24} />
        <h2>Turn missed DMs into booked treatment.</h2>
        <p>Join the beta and get the receptionist workflow live before your next busy week.</p>
        <a className="ddr-button ddr-button-primary" href="mailto:founder@dashdental.space">
          Get early access
        </a>
      </section>

      <footer className="ddr-footer">
        <span>Dash Dental © 2025</span>
        <nav aria-label="Footer links">
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="mailto:founder@dashdental.space">Contact</a>
        </nav>
      </footer>
    </main>
  );
}
