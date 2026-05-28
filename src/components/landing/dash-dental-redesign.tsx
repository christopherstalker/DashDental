"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  Bot,
  Check,
  CheckCircle2,
  FileText,
  History,
  Inbox,
  Lock,
  MessageCircle,
  MousePointer2,
  Play,
  Send,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { PublicAccountCta } from "@/components/marketing/public-account-cta";
import { ThemeColorPicker } from "@/components/ui/theme-color-picker";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  integrationRows,
  ownerDashboardMetrics,
  pilotCta,
  primaryCta,
  sampleConversations,
  secondaryCta,
  workflowSteps,
} from "@/features/marketing/content/dash-dental";

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
    description: "For one front desk team running the unified inbox.",
    features: ["All core channels", "4 seats", "Saved replies", "Weekly owner digest"],
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

const legacyTrustItems = [
  "Lead intake only",
  "Human-reviewed AI drafts",
  "No medical records required",
  "Guided launch available",
] as const;

const frontDeskRows = [
  ["Who to reply to first", "Sorted by urgency, waiting time, and estimated patient value"],
  ["What to say", "Safe AI draft with staff review required before sending"],
  ["Why it matters", "Shows treatment opportunity, response risk, and ownership"],
  ["What failed", "Delivery and channel status stay visible for follow-up"],
] as const;

