import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  HelpCircle,
  Inbox,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { getPlanCatalog, getPlanLimits } from "@/domain/business-rules";
import type { Subscription } from "@/domain/types";
import { LocalizedText } from "@/features/i18n/components/localized-text";
import { MarketingFooter } from "@/features/marketing/components/marketing-footer";
import { MarketingLocalizedText } from "@/features/marketing/components/marketing-localized-text";
import { MarketingNav } from "@/features/marketing/components/marketing-nav";
import { SampleRecoveryDashboard } from "@/features/marketing/components/sample-recovery-dashboard";
import {
  pilotCta,
  primaryCta,
  pricingFaqs,
  secondaryCta,
} from "@/features/marketing/content/dash-dental";

export const metadata: Metadata = {
  title: "Pricing — Dash Dental",
  description:
    "Compare Dash Dental plans for missed-message recovery, owner money-at-risk reporting, safe AI-assisted drafts, and guided clinic onboarding.",
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    title: "Pricing — Dash Dental",
    description:
      "Plans for dental clinics that want to recover unanswered patient messages without replacing their CRM.",
    url: "/pricing",
  },
};

const plans: Subscription["plan"][] = ["starter", "growth", "scale"];

const planPositioning: Record<
  Subscription["plan"],
  {
    bestFor: string;
    description: string;
    includes: string[];
  }
> = {
  starter: {
    bestFor: "Solo clinic testing missed-message recovery",
    description:
      "A focused pilot for one clinic that wants to prove the recovery queue with one front-desk team before adding more channels.",
    includes: [
      "Shared recovery inbox and owner dashboard",
      "Money-at-risk estimate with sample treatment assumptions",
      "Safe AI summaries and draft replies for human review",
      "Guided first-channel setup",
    ],
  },
  growth: {
    bestFor: "Busy clinic with multiple channels",
    description:
      "For clinics handling real volume across patient DMs, website forms, and receptionist follow-up work.",
    includes: [
      "More connected channels, seats, and monthly messages",
      "Owner reports for unanswered patients and response-time risk",
      "Team roles for reception, managers, and owner visibility",
      "Priority launch support for daily front-desk adoption",
    ],
  },
  scale: {
    bestFor: "Multi-location or high-volume front desk",
    description:
      "For clinic groups that need higher capacity, more locations, and a leadership view across recovery operations.",
    includes: [
      "Higher message and AI usage limits",
      "Multi-location operating view",
      "Concierge onboarding for rollout planning",
      "Priority support for operational questions",
    ],
  },
};

const comparisonRows = [
  {
    label: "Best for",
    starter: "Solo clinic pilot",
    growth: "Busy clinic",
    scale: "Multi-location team",
  },
  {
    label: "Clinic locations",
    starter: "1",
    growth: "1 busy location",
    scale: "Multiple locations",
  },
  {
    label: "Monthly conversations",
    starter: "2,000",
    growth: "10,000",
    scale: "40,000",
  },
  {
    label: "Connected channels",
    starter: "2",
    growth: "5",
    scale: "12",
  },
  {
    label: "Recovery queue",
    starter: "Included",
    growth: "Included",
    scale: "Included",
  },
  {
    label: "Money-at-risk dashboard",
    starter: "Included",
    growth: "Included",
    scale: "Included",
  },
  {
    label: "AI-assisted reply drafts",
    starter: "120 runs/mo",
    growth: "600 runs/mo",
    scale: "2,500 runs/mo",
  },
  {
    label: "Owner reports",
    starter: "Weekly summary",
    growth: "Weekly plus channel view",
    scale: "Leadership rollout view",
  },
  {
    label: "Team roles",
    starter: "4 seats",
    growth: "10 seats",
    scale: "30 seats",
  },
  {
    label: "Priority support",
    starter: "Business-day support",
    growth: "Priority launch support",
    scale: "Priority rollout support",
  },
  {
    label: "Concierge onboarding",
    starter: "Guided checklist",
    growth: "Guided setup",
    scale: "Rollout planning",
  },
] as const;

