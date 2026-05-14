import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock3,
  DollarSign,
  Inbox,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { getPlanCatalog } from "@/domain/business-rules";
import { MarketingFooter } from "@/features/marketing/components/marketing-footer";
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

const problemMessages = [
  ["WhatsApp", "Emergency tooth pain", "22m waiting"],
  ["Instagram", "Veneers pricing", "1h 14m waiting"],
  ["Website", "Implant consult", "2h waiting"],
  ["Telegram", "Whitening inquiry", "46m waiting"],
] as const;

const workflow = [
  {
    title: "Capture",
    text: "Bring WhatsApp, Instagram, Telegram, and website forms into one missed-message intake view.",
  },
  {
    title: "Prioritize",
    text: "Rank conversations by urgency, waiting time, channel, and estimated treatment opportunity.",
  },
  {
    title: "Recover",
    text: "Give reception a safe next action and AI draft that is reviewed before any patient reply.",
  },
] as const;

const ownerMetrics = [
  ["Money at risk today", "$7.8k", "Planning estimate"],
  ["Unanswered patients", "12", "Across active channels"],
  ["Avg first response", "38m", "Above target"],
  ["Recovered conversations", "21", "Marked protected this month"],
] as const;

const frontDeskRows = [
  ["Who to reply to first", "Sorted by urgency and waiting time"],
  ["What to say", "Safe draft with staff review required"],
  ["Why it matters", "Shows treatment opportunity and response risk"],
  ["What failed", "Delivery and channel status stay visible"],
] as const;

const trustCards = [
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
    text: "No SOC 2, HIPAA, or ISO certification is claimed unless those programs are actually completed.",
  },
] as const;

const pricingPlans = ["starter", "growth", "scale"] as const;

