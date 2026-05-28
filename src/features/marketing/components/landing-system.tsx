import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  DatabaseZap,
  FileClock,
  Inbox,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";
import { getPlanCatalog, getPlanLimits } from "@/domain/business-rules";
import type { Subscription } from "@/domain/types";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  primaryCta,
  secondaryCta,
  supportEmail,
} from "@/features/marketing/content/dash-dental";
import { LocalizedText } from "@/features/i18n/components/localized-text";
import styles from "./landing-system.module.css";

export const demoRequestHref = "/demo/start";

export function MarketingShell({
  children,
  launchPage,
}: {
  children: ReactNode;
  launchPage?: string;
}) {
  return (
    <main className={`${styles.page} ddr-marketing-system ddr-reset`}>
      <AnimatedBackground />
      <LandingNav launchPage={launchPage} />
      {children}
      <LandingFooter />
    </main>
  );
}

export function AnimatedBackground() {
  return (
    <div aria-hidden="true" className={styles.background}>
      <span className={styles.orbitOne} />
      <span className={styles.orbitTwo} />
      <span className={styles.orbitThree} />
      <span className={styles.scanBeam} />
    </div>
  );
}

export function LandingNav({ launchPage }: { launchPage?: string }) {
  return (
    <nav aria-label="Primary navigation" className={`${styles.nav} ddr-marketing-nav`}>
      <Link aria-label="Dash Dental home" className={styles.brand} href="/">
        <span aria-hidden="true" className={styles.brandMark}>
          <Image
            alt=""
            className="recovery-brand-mark-compact"
            height={160}
            loading="eager"
            src="/dental-recovery-mark.png"
            unoptimized
            width={160}
          />
        </span>
        <span className={styles.brandText}>
          <span className={styles.brandNameRow}>
            <strong className="recovery-brand-wordmark">Dash Dental</strong>
          </span>
        </span>
      </Link>

      <div className={styles.navLinks}>
        <Link href="/#product">Product</Link>
        <Link href="/demo">Demo</Link>
        <Link href="/pricing">
          <LocalizedText fallback="Pricing" k="common.nav.pricing" />
        </Link>
        <Link href="/integrations-guide">Integrations</Link>
        <Link href="/security">
          <LocalizedText fallback="Security" k="common.nav.security" />
        </Link>
        <Link href="/support">Support</Link>
      </div>

      <div className={styles.navActions}>
        <ThemeToggle className={styles.themeButton} />
        <Link className={styles.navSignIn} href="/login">
          Sign in
        </Link>
        <Link
          className={styles.navCta}
          data-launch-event="public.marketing.demo_clicked"
          data-launch-page={launchPage}
          data-launch-section="nav"
          data-launch-target="/trial"
          href="/trial"
        >
          <LocalizedText fallback="Start free trial" k="common.nav.startTrial" />
        </Link>
      </div>
    </nav>
  );
}

export function SectionHeader({
  align = "left",
  eyebrow,
  title,
  children,
}: {
  align?: "center" | "left";
  children?: ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className={`${styles.sectionHeader} ${align === "center" ? styles.center : ""}`}>
      <span className={styles.eyebrow}>{eyebrow}</span>
      <h2>{title}</h2>
      {children ? <p>{children}</p> : null}
    </div>
  );
}

export function CTAGroup({
  className = "",
  primaryHref = demoRequestHref,
  primaryLabel = primaryCta,
  secondaryHref = "/demo",
  secondaryLabel = secondaryCta,
}: {
  className?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <div className={`${styles.ctaGroup} ${className}`}>
      <Link className={styles.buttonPrimary} href={primaryHref}>
        {primaryLabel}
        <ArrowRight size={16} />
      </Link>
      <Link className={styles.buttonSecondary} href={secondaryHref}>
        {secondaryLabel}
      </Link>
    </div>
  );
}

export function MetricPanel({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <article className={styles.metricPanel}>
      <span>
        <Icon size={14} />
        {label}
      </span>
      <strong>{value}</strong>
    </article>
  );
}

export function LeakCard({
  consequence,
  fix,
  icon: Icon,
  text,
  title,
}: {
  consequence: string;
  fix: string;
  icon: LucideIcon;
  text: string;
  title: string;
}) {
  return (
    <article className={styles.leakCard}>
      <Icon size={21} />
      <span className={styles.leakConsequence}>{consequence}</span>
      <h3>{title}</h3>
      <p>{text}</p>
      <div className={styles.fixLine}>
        <span>Dash Dental fix</span>
        <strong>{fix}</strong>
      </div>
    </article>
  );
}

const planPositioning: Record<
  Subscription["plan"],
  {
    bestFor: string;
    features: string[];
  }
> = {
  starter: {
    bestFor: "One clinic proving recovery discipline",
    features: [
      "Unified inbox and SLA queue",
      "Revenue-at-risk owner view",
      "Staff-reviewed AI reply drafts",
    ],
  },
  growth: {
    bestFor: "Busy clinic with multiple active channels",
    features: [
      "Full channel recovery operations",
      "Team roles for owners and reception",
      "Priority onboarding for daily adoption",
    ],
  },
  scale: {
    bestFor: "Clinic group or high-volume front desk",
    features: [
      "Higher throughput and AI usage",
      "Multi-location leadership view",
      "Rollout planning and preferred support",
    ],
  },
};

