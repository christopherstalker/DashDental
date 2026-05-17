import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  FileWarning,
  MessageCircle,
  RadioTower,
  TimerReset,
  Workflow,
} from "lucide-react";
import { HeroConsole } from "@/features/marketing/components/hero-console";
import { LocalizedText } from "@/features/i18n/components/localized-text";
import {
  AiAssistPanel,
  CTAGroup,
  DashboardPreview,
  IntegrationCard,
  LeakCard,
  MarketingShell,
  PricingCard,
  SectionHeader,
  TrustCard,
  trustCards,
} from "@/features/marketing/components/landing-system";
import { RecoveryFlow } from "@/features/marketing/components/recovery-flow";
import {
  integrationRows,
  primaryCta,
  secondaryCta,
} from "@/features/marketing/content/dash-dental";
import styles from "./landing-system.module.css";

const proofItems = [
  "Lead intake only",
  "Human-reviewed AI drafts",
  "No CRM migration required",
] as const;

const leakPoints = [
  {
    consequence: "High-intent inquiries go cold",
    fix: "One priority inbox shows channel, wait time, value, and next action.",
    icon: MessageCircle,
    text: "Patient demand gets split across WhatsApp, Instagram, Telegram, and forms while reception works from scattered tabs.",
    title: "Messages buried across channels",
  },
  {
    consequence: "Late replies lose consults",
    fix: "SLA timers surface threads before patients book somewhere else.",
    icon: TimerReset,
    text: "A 20-minute delay on pain, implant, or cosmetic questions can turn a warm patient into a lost opportunity.",
    title: "Staff replies too late",
  },
  {
    consequence: "Owners cannot see leakage",
    fix: "Revenue-at-risk estimates make missed demand visible every day.",
    icon: Eye,
    text: "Without owner-level visibility, missed conversations become anecdotes instead of measurable work.",
    title: "No visibility into lost patients",
  },
  {
    consequence: "Follow-up depends on memory",
    fix: "Dash Dental attaches next actions, ownership, notes, drafts, and outcomes.",
    icon: Workflow,
    text: "High-value patients need an accountable handoff from first touch to booked appointment.",
    title: "No follow-up system",
  },
] as const;

const channelCards = integrationRows.slice(0, 4).map((integration) => ({
  note: integration.notes,
  status: integration.status,
  title: integration.channel,
}));

const homepagePlans = ["starter", "growth", "scale"] as const;

export function DashDentalHomepage() {
  return (
    <MarketingShell launchPage="/">
      <section aria-labelledby="future-hero-title" className={styles.hero}>
        <div aria-hidden="true" className={`${styles.backdropMark} recovery-dental-backdrop`}>
          <Image alt="" height={640} priority src="/dental-recovery-mark.svg" unoptimized width={640} />
        </div>
        <div className={styles.heroCopy}>
          <span className={styles.badge}>
            <RadioTower size={15} />
            <LocalizedText fallback="AI revenue recovery for dental clinics" k="home.hero.kicker" />
          </span>
          <h1 id="future-hero-title">
            <LocalizedText
              fallback="Turn missed messages into booked patient appointments."
              k="home.hero.title"
            />
          </h1>
          <p className={styles.heroLead}>
            <LocalizedText
              fallback="Dash Dental unifies patient inquiries, detects SLA risk, drafts human-reviewed replies, and shows the revenue your clinic can recover today."
              k="home.hero.body"
            />
          </p>

          <div className={styles.heroActions}>
            <Link
              className={styles.buttonPrimary}
              data-launch-event="public.home.demo_clicked"
              data-launch-page="/"
              data-launch-section="hero"
              data-launch-target="/support#request"
              href="/support#request"
            >
              <LocalizedText fallback={primaryCta} k="common.cta.bookDemo" />
              <ArrowRight size={16} />
            </Link>
            <Link className={styles.buttonSecondary} href="/demo">
              <LocalizedText fallback={secondaryCta} k="common.cta.viewDashboard" />
            </Link>
            <Link
              className={styles.buttonGhost}
              data-launch-event="public.home.start_trial_clicked"
              data-launch-page="/"
              data-launch-section="hero"
              data-launch-target="/register"
              href="/register"
            >
              Start 14-day guided trial
            </Link>
          </div>

          <div className={styles.proofRail} aria-label="Product trust proof">
            {proofItems.map((item) => (
              <span key={item}>
                <CheckCircle2 size={14} />
                {item}
              </span>
            ))}
          </div>
        </div>

        <HeroConsole />
      </section>

      <section className={`${styles.section} ${styles.sectionTight}`} id="product">
        <SectionHeader
          eyebrow="Where clinics leak revenue"
          title="The problem is not demand. It is invisible delay."
        >
          Dash Dental turns unanswered patient conversations into a visible recovery queue
          before the appointment opportunity disappears.
        </SectionHeader>
        <div className={styles.leakGrid}>
          {leakPoints.map((point) => (
            <LeakCard key={point.title} {...point} />
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.flowSection}`}>
        <SectionHeader
          align="center"
          eyebrow="Recovery flow"
          title="A command pipeline from hidden message to booked consult."
        >
          Each patient thread moves through SLA detection, AI-assisted drafting, staff
          approval, and owner-visible recovery reporting.
        </SectionHeader>
        <RecoveryFlow />
      </section>

      <section className={styles.section}>
        <SectionHeader
          eyebrow="Live dashboard preview"
          title="Owners see leakage. Reception sees exactly what to do next."
        >
          The dashboard is designed around operating signals: revenue at risk, saved
          revenue, unanswered patients, channel health, and the next action queue.
        </SectionHeader>
        <DashboardPreview />
      </section>

      <section className={styles.section}>
        <SectionHeader
          eyebrow="AI assist"
          title="AI speeds up replies without taking clinical control."
        >
          The product is intentionally narrow: summarize intent, draft replies, suggest
          next actions, and keep staff in review.
        </SectionHeader>
        <AiAssistPanel />
      </section>

      <section className={styles.section}>
        <SectionHeader
          align="center"
          eyebrow="Integrations"
          title="Start where patient demand already happens."
        >
          Supported intake channels include WhatsApp, Instagram, Telegram, and website
          forms. More integrations can be added later after the clinic workflow is proven.
        </SectionHeader>
        <div className={styles.integrationGrid}>
          {channelCards.map((card) => (
            <IntegrationCard key={card.title} {...card} />
          ))}
        </div>
      </section>

      <section className={styles.section} id="pricing-preview">
        <SectionHeader
          align="center"
          eyebrow="Pricing"
          title="Simple plans priced against recovered revenue."
        >
          Growth is the natural fit once a clinic has multiple active channels and a
          front-desk team working from the recovery queue.
        </SectionHeader>
        <div className={styles.pricingGrid}>
          {homepagePlans.map((plan) => (
            <PricingCard key={plan} plan={plan} />
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <SectionHeader
          align="center"
          eyebrow="Trust and security"
          title="Honest controls. No fake compliance theater."
        >
          Dash Dental is designed for lead recovery workflows with staff-reviewed AI,
          tenant-scoped access, audit visibility, and clear security boundaries.
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
            <FileWarning size={15} />
            Revenue leakage check
          </span>
          <h2>See how much patient revenue your clinic is leaking this week.</h2>
          <p>
            Book a guided demo or open the sample dashboard before connecting a real
            patient channel.
          </p>
        </div>
        <CTAGroup className={styles.heroActions} primaryLabel={primaryCta} secondaryLabel={secondaryCta} />
      </section>
    </MarketingShell>
  );
}