export function DashDentalHomepage() {
  return (
    <main className="dd-site" data-brand="dash-dental">
      <MarketingNav launchPage="/" />

      <section className="dd-home-hero">
        <div aria-hidden="true" className="recovery-dental-backdrop dd-dental-backdrop">
          <Image alt="" height={640} priority src="/dental-recovery-mark.svg" unoptimized width={640} />
        </div>
        <div className="dd-home-hero-copy">
          <h1>Stop losing implant, veneer, and emergency leads in DMs.</h1>
          <p>
            Dash Dental gives your front desk one prioritized recovery queue across
            WhatsApp, Instagram, Telegram, and website forms — with response-time risk,
            safe AI-assisted reply drafts, and owner-level recovery reports.
          </p>
          <div className="dd-hero-actions">
            <Link
              className="dd-button dd-button-primary"
              data-launch-event="public.home.demo_clicked"
              data-launch-page="/"
              data-launch-section="hero"
              data-launch-target="/support#request"
              href="/support#request"
            >
              {primaryCta}
              <ArrowRight size={16} />
            </Link>
            <Link className="dd-button dd-button-secondary" href="/demo">
              {secondaryCta}
            </Link>
          </div>
          <p className="dd-hero-microcopy">No CRM migration required. Start with one channel.</p>
          <p className="dd-hero-tertiary-cta">
            <Link href="/register">Prefer self-serve? Start the 14-day guided trial</Link>
          </p>
          <div className="dd-trust-row" aria-label="Product boundaries">
            {trustItems.map((item) => (
              <span key={item}>
                <CheckCircle2 size={14} />
                {item}
              </span>
            ))}
          </div>
        </div>

        <HeroDashboardPreview />
      </section>

      <section className="dd-section dd-problem-section">
        <div className="dd-section-copy">
          <h2>Your next high-value patient may already be waiting in your inbox.</h2>
          <p>
            Patients ask about implants, veneers, emergencies, whitening, and pricing
            across channels. The front desk is busy. Owners only see the loss after the
            patient disappears.
          </p>
        </div>
        <div className="dd-message-transform">
          <div className="dd-scattered-messages">
            {problemMessages.map(([channel, intent, wait]) => (
              <article key={intent}>
                <span>{channel}</span>
                <strong>{intent}</strong>
                <b>{wait}</b>
              </article>
            ))}
          </div>
          <div className="dd-transform-arrow">
            <ArrowRight size={18} />
          </div>
          <div className="dd-unified-queue-card">
            <span>One recovery queue</span>
            <strong>Reply order is obvious</strong>
            <p>Urgency, waiting time, value estimate, and next action in one row.</p>
          </div>
        </div>
      </section>

      <section className="dd-section dd-workflow-section" id="how-it-works">
        <div className="dd-section-heading">
          <h2>From missed message to recovered consult in three steps.</h2>
          <p>Simple enough for reception. Useful enough for owners.</p>
        </div>
        <div className="dd-workflow-grid">
          {workflow.map((step, index) => (
            <article key={step.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{step.title}</strong>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="dd-section dd-owner-section" id="product">
        <div className="dd-section-copy">
          <h2>See the revenue risk before it becomes invisible.</h2>
          <p>
            Owners do not need to inspect every inbox. Dash Dental shows where response
            time, channel leakage, and unresolved patient interest are creating risk.
          </p>
        </div>
        <div className="dd-owner-metric-grid">
          {ownerMetrics.map(([label, value, detail]) => (
            <article key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
              <p>{detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="dd-section dd-frontdesk-section">
        <div className="dd-frontdesk-panel">
          {frontDeskRows.map(([title, text]) => (
            <article key={title}>
              <CheckCircle2 size={16} />
              <div>
                <strong>{title}</strong>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="dd-section-copy">
          <h2>A front-desk workflow that does not feel like another CRM.</h2>
          <p>
            Staff see who needs attention, why it matters, what to write, and which
            messages failed. Owners see the operating pattern without turning reception
            into a financial dashboard.
          </p>
        </div>
      </section>

      <section className="dd-section dd-roi-section">
        <div className="dd-section-heading">
          <h2>Estimate the recovery value you are currently not seeing.</h2>
          <p>
            Use conservative assumptions. This is a planning estimate, not a booking
            or treatment-value promise.
          </p>
        </div>
        <RoiCalculator />
      </section>

      <section className="dd-section dd-integrations-section">
        <div className="dd-section-heading">
          <h2>Start with one channel, then add the next.</h2>
          <p>
            Most clinics should prove the recovery workflow on one patient channel
            before expanding.
          </p>
        </div>
        <div className="dd-integration-grid">
          {integrationRows.slice(0, 4).map((integration) => (
            <article key={integration.channel}>
              <MessageCircle size={18} />
              <strong>{integration.channel}</strong>
              <span>{integration.status}</span>
              <p>{integration.captures}</p>
              <small>{integration.setup}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="dd-section dd-trust-section">
        <div className="dd-section-heading">
          <h2>Security and AI boundaries are part of the product.</h2>
          <p>
            Dash Dental is designed around patient lead intake and front-desk recovery,
            not autonomous clinical decisions or unnecessary medical history storage.
          </p>
        </div>
        <div className="dd-trust-card-grid">
          {trustCards.map((card) => (
            <article key={card.title}>
              <card.icon size={20} />
              <strong>{card.title}</strong>
              <p>{card.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="dd-section dd-pricing-teaser">
        <div className="dd-section-heading">
          <h2>Choose the smallest plan that proves the recovery workflow.</h2>
          <p>Growth is the most natural fit once a clinic has multiple active channels.</p>
        </div>
        <div className="dd-plan-strip">
          {pricingPlans.map((plan) => {
            const catalog = getPlanCatalog(plan);

            return (
              <article className={plan === "growth" ? "recommended" : ""} key={plan}>
                <span>{catalog.label}</span>
                <strong>${catalog.monthlyPrice}/mo</strong>
                <p>{catalog.summary}</p>
                {plan === "growth" ? <b>Recommended</b> : null}
              </article>
            );
          })}
        </div>
        <Link className="dd-button dd-button-secondary" href="/pricing">
          Compare plans
        </Link>
      </section>

      <section className="dd-final-cta">
        <div>
          <h2>Find the patients your inbox is losing.</h2>
          <p>No CRM migration required. Start with one channel and a guided pilot.</p>
        </div>
        <div className="dd-hero-actions">
          <Link className="dd-button dd-button-primary" href="/support#request">
            {primaryCta}
            <ArrowRight size={16} />
          </Link>
          <Link className="dd-button dd-button-secondary" href="/demo">
            {secondaryCta}
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}

function HeroDashboardPreview() {
  return (
    <aside className="dd-hero-dashboard" aria-label="Dash Dental cockpit preview">
      <div className="dd-preview-topbar">
        <div className="dd-preview-brand">
          <Image alt="" height={160} src="/dental-recovery-mark.svg" unoptimized width={160} />
          <span>Dash Dental cockpit</span>
        </div>
        <span className="dd-sample-badge">Sample data</span>
      </div>

      <div className="dd-preview-metrics dd-preview-metrics-hero">
        <article>
          <DollarSign size={16} />
          <span>Money at risk today</span>
          <strong className="tabular-nums">$7.8k</strong>
        </article>
        <article>
          <Inbox size={16} />
          <span>Unanswered patients</span>
          <strong className="tabular-nums">12</strong>
        </article>
        <article>
          <Clock3 size={16} />
          <span>Avg first response</span>
          <strong className="tabular-nums">38m</strong>
        </article>
        <article>
          <CheckCircle2 size={16} />
          <span>Recovered conversations</span>
          <strong className="tabular-nums">21</strong>
        </article>
        <article>
          <MessageCircle size={16} />
          <span>Active channels</span>
          <strong className="tabular-nums">4</strong>
        </article>
      </div>

      <div className="dd-preview-body">
        <section className="dd-preview-queue">
          <div>
            <span>Priority recovery queue</span>
            <b>Review first</b>
          </div>
          {[
            ["WA", "Emergency tooth pain", "22m", "$420"],
            ["IG", "Veneers pricing", "1h 14m", "$1,200"],
            ["WF", "Implant consult", "2h", "$1,500"],
            ["TG", "Whitening inquiry", "46m", "$180"],
          ].map(([channel, intent, wait, value]) => (
            <article key={intent}>
              <span>{channel}</span>
              <strong>{intent}</strong>
              <small>{wait} waiting</small>
              <b>{value}</b>
            </article>
          ))}
        </section>

        <section className="dd-preview-draft">
          <span>
            <Sparkles size={15} />
            AI draft panel
          </span>
          <p>
            Thanks for reaching out. Our front desk can help today. Can you confirm
            the best callback number?
          </p>
          <b>Draft only — staff review required</b>
        </section>
      </div>

      <div className="dd-preview-channels">
        {["WhatsApp", "Instagram", "Telegram", "Website forms"].map((channel) => (
          <span key={channel}>{channel}</span>
        ))}
      </div>
    </aside>
  );
}