const trustBoundaryCards = [
  {
    icon: Inbox,
    title: "Lead intake only",
    text: "Dash Dental is for inbound inquiries, callbacks, and recovery work. It is not a full EHR.",
  },
  {
    icon: Bot,
    title: "Human-reviewed AI",
    text: "AI can summarize and draft replies. Staff review is required before sending patient communications.",
  },
  {
    icon: ShieldCheck,
    title: "No fake compliance badges",
    text: "Security controls are described honestly. No SOC 2, HIPAA, or ISO certification is claimed unless completed.",
  },
] as const;

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
            <Image alt="" height={52} src="/dental-recovery-mark.png" unoptimized width={52} />
          </span>
          <span>Dash Dental</span>
        </Link>
        <div className="ddr-landing-links">
          <a href="#product">Product</a>
          <a href="#how-it-works">How it works</a>
          <Link href="/demo">Demo</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/security">Security</Link>
          <Link href="/support">Support</Link>
        </div>
        <div className="ddr-landing-actions">
          <ThemeColorPicker />
          <ThemeToggle />
          <PublicAccountCta className="ddr-button ddr-button-primary" />
        </div>
      </nav>

      <section className="ddr-section ddr-hero">
        <div>
          <span className="ddr-tag">Live release - 12 clinics onboard</span>
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
            <PublicAccountCta
              className="ddr-button ddr-button-primary"
              signedInLabel="Open account"
              showArrow
            />
            <Link className="ddr-button ddr-button-ghost" href="/demo">
              See demo
              <Play size={15} />
            </Link>
          </div>
          <p className="ddr-legacy-hero-note">
            Stop losing implant, veneer, emergency, whitening, and pricing leads in scattered DMs. No CRM migration required.
          </p>
          <div className="ddr-trust-row" aria-label="Product boundaries">
            {legacyTrustItems.map((item) => (
              <span key={item}>
                <CheckCircle2 size={14} />
                {item}
              </span>
            ))}
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

      <section className="ddr-section ddr-problem-grid" id="product">
        <div className="ddr-section-heading">
          <h2>Your next high-value patient may already be waiting in your inbox.</h2>
          <p>
            Patients ask about implants, veneers, emergencies, whitening, and pricing across channels.
            The front desk is busy. Owners only see the loss after the patient disappears.
          </p>
        </div>
        <div className="ddr-message-stack">
          {sampleConversations.map((conversation) => (
            <article className="ddr-card ddr-message-card" key={conversation.intent}>
              <span className="ddr-channel-dot whatsapp">{conversation.initials}</span>
              <div>
                <strong>{conversation.intent}</strong>
                <p>
                  {conversation.channel} - {conversation.waiting}
                </p>
              </div>
              <b>{conversation.value}</b>
            </article>
          ))}
        </div>
        <article className="ddr-card ddr-transform-card">
          <span className="ddr-feature-icon">
            <ArrowRight size={18} />
          </span>
          <h3>One recovery queue</h3>
          <p>Urgency, waiting time, estimated value, assigned owner, and next action in one row.</p>
        </article>
      </section>

      <section className="ddr-section" id="how-it-works">
        <div className="ddr-section-heading">
          <h2>From missed message to recovered consult in three steps.</h2>
          <p>Simple enough for reception. Useful enough for owners.</p>
        </div>
        <div className="ddr-workflow-grid">
          {workflowSteps.map((step, index) => (
            <article className="ddr-card ddr-workflow-card" key={step.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{step.title}</strong>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ddr-section ddr-owner-grid">
        <div className="ddr-section-heading">
          <h2>See the revenue risk before it becomes invisible.</h2>
          <p>
            Owners do not need to inspect every inbox. Dash Dental shows where response time,
            channel leakage, and unresolved patient interest are creating risk.
          </p>
        </div>
        <div className="ddr-owner-metrics">
          {ownerDashboardMetrics.map((metric) => (
            <article className="ddr-card ddr-owner-metric" key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <p>{metric.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ddr-section ddr-frontdesk-grid">
        <div className="ddr-card ddr-frontdesk-list">
          {frontDeskRows.map(([title, text]) => (
            <article key={title}>
              <CheckCircle2 size={17} />
              <div>
                <strong>{title}</strong>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="ddr-section-heading">
          <h2>A front-desk workflow that does not feel like another CRM.</h2>
          <p>
            Staff see who needs attention, why it matters, what to write, and which messages failed.
            Owners see the operating pattern without turning reception into a financial dashboard.
          </p>
          <div className="ddr-hero-actions">
            <Link className="ddr-button ddr-button-primary" href="/demo">
              {secondaryCta}
              <ArrowRight size={15} />
            </Link>
          </div>
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
                A lightweight walkthrough shows the receptionist flow from missed DM to booked appointment.
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

      <section className="ddr-section">
        <div className="ddr-section-heading">
          <h2>Start with one channel, then add the next.</h2>
          <p>
            Most clinics should prove the recovery workflow on one patient channel before expanding setup.
          </p>
        </div>
        <div className="ddr-integration-grid">
          {integrationRows.map((integration) => (
            <article className="ddr-card ddr-integration-card" key={integration.channel}>
              <span className="ddr-feature-icon">
                <MessageCircle size={18} />
              </span>
              <div>
                <strong>{integration.channel}</strong>
                <span className="ddr-badge ddr-badge-info">{integration.status}</span>
              </div>
              <p>{integration.captures}</p>
              <small>{integration.setup}</small>
            </article>
          ))}
        </div>
        <div className="ddr-section-actions">
          <Link className="ddr-button ddr-button-ghost" href="/integrations-guide">
            View integration guide
            <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      <section className="ddr-section ddr-before-after">
        <div className="ddr-section-heading">
          <h2>Before and after the rollout</h2>
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
          <h2>Security and AI boundaries are part of the product.</h2>
          <p>
            Dash Dental is designed around patient lead intake and front-desk recovery,
            not autonomous clinical decisions or unnecessary medical history storage.
          </p>
        </div>
        <div className="ddr-trust-card-grid">
          {trustBoundaryCards.map((card) => {
            const Icon = card.icon;

            return (
              <article className="ddr-card ddr-trust-card" key={card.title}>
                <span className="ddr-feature-icon">
                  <Icon size={18} />
                </span>
                <strong>{card.title}</strong>
                <p>{card.text}</p>
              </article>
            );
          })}
        </div>
        <div className="ddr-section-actions">
          <Link className="ddr-button ddr-button-ghost" href="/security">
            Read security and trust
            <ArrowRight size={15} />
          </Link>
        </div>
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
            <h2>Release pricing for growing clinics</h2>
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
                <Link className="ddr-button ddr-button-primary" href="/register">
                  Create account
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      <section className="ddr-section ddr-cta ddr-card" id="trial">
        <TrendingUp size={24} />
        <h2>Turn missed DMs into booked treatment.</h2>
        <p>Create a workspace and get the receptionist workflow live before your next busy week.</p>
        <div className="ddr-final-cta-actions">
          <Link className="ddr-button ddr-button-primary" href="/demo/start">
            {primaryCta}
            <ArrowRight size={15} />
          </Link>
          <Link className="ddr-button ddr-button-ghost" href="/register">
            {pilotCta}
          </Link>
        </div>
      </section>

      <footer className="ddr-footer">
        <span>Dash Dental (c) 2025</span>
        <nav aria-label="Footer links">
          <a href="#product">Product</a>
          <a href="#how-it-works">How it works</a>
          <Link href="/demo/start">Demo</Link>
          <Link href="/integrations-guide">Integrations</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/security">Security</Link>
          <Link href="/support">Support</Link>
        </nav>
      </footer>
    </main>
  );
}
