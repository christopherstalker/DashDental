"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock3,
  Gauge,
  Inbox,
  MessageCircle,
  RadioTower,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { getPlanCatalog } from "@/domain/business-rules";
import { LocalizedText } from "@/features/i18n/components/localized-text";
import { MarketingFooter } from "@/features/marketing/components/marketing-footer";
import { MarketingLocalizedText } from "@/features/marketing/components/marketing-localized-text";
import { MarketingNav } from "@/features/marketing/components/marketing-nav";
import { RoiCalculator } from "@/features/marketing/components/roi-calculator";
import {
  integrationRows,
  primaryCta,
  secondaryCta,
} from "@/features/marketing/content/dash-dental";

const trustItems = [
  "Lead intake only",
  "Human-reviewed AI drafts",
  "No medical records required",
  "Guided pilot available",
] as const;

const consoleTabs = [
  {
    id: "queue",
    label: "Queue",
    title: "Priority recovery queue",
    metric: "12",
    metricLabel: "patients waiting",
    insight: "Emergency pain and implant consults are above SLA target.",
  },
  {
    id: "revenue",
    label: "Revenue",
    title: "Money-at-risk scanner",
    metric: "$7.8k",
    metricLabel: "planning estimate",
    insight: "Highest risk sits in cosmetic DMs and website implant forms.",
  },
  {
    id: "channels",
    label: "Channels",
    title: "Channel radar",
    metric: "4",
    metricLabel: "active sources",
    insight: "WhatsApp is urgent. Instagram is high intent. Website forms need faster callbacks.",
  },
  {
    id: "ai",
    label: "AI",
    title: "Human-reviewed AI assist",
    metric: "Draft",
    metricLabel: "staff approval required",
    insight: "AI suggests the next reply. Your team reviews before sending.",
  },
] as const;

const consoleRows = [
  {
    channel: "WhatsApp",
    initials: "EP",
    intent: "Emergency tooth pain",
    wait: "22m",
    value: "$420",
    status: "Critical",
  },
  {
    channel: "Instagram",
    initials: "MK",
    intent: "Veneers pricing",
    wait: "1h 14m",
    value: "$1,200",
    status: "High intent",
  },
  {
    channel: "Website",
    initials: "ON",
    intent: "Implant consult",
    wait: "2h",
    value: "$1,500",
    status: "High value",
  },
] as const;

const leakPoints = [
  {
    icon: MessageCircle,
    title: "Messages get buried",
    impact: "$1.2k cosmetic inquiry",
    text: "WhatsApp, Instagram, Telegram, and website forms all create patient demand. The front desk should not hunt across tabs.",
  },
  {
    icon: Clock3,
    title: "First response slips",
    impact: "38m average response",
    text: "Dash Dental turns waiting time into an operating signal before the patient books somewhere else.",
  },
  {
    icon: Gauge,
    title: "Owners see loss too late",
    impact: "$7.8k at risk today",
    text: "The owner sees leakage by channel, urgency, and estimated opportunity while the conversation is still recoverable.",
  },
] as const;

const missionFlow = [
  {
    title: "Patient message arrives",
    text: "A high-intent inquiry lands from WhatsApp, Instagram, Telegram, or a website form.",
    signal: "Inbound",
  },
  {
    title: "SLA timer starts",
    text: "Dash Dental tracks the waiting time and urgency from the first patient touch.",
    signal: "22m",
  },
  {
    title: "Risk is detected",
    text: "Urgency, treatment intent, value assumptions, and unanswered state move the thread up.",
    signal: "At risk",
  },
  {
    title: "AI drafts the reply",
    text: "The assistant summarizes intent and suggests a safe next message for staff review.",
    signal: "Draft",
  },
  {
    title: "Staff sends response",
    text: "Reception replies with appointment options and moves the patient toward booking.",
    signal: "Review",
  },
  {
    title: "Owner sees recovery",
    text: "The cockpit shows recovered conversations, response speed, and remaining leakage.",
    signal: "Recovered",
  },
] as const;

const cockpitMetrics = [
  ["Money at risk", "$7.8k", "Estimated opportunity"],
  ["Saved revenue", "$12.4k", "Marked protected"],
  ["At-risk conversations", "12", "Needs action"],
  ["First response", "38m", "Above target"],
  ["Booked patients", "21", "This month"],
] as const;

const aiBoundaries = [
  "Summarizes patient intent",
  "Drafts receptionist-safe replies",
  "Suggests next action and urgency",
  "Requires staff review before sending",
] as const;

const aiDoesNot = [
  "Make clinical decisions",
  "Promise treatment outcomes",
  "Replace patient consent",
  "Act as billing or insurance truth",
] as const;