export default function PricingPage() {
  return (
    <main className="recovery-landing pricing-page dash-marketing">
      <section className="recovery-hero pricing-hero">
        <MarketingNav launchPage="/pricing" />
        <div className="pricing-hero-shell">
          <div className="pricing-hero-copy">
            <span className="recovery-beta-badge">
              <LocalizedText fallback="Pricing that sells recovered revenue" k="pricing.hero.kicker" />
            </span>
            <h1>
              <LocalizedText
                fallback="Choose the missed-message recovery plan your clinic can actually use."
                k="pricing.hero.title"
              />
            </h1>
            <p>
              <LocalizedText
                fallback="Keep your existing systems. Dash Dental sits on top of patient channels and shows which conversations are costing appointments today."
                k="pricing.hero.body"
              />
            </p>
            <div className="recovery-hero-actions">
              <Link className="recovery-primary-button" href="/support#request">
                <MarketingLocalizedText fallback={primaryCta} k="bookClinicDemo" />
                <ArrowRight size={16} />
              </Link>
              <Link className="recovery-secondary-button" href="/demo">
                <MarketingLocalizedText fallback={secondaryCta} k="sampleDashboard" />
              </Link>
              <Link className="recovery-ghost-button" href="/register">
                <LocalizedText fallback="Start 14-day guided trial" k="common.cta.startTrial3" />
              </Link>
            </div>
            <div className="recovery-proof-strip">
              <span><LocalizedText fallback="14-day guided trial" k="pricing.hero.proofTrial" /></span>
              <span><LocalizedText fallback="Launch onboarding included" k="pricing.hero.proofOnboarding" /></span>
              <span><MarketingLocalizedText fallback="Human-reviewed AI drafts" k="humanReviewedAi" /></span>
            </div>
          </div>
          <SampleRecoveryDashboard compact />
        </div>
      </section>

      <section className="recovery-section recovery-pricing-section" id="plans">
        <div className="recovery-section-heading compact">
          <p className="recovery-kicker">Plans</p>
          <h2>Simple pricing for clinics that want recovery work visible.</h2>
          <p>
            Demo and sample-dashboard paths stay available before registration, so the
            first step does not have to be creating an account.
          </p>
        </div>
        <div className="recovery-price-grid">
          {plans.map((plan) => (
            <PricingCard key={plan} plan={plan} />
          ))}
        </div>
      </section>

      <section className="recovery-section pricing-clarity-section">
        <div className="recovery-section-heading">
          <p className="recovery-kicker">What you are buying</p>
          <h2>Missed-message recovery, not another bloated CRM migration.</h2>
          <p>
            The subscription gives the front desk one prioritized queue and gives owners
            a clear view of unanswered patients, response-time risk, and estimated money
            at risk. Estimates are planning signals, not booking or treatment-value promises.
          </p>
        </div>
        <div className="pricing-clarity-grid">
          {[
            {
              icon: Inbox,
              title: "One recovery queue",
              text: "WhatsApp, Instagram, Telegram, and website leads can be triaged from one working surface.",
            },
            {
              icon: CircleDollarSign,
              title: "Owner money-at-risk view",
              text: "See which conversations need action before the opportunity becomes invisible.",
            },
            {
              icon: Sparkles,
              title: "Safe AI assistance",
              text: "AI can summarize and draft. Your team reviews and sends patient communications.",
            },
            {
              icon: ShieldCheck,
              title: "Clear privacy boundaries",
              text: "Lead intake only. Do not store unnecessary medical records in Dash Dental.",
            },
          ].map((item) => (
            <article className="pricing-clarity-card" key={item.title}>
              <item.icon size={19} />
              <strong>{item.title}</strong>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="recovery-section pricing-comparison-section">
        <div className="recovery-section-heading">
          <p className="recovery-kicker">Plan comparison</p>
          <h2>Pick by front-desk pressure, not by vague software tiers.</h2>
        </div>
        <div className="comparison-table-wrap">
          <table className="pricing-comparison-table">
            <thead>
              <tr>
                <th scope="col">Feature</th>
                <th scope="col">Starter</th>
                <th scope="col">Growth</th>
                <th scope="col">Scale</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  <td>{row.starter}</td>
                  <td>{row.growth}</td>
                  <td>{row.scale}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="pricing-limit-note">
          Over-limit usage is surfaced before it becomes confusing: paid actions can be
          paused safely while owners review plan limits, billing status, or a manual upgrade.
        </p>
      </section>

      <section className="recovery-section recovery-trust-section">
        <div className="recovery-section-heading">
          <p className="recovery-kicker">Pricing questions</p>
          <h2>Answers before a clinic owner approves the pilot.</h2>
        </div>
        <div className="recovery-faq-grid">
          {pricingFaqs.map((item) => (
            <details className="recovery-faq-card" key={item.question}>
              <summary>
                <HelpCircle size={16} />
                <span className="recovery-faq-question">{item.question}</span>
              </summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="recovery-section dash-final-cta">
        <div>
          <CheckCircle2 size={22} />
          <h2>Need help choosing?</h2>
          <p>Book a 15-min clinic demo or try the sample dashboard before signup.</p>
        </div>
        <div className="recovery-hero-actions">
          <Link className="recovery-primary-button" href="/support#request">
            <MarketingLocalizedText fallback={primaryCta} k="bookClinicDemo" />
            <ArrowRight size={16} />
          </Link>
          <Link className="recovery-secondary-button" href="/demo">
            <MarketingLocalizedText fallback={secondaryCta} k="sampleDashboard" />
          </Link>
          <Link className="recovery-ghost-button" href="/register">
            <LocalizedText fallback={pilotCta} k="common.cta.startTrial3" />
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}

function PricingCard({ plan }: { plan: Subscription["plan"] }) {
  const catalog = getPlanCatalog(plan);
  const limits = getPlanLimits(plan);
  const positioning = planPositioning[plan];
  const featured = plan === "growth";

  return (
    <article className={`recovery-price-card ${featured ? "featured" : ""}`}>
      {featured ? <span className="recovery-plan-badge">Recommended</span> : null}
      <h3>{catalog.label}</h3>
      <div className="pricing-card-price">
        <span>${catalog.monthlyPrice}</span>
        <small>/mo</small>
      </div>
      <strong className="pricing-plan-fit">{positioning.bestFor}</strong>
      <p>{positioning.description}</p>
      <div className="pricing-plan-limits">
        <span>{limits.maxUsers} seats</span>
        <span>{limits.maxIntegrations} connected channels</span>
        <span>{limits.monthlyMessages.toLocaleString()} messages/mo</span>
        <span>{limits.monthlyAiRuns.toLocaleString()} AI runs/mo</span>
      </div>
      <ul className="pricing-plan-includes">
        {positioning.includes.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <div className="pricing-card-actions">
        <Link
          className={featured ? "recovery-white-button" : "recovery-ghost-button"}
          data-launch-event="public.pricing.plan_clicked"
          data-launch-page="/pricing"
          data-launch-plan={plan}
          data-launch-section="pricing-card"
          data-launch-target="/register"
          href="/register"
        >
          <LocalizedText fallback="Start 14-day trial" k="common.cta.startTrial3" />
        </Link>
        <Link className="pricing-card-demo-link" href="/support#request">
          <MarketingLocalizedText fallback="Book 15-min clinic demo" k="bookClinicDemo" />
        </Link>
      </div>
    </article>
  );
}
