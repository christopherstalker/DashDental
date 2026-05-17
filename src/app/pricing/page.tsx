import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles, Target } from "lucide-react";
import type { Subscription } from "@/domain/types";
import { SiteShell } from "@/features/design-system/components/site-shell";
import {
  CTAGroup,
  DashboardPreview,
  MarketingShell,
  PricingCard,
  SectionHeader,
  TrustCard,
} from "@/features/marketing/components/landing-system";
import {
  primaryCta,
  secondaryCta,
} from "@/features/marketing/content/dash-dental";
import styles from "@/features/marketing/components/landing-system.module.css";

export const metadata: Metadata = {
  title: "Pricing - Dash Dental",
  description:
    "Compare Dash Dental plans for missed-message recovery, owner money-at-risk reporting, safe AI-assisted drafts, and guided clinic onboarding.",
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    title: "Pricing - Dash Dental",
    description:
      "Plans for dental clinics that want to recover unanswered patient messages without replacing their CRM.",
    url: "/pricing",
  },
};

const plans: Subscription["plan"][] = ["starter", "growth", "scale"];

const comparisonRows = [
  ["Best for", "Single clinic pilot", "Busy clinic", "Clinic group"],
  ["Connected channels", "2", "5", "12"],
  ["Team seats", "4", "10", "30"],
  ["Monthly messages", "2,000", "10,000", "40,000"],
  ["AI-assisted drafts", "120/mo", "600/mo", "2,500/mo"],
  ["Owner visibility", "Core dashboard", "Channel reports", "Leadership view"],
  ["Launch help", "Guided setup", "Priority onboarding", "Rollout planning"],
] as const;

const trustCards = [
  {
    icon: Target,
    title: "Priced against recoverable work",
    text: "The subscription is anchored to unanswered patients, response-time risk, and booked consult recovery.",
  },
  {
    icon: Sparkles,
    title: "AI remains assistive",
    text: "AI summaries and drafts support staff. They do not send automatically or make clinical decisions.",
  },
  {
    icon: ShieldCheck,
    title: "No compliance theater",
    text: "Security controls are described honestly. No SOC 2, HIPAA, or ISO certification is claimed unless completed.",
  },
] as const;

export default function PricingPage() {
  return (
    <SiteShell>
      <MarketingShell launchPage="/pricing">
        <section className={styles.pricingHero}>
          <div>
            <span className={styles.badge}>Clinic recovery pricing</span>
            <h1>Choose the recovery cockpit your clinic can launch this week.</h1>
            <p>
              Start with one patient channel, prove the daily recovery workflow, then
              expand into more channels, seats, and AI capacity when the team is ready.
            </p>
            <CTAGroup primaryLabel={primaryCta} secondaryLabel={secondaryCta} />
          </div>
          <DashboardPreview />
        </section>

        <section className={styles.section} id="plans">
          <SectionHeader
            align="center"
            eyebrow="Plans"
            title="Starter for proof. Growth for real operations. Scale for rollout."
          >
            Growth is recommended for clinics already receiving meaningful volume across
            WhatsApp, Instagram, Telegram, and website forms.
          </SectionHeader>
          <div className={styles.pricingGrid}>
            {plans.map((plan) => (
              <PricingCard ctaHref="/register" ctaLabel="Start guided trial" key={plan} plan={plan} />
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <SectionHeader
            eyebrow="Plan comparison"
            title="Pick by front-desk pressure, not vague software tiers."
          >
            Every plan includes the recovery queue, owner visibility, and human-reviewed
            AI assistance. Higher plans increase channel, seat, message, and AI capacity.
          </SectionHeader>
          <div className={styles.comparisonWrap}>
            <table className={styles.comparisonTable}>
              <thead>
                <tr>
                  <th scope="col">Capability</th>
                  <th scope="col">Starter</th>
                  <th scope="col">Growth</th>
                  <th scope="col">Scale</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map(([label, starter, growth, scale]) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    <td>{starter}</td>
                    <td>{growth}</td>
                    <td>{scale}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.sectionNote}>
            Over-limit usage is surfaced before it becomes confusing. Clinics can review
            plan limits, upgrade manually, or pause paid actions without losing read
            access to core setup and billing context.
          </p>
        </section>

        <section className={styles.section}>
          <SectionHeader
            align="center"
            eyebrow="What the clinic buys"
            title="A daily operating ritual for recovering patient demand."
          >
            The owner sees leakage. The front desk sees which patient to answer first.
            AI helps draft the message, and staff stays in control.
          </SectionHeader>
          <div className={styles.trustGrid}>
            {trustCards.map((card) => (
              <TrustCard key={card.title} {...card} />
            ))}
          </div>
        </section>

        <section className={styles.finalCta}>
          <div>
            <span className={styles.badge}>
              <CheckCircle2 size={15} />
              Buyer-safe next step
            </span>
            <h2>See the recovery workflow before connecting real patient channels.</h2>
            <p>
              Book a guided demo or start the sample dashboard path without replacing
              your existing clinic systems.
            </p>
          </div>
          <div className={styles.ctaGroup}>
            <Link className={styles.buttonPrimary} href="/support#request">
              {primaryCta}
              <ArrowRight size={16} />
            </Link>
            <Link className={styles.buttonSecondary} href="/demo">
              {secondaryCta}
            </Link>
          </div>
        </section>
      </MarketingShell>
    </SiteShell>
  );
}