const trustCards = [
  {
    icon: Inbox,
    title: "Lead intake only",
    text: "Built for patient inquiries, callbacks, and recovery work. It is not a full EHR.",
  },
  {
    icon: Bot,
    title: "Human-reviewed AI",
    text: "AI drafts and summaries are assistive. Your team reviews patient communications.",
  },
  {
    icon: ShieldCheck,
    title: "Trust without fake badges",
    text: "No SOC 2, HIPAA, or ISO certification is claimed unless those programs are completed.",
  },
  {
    icon: RadioTower,
    title: "Operational hardening",
    text: "Tenant-scoped workspaces, audit trails, idempotent webhooks, and billing controls support real operations.",
  },
] as const;

const pricingPlans = ["starter", "growth", "scale"] as const;

export function DashDentalHomepage() {
  const [activeFlowStep, setActiveFlowStep] = useState(2);

  return (
    <main className="dd-site dd-future-home" data-brand="dash-dental">
      <MarketingNav launchPage="/" />

      <section className="dd-future-hero" aria-labelledby="future-hero-title">
        <div aria-hidden="true" className="dd-future-bg">
          <span className="dd-orbit dd-orbit-one" />
          <span className="dd-orbit dd-orbit-two" />
          <span className="dd-orbit dd-orbit-three" />
          <span className="dd-grid-plane" />
        </div>
        <div aria-hidden="true" className="recovery-dental-backdrop dd-dental-backdrop dd-future-mark-field">
          <Image alt="" height={640} priority src="/dental-recovery-mark.svg" unoptimized width={640} />
        </div>

        <div className="dd-future-hero-copy">
          <p className="dd-future-kicker">
            <ScanLine size={16} />
            AI recovery command center for dental clinics
          </p>
          <h1 id="future-hero-title">
            <LocalizedText
              fallback="Turn missed messages into booked patients."
              k="home.hero.title"
            />
          </h1>
          <p className="dd-future-lede">
            <LocalizedText
              fallback="Dash Dental unifies WhatsApp, Instagram, Telegram, and website inquiries, detects SLA risk, and shows the revenue your team can still recover today."
              k="home.hero.body"
            />
          </p>

          <div className="dd-future-actions">
            <Link
              className="dd-future-button dd-future-button-primary"
              data-launch-event="public.home.demo_clicked"
              data-launch-page="/"
              data-launch-section="hero"
              data-launch-target="/support#request"
              href="/support#request"
            >
              <MarketingLocalizedText fallback={primaryCta} k="bookClinicDemo" />
              <ArrowRight size={16} />
            </Link>
            <Link className="dd-future-button dd-future-button-secondary" href="/demo">
              <MarketingLocalizedText fallback={secondaryCta} k="sampleDashboard" />
            </Link>
          </div>

          <p className="dd-future-microcopy">No CRM migration required. Start with one channel.</p>
          <p className="dd-hero-tertiary-cta dd-future-trial-link">
            <span>Prefer self-serve?</span>{" "}
            <Link
              data-launch-event="public.home.start_trial_clicked"
              data-launch-page="/"
              data-launch-section="hero"
              data-launch-target="/register"
              href="/register"
            >
              Start 14-day guided trial
            </Link>
          </p>

          <div className="dd-future-trust-row" aria-label="Product boundaries">
            {trustItems.map((item) => (
              <span key={item}>
                <CheckCircle2 size={14} />
                {item}
              </span>
            ))}
          </div>
        </div>

        <HeroCommandConsole />
      </section>

      <section className="dd-future-section dd-leak-section" id="product">
        <div className="dd-future-section-copy">
          <p className="dd-future-kicker">Leak map</p>
          <h2>Where clinics quietly lose revenue.</h2>
          <p>
            High-value patients ask about implants, veneers, emergencies, whitening,
            and pricing across channels. Dash Dental turns that scattered demand into
            a focused recovery mission for the front desk.
          </p>
        </div>
        <div className="dd-leak-grid">
          {leakPoints.map((point) => (
            <article className="dd-glow-card dd-leak-card" key={point.title}>
              <point.icon size={20} />
              <span>{point.impact}</span>
              <h3>{point.title}</h3>
              <p>{point.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="dd-future-section dd-mission-section">
        <div className="dd-future-section-heading">
          <p className="dd-future-kicker">Recovery flow</p>
          <h2>From hidden message to booked consult.</h2>
          <p>Hover or tap the flow to see how the recovery cockpit guides the team.</p>
        </div>

        <div className="dd-mission-grid" role="list" aria-label="Recovery workflow">
          {missionFlow.map((step, index) => {
            const active = activeFlowStep === index;

            return (
              <button
                aria-pressed={active}
                className={`dd-mission-node${active ? " is-active" : ""}`}
                key={step.title}
                onClick={() => setActiveFlowStep(index)}
                onFocus={() => setActiveFlowStep(index)}
                onMouseEnter={() => setActiveFlowStep(index)}
                type="button"
              >
                <span className="dd-mission-index">{String(index + 1).padStart(2, "0")}</span>
                <span className="dd-mission-signal">{step.signal}</span>
                <strong>{step.title}</strong>
                <small>{step.text}</small>
              </button>
            );
          })}
        </div>
      </section>

      <section className="dd-future-section dd-live-cockpit-section">
        <div className="dd-live-cockpit-panel">
          <div className="dd-cockpit-header">
            <div>
              <p className="dd-future-kicker">Live dashboard</p>
              <h2>One cockpit for owners and reception.</h2>
            </div>
            <span className="dd-sample-data-pill">Illustrative data</span>
          </div>

          <div className="dd-cockpit-metric-grid">
            {cockpitMetrics.map(([label, value, detail]) => (
              <article key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
                <small>{detail}</small>
              </article>
            ))}
          </div>

          <div className="dd-cockpit-board">
            <div className="dd-cockpit-queue">
              <div className="dd-board-title">
                <strong>Reply first</strong>
                <span>SLA risk sorted by urgency and value</span>
              </div>
              {consoleRows.map((row) => (
                <article key={row.intent}>
                  <span className="dd-avatar">{row.initials}</span>
                  <div>
                    <strong>{row.intent}</strong>
                    <small>{row.channel} - {row.wait} waiting</small>
                  </div>
                  <b>{row.value}</b>
                  <em>{row.status}</em>
                </article>
              ))}
            </div>

            <div className="dd-cockpit-ai-card">
              <Sparkles size={18} />
              <strong>Next best action</strong>
              <p>Offer the nearest appointment window, ask for a callback number, and keep the thread in staff review.</p>
              <span>Draft only - staff review required</span>
            </div>
          </div>
        </div>
      </section>

      <section className="dd-future-section dd-ai-section">
        <div className="dd-future-section-copy">
          <p className="dd-future-kicker">AI assist</p>
          <h2>Fast drafts, clear boundaries.</h2>
          <p>
            Dash Dental is designed for safe operational assistance. AI helps the
            front desk understand intent and draft a response, while humans keep control.
          </p>
        </div>
        <div className="dd-ai-boundary-grid">
          <article className="dd-ai-terminal">
            <span>
              <Sparkles size={16} />
              Suggested reply
            </span>
            <p>
              Hi Eva, we can help today. Can you confirm the best callback number
              and whether you prefer the 14:30 or 16:00 emergency slot?
            </p>
            <b>Draft only - staff review required</b>
          </article>
          <article className="dd-ai-rules">
            <div>
              <h3>AI helps with</h3>
              {aiBoundaries.map((item) => (
                <span key={item}><CheckCircle2 size={14} />{item}</span>
              ))}
            </div>
            <div>
              <h3>AI does not</h3>
              {aiDoesNot.map((item) => (
                <span key={item}><ShieldCheck size={14} />{item}</span>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="dd-future-section dd-roi-future-section">
        <div className="dd-future-section-heading">
          <p className="dd-future-kicker">Recovery estimate</p>
          <h2>See how much patient demand may still be recoverable.</h2>
          <p>
            Use conservative assumptions. Estimates are for planning only and are never
            guaranteed revenue.
          </p>
        </div>
        <RoiCalculator />
      </section>

      <section className="dd-future-section dd-integrations-future-section">
        <div className="dd-future-section-heading">
          <p className="dd-future-kicker">Signal sources</p>
          <h2>Start with one channel. Expand when the workflow is proven.</h2>
        </div>
        <div className="dd-integration-orbit-grid">
          {integrationRows.slice(0, 4).map((integration) => (
            <article className="dd-glow-card" key={integration.channel}>
              <MessageCircle size={18} />
              <strong>{integration.channel}</strong>
              <span>{integration.status}</span>
              <p>{integration.captures}</p>
              <small>{integration.setup}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="dd-future-section dd-pricing-future-section" id="pricing-preview">
        <div className="dd-future-section-heading">
          <p className="dd-future-kicker">Plans</p>
          <h2>Pick the smallest plan that proves the recovery workflow.</h2>
          <p>Growth is the natural fit once a clinic has multiple active channels.</p>
        </div>
        <div className="dd-future-plan-grid">
          {pricingPlans.map((plan) => {
            const catalog = getPlanCatalog(plan);

            return (
              <article className={plan === "growth" ? "is-recommended" : ""} key={plan}>
                {plan === "growth" ? <span className="dd-plan-orbit">Recommended</span> : null}
                <span>{catalog.label}</span>
                <strong>${catalog.monthlyPrice}/mo</strong>
                <p>{catalog.summary}</p>
                <Link href="/pricing">
                  Compare {catalog.label}
                  <ArrowRight size={14} />
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      <section className="dd-future-section dd-trust-future-section">
        <div className="dd-future-section-heading">
          <p className="dd-future-kicker">Trust center</p>
          <h2>Built for lead recovery, not risky overreach.</h2>
          <p>
            The product stays narrow: patient lead intake, response workflows,
            staff-reviewed AI drafts, audit visibility, and clear security contacts.
          </p>
        </div>
        <div className="dd-trust-future-grid">
          {trustCards.map((card) => (
            <article className="dd-glow-card" key={card.title}>
              <card.icon size={20} />
              <strong>{card.title}</strong>
              <p>{card.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="dd-final-future-cta">
        <div>
          <p className="dd-future-kicker">Launch the recovery cockpit</p>
          <h2>See how much revenue your clinic is leaking this week.</h2>
          <p>Book a guided demo or open the sample dashboard before connecting a real channel.</p>
        </div>
        <div className="dd-future-actions">
          <Link className="dd-future-button dd-future-button-primary" href="/support#request">
            {primaryCta}
            <ArrowRight size={16} />
          </Link>
          <Link className="dd-future-button dd-future-button-secondary" href="/demo">
            {secondaryCta}
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}

function HeroCommandConsole() {
  const [activeTab, setActiveTab] = useState<(typeof consoleTabs)[number]["id"]>("queue");

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveTab((current) => {
        const currentIndex = consoleTabs.findIndex((tab) => tab.id === current);
        return consoleTabs[(currentIndex + 1) % consoleTabs.length].id;
      });
    }, 4200);

    return () => window.clearInterval(timer);
  }, []);

  const active = useMemo(
    () => consoleTabs.find((tab) => tab.id === activeTab) ?? consoleTabs[0],
    [activeTab],
  );

  return (
    <aside className="dd-command-console" aria-label="Interactive Dash Dental product console">
      <div className="dd-console-glow" aria-hidden="true" />
      <div className="dd-console-scan" aria-hidden="true" />

      <div className="dd-console-topbar">
        <div>
          <span className="dd-console-status-dot" />
          <strong>Dash Dental live cockpit</strong>
        </div>
        <span className="dd-sample-data-pill">Sample data</span>
      </div>

      <div className="dd-console-tabs" role="tablist" aria-label="Console preview tabs">
        {consoleTabs.map((tab) => (
          <button
            aria-controls={`dd-console-panel-${tab.id}`}
            aria-selected={activeTab === tab.id}
            className={activeTab === tab.id ? "is-active" : ""}
            id={`dd-console-tab-${tab.id}`}
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
        aria-labelledby={`dd-console-tab-${active.id}`}
        className="dd-console-active-panel"
        id={`dd-console-panel-${active.id}`}
        role="tabpanel"
      >
        <div>
          <span>{active.title}</span>
          <strong>{active.metric}</strong>
          <small>{active.metricLabel}</small>
        </div>
        <p>{active.insight}</p>
      </section>

      <div className="dd-console-metrics">
        <article>
          <Target size={16} />
          <span>Revenue at risk</span>
          <strong>$7.8k</strong>
        </article>
        <article>
          <Inbox size={16} />
          <span>Unanswered</span>
          <strong>12</strong>
        </article>
        <article>
          <Activity size={16} />
          <span>Avg response</span>
          <strong>38m</strong>
        </article>
      </div>

      <div className="dd-console-grid">
        <section className="dd-console-queue" aria-label="Sample priority queue">
          {consoleRows.map((row) => (
            <article key={row.intent}>
              <span className="dd-avatar">{row.initials}</span>
              <div>
                <strong>{row.intent}</strong>
                <small>{row.channel} - {row.wait} waiting</small>
              </div>
              <b>{row.value}</b>
            </article>
          ))}
        </section>

        <section className="dd-console-ai">
          <span>
            <Sparkles size={15} />
            AI recommendation
          </span>
          <p>Reply now with nearest appointment options and ask for a callback number.</p>
          <b>Draft only - staff review required</b>
        </section>
      </div>

      <div className="dd-console-radar" aria-label="Channel radar">
        {["WhatsApp", "Instagram", "Website", "Telegram"].map((channel, index) => (
          <span key={channel} style={{ "--ring": index + 1 } as CSSProperties}>
            <Zap size={12} />
            {channel}
          </span>
        ))}
      </div>
    </aside>
  );
}