export function PricingCard({
  plan,
  ctaHref = "/pricing",
  ctaLabel,
}: {
  ctaHref?: string;
  ctaLabel?: string;
  plan: Subscription["plan"];
}) {
  const catalog = getPlanCatalog(plan);
  const limits = getPlanLimits(plan);
  const isRecommended = plan === "growth";
  const positioning = planPositioning[plan];

  return (
    <article className={`${styles.priceCard} ${isRecommended ? styles.recommended : ""}`}>
      {isRecommended ? <span className={styles.planBadge}>Recommended</span> : null}
      <h3 className={styles.planName}>{catalog.label}</h3>
      <div className={styles.price}>
        <strong>${catalog.monthlyPrice}</strong>
        <span>/mo</span>
      </div>
      <strong className={styles.bestFor}>{positioning.bestFor}</strong>
      <p>{catalog.summary}</p>
      <div className={styles.planLimits}>
        <span>{limits.maxIntegrations} channels</span>
        <span>{limits.maxUsers} seats</span>
        <span>{limits.monthlyMessages.toLocaleString()} messages/mo</span>
        <span>{limits.monthlyAiRuns.toLocaleString()} AI runs/mo</span>
      </div>
      <ul>
        {positioning.features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
      <div className={styles.planActions}>
        <Link className={isRecommended ? styles.buttonPrimary : styles.buttonSecondary} href={ctaHref}>
          {ctaLabel ?? `Compare ${catalog.label}`}
          <ArrowRight size={15} />
        </Link>
        <Link className={styles.buttonGhost} href="/demo/start">
          Book demo
        </Link>
      </div>
    </article>
  );
}

export function TrustCard({
  icon: Icon,
  text,
  title,
}: {
  icon: LucideIcon;
  text: string;
  title: string;
}) {
  return (
    <article className={styles.trustCard}>
      <Icon size={21} />
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

export function IntegrationCard({
  icon: Icon = MessageCircle,
  note,
  status,
  title,
}: {
  icon?: LucideIcon;
  note: string;
  status: string;
  title: string;
}) {
  return (
    <article className={styles.integrationCard}>
      <Icon size={21} />
      <span>{status}</span>
      <h3>{title}</h3>
      <p>{note}</p>
    </article>
  );
}

export function DashboardPreview() {
  const previewRows = [
    ["EP", "Emergency tooth pain", "WhatsApp", "22m waiting", "$420", "Critical"],
    ["MK", "Veneers pricing", "Instagram", "1h 14m waiting", "$1,200", "High intent"],
    ["ON", "Implant consult", "Website form", "2h waiting", "$1,500", "High value"],
  ] as const;

  return (
    <div className={styles.dashboardPreview} aria-label="Dash Dental dashboard preview">
      <section className={styles.dashboardPanel}>
        <div className={styles.dashboardTopbar}>
          <div>
            <strong>Owner cockpit</strong>
            <span>Today, Bright Smiles Clinic</span>
          </div>
          <span className={styles.sampleTag}>Sample data</span>
        </div>

        <div className={styles.dashboardMetrics}>
          <MetricPanel icon={Target} label="Revenue at risk" value="$7.8k" />
          <MetricPanel icon={ShieldCheck} label="Saved revenue" value="$12.4k" />
          <MetricPanel icon={Inbox} label="Unanswered" value="12" />
          <MetricPanel icon={Clock3} label="First response" value="38m" />
        </div>

        <div className={styles.dashboardMainGrid}>
          <div className={styles.queueList}>
            <div className={styles.previewHeader}>
              <strong>Reply first</strong>
              <span>SLA and value sorted</span>
            </div>
            {previewRows.map(([initials, intent, channel, wait, value, status]) => (
              <article className={styles.queueRow} key={intent}>
                <span className={styles.avatar}>{initials}</span>
                <div>
                  <strong>{intent}</strong>
                  <small>
                    {channel} - {wait}
                  </small>
                </div>
                <span className={styles.queueValue}>
                  {value}
                  <em>{status}</em>
                </span>
              </article>
            ))}
          </div>

          <div className={styles.revenueSummary}>
            <h3>Recovery summary</h3>
            <span className={styles.revenueNumber}>21</span>
            <p>Conversations marked booked or protected this month.</p>
            <div className={styles.progressStack}>
              <ProgressRow label="Emergency recovery" value={72} />
              <ProgressRow label="Cosmetic consults" value={58} />
              <ProgressRow label="Website callbacks" value={44} />
            </div>
          </div>
        </div>
      </section>

      <aside className={styles.dashboardSide}>
        <div className={styles.radarCard}>
          <h3>Channel radar</h3>
          <div aria-hidden="true" className={styles.radarRings}>
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className={styles.healthList}>
            <article>
              <div>
                <strong>WhatsApp</strong>
                <small>Urgent volume up</small>
              </div>
              <span className={styles.healthStatus}>Watch</span>
            </article>
            <article>
              <div>
                <strong>Instagram</strong>
                <small>Cosmetic demand</small>
              </div>
              <span className={styles.healthStatus}>Live</span>
            </article>
          </div>
        </div>
        <div className={styles.actionCard}>
          <h3>Next actions</h3>
          <p>Offer appointment windows, ask for callback number, and keep AI drafts in review.</p>
          <span className={styles.statusTag}>Staff approval required</span>
        </div>
      </aside>
    </div>
  );
}

export function AiAssistPanel() {
  const helps = [
    "Summarize patient intent",
    "Draft receptionist-safe replies",
    "Suggest urgency and next action",
    "Prioritize conversations by risk",
  ];
  const doesNot = [
    "Diagnose patients",
    "Make clinical decisions",
    "Replace staff approval",
    "Act as billing truth",
  ];

  return (
    <div className={styles.aiSplit}>
      <article className={styles.aiDraft}>
        <div className={styles.splitTitle}>
          <div>
            <strong>AI draft</strong>
            <span>Based on patient intent and SLA state</span>
          </div>
          <Sparkles size={19} />
        </div>
        <div className={styles.aiDraftMessage}>
          <p>
            Hi Eva, we can help today. Can you confirm the best callback number and whether
            you prefer the 14:30 or 16:00 emergency slot?
          </p>
        </div>
        <div className={styles.progressStack}>
          <ProgressRow label="Intent confidence" value={86} />
          <ProgressRow label="SLA urgency" value={78} />
          <ProgressRow label="Clinical claim risk" value={12} />
        </div>
        <div className={styles.aiDraftFooter}>
          <span>Draft only</span>
          <span>Human review required</span>
        </div>
      </article>

      <article className={styles.aiRules}>
        <div className={styles.splitTitle}>
          <div>
            <strong>Human review and rules engine</strong>
            <span>Operational assistance, not autonomous care</span>
          </div>
          <ShieldCheck size={19} />
        </div>
        <div className={styles.ruleGrid}>
          <div className={styles.ruleBox}>
            <h3>AI helps with</h3>
            {helps.map((item) => (
              <span key={item}>
                <CheckCircle2 color="currentColor" size={14} />
                {item}
              </span>
            ))}
          </div>
          <div className={styles.ruleBox}>
            <h3>AI does not</h3>
            {doesNot.map((item) => (
              <span key={item}>
                <ShieldCheck color="currentColor" size={14} />
                {item}
              </span>
            ))}
          </div>
        </div>
        <p>
          Dash Dental keeps the product focused on lead intake, response workflows, and
          accountable staff actions.
        </p>
      </article>
    </div>
  );
}

export function ProgressRow({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.progressRow}>
      <div className={styles.progressLabel}>
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <span className={styles.progressTrack}>
        <span className={styles.progressFill} style={{ "--value": `${value}%` } as CSSProperties} />
      </span>
    </div>
  );
}

export const trustCards = [
  {
    icon: Users,
    title: "Tenant-scoped workspaces",
    text: "Clinic users, roles, conversations, and reports stay scoped to the workspace they belong to.",
  },
  {
    icon: FileClock,
    title: "Audit visibility",
    text: "Critical actions should leave enough context for owners and support to understand what happened.",
  },
  {
    icon: DatabaseZap,
    title: "Webhook idempotency",
    text: "Provider retries should not create duplicate patient records or double-count recovery outcomes.",
  },
  {
    icon: Sparkles,
    title: "Human-reviewed AI drafts",
    text: "AI assists with summaries and replies, while staff approve communication before patients receive it.",
  },
  {
    icon: Inbox,
    title: "Lead-intake focus",
    text: "Dash Dental is for inquiries, callbacks, and recovery workflows. It is not positioned as a full EHR.",
  },
  {
    icon: LockKeyhole,
    title: "Compliance readiness",
    text: "Designed with controls that support future compliance readiness. Not currently certified.",
  },
] as const;

export function LandingFooter() {
  return (
    <footer className={`${styles.footer} ddr-marketing-footer`}>
      <div className={styles.footerBrand}>
        <strong>Dash Dental</strong>
        <p>
          AI-assisted missed-message recovery for dental clinics. Lead intake only,
          staff-reviewed replies, and honest security boundaries.
        </p>
      </div>
      <nav aria-label="Product footer links">
        <strong>Product</strong>
        <Link href="/">Home</Link>
        <Link href="/demo">Sample dashboard</Link>
        <Link href="/pricing">Pricing</Link>
        <Link href="/demo/start">Book demo</Link>
      </nav>
      <nav aria-label="Trust footer links">
        <strong>Trust</strong>
        <Link href="/security">
          <LocalizedText fallback="Security" k="common.nav.security" />
        </Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href={`mailto:${supportEmail}`}>{supportEmail}</Link>
      </nav>
    </footer>
  );
}
