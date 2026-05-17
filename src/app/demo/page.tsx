import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { SiteShell } from "@/features/design-system/components/site-shell";
import {
  DashboardPreview,
  MarketingShell,
  SectionHeader,
} from "@/features/marketing/components/landing-system";
import { SampleDashboardConsole } from "@/features/marketing/components/sample-dashboard-console";
import {
  pilotCta,
  primaryCta,
} from "@/features/marketing/content/dash-dental";
import styles from "@/features/marketing/components/landing-system.module.css";

export const metadata: Metadata = {
  title: "Sample Dashboard - Dash Dental",
  description:
    "Try a no-login sample Dash Dental dashboard with illustrative clinic data, money at risk, unanswered patients, priority queue, and human-reviewed AI reply drafts.",
  alternates: {
    canonical: "/demo",
  },
  openGraph: {
    title: "Sample Dashboard - Dash Dental",
    description:
      "A public sample dashboard that shows how missed-message recovery works before signup.",
    url: "/demo",
  },
};

const proofPoints = [
  "No login required for the sample dashboard.",
  "Uses illustrative clinic data, not live patient records.",
  "AI drafts require human review before sending.",
  "Money at risk is a planning estimate, not a booking or treatment-value promise.",
] as const;

export default function DemoPage() {
  return (
    <SiteShell>
      <MarketingShell launchPage="/demo">
        <section className={styles.pricingHero}>
          <div>
            <span className={styles.badge}>Sample recovery cockpit</span>
            <h1>Try the product workflow before creating an account.</h1>
            <p>
              This sample workspace shows how Dash Dental surfaces revenue at risk,
              unanswered patients, channel pressure, and staff-reviewed AI drafts.
            </p>
            <div className={styles.ctaGroup}>
              <Link className={styles.buttonPrimary} href="/support#request">
                {primaryCta}
                <ArrowRight size={16} />
              </Link>
              <Link className={styles.buttonSecondary} href="/register">
                {pilotCta}
              </Link>
            </div>
          </div>
          <DashboardPreview />
        </section>

        <SampleDashboardConsole />

        <section className={styles.section}>
          <SectionHeader
            eyebrow="Demo boundaries"
            title="Judge the recovery workflow before connecting live channels."
          >
            Dash Dental is not trying to replace your CRM. It shows which high-intent
            patient messages are late, unanswered, or ready for recovery.
          </SectionHeader>
          <div className={styles.trustGrid}>
            {proofPoints.map((point) => (
              <article className={styles.trustCard} key={point}>
                <CheckCircle2 size={20} />
                <h3>{point}</h3>
                <p>Designed to keep the evaluation concrete, safe, and buyer-readable.</p>
              </article>
            ))}
          </div>
        </section>
      </MarketingShell>
    </SiteShell>
  );
}
