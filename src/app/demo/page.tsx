import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { MarketingFooter } from "@/features/marketing/components/marketing-footer";
import { MarketingNav } from "@/features/marketing/components/marketing-nav";
import { SampleDashboardConsole } from "@/features/marketing/components/sample-dashboard-console";
import {
  pilotCta,
  primaryCta,
} from "@/features/marketing/content/dash-dental";

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
    <main className="dd-site dd-demo-page">
      <MarketingNav launchPage="/demo" />

      <section className="dd-demo-intro">
        <div>
          <h1>Try the recovery cockpit before creating an account.</h1>
          <p>
            This sample workspace shows how Dash Dental surfaces money at risk,
            unanswered patients, recovery actions, and staff-reviewed AI drafts.
          </p>
        </div>
        <div className="dd-hero-actions">
          <Link className="dd-button dd-button-primary" href="/support#request">
            {primaryCta}
            <ArrowRight size={16} />
          </Link>
          <Link className="dd-button dd-button-secondary" href="/register">
            {pilotCta}
          </Link>
        </div>
      </section>

      <SampleDashboardConsole />

      <section className="dd-section dd-demo-proof">
        <div className="dd-section-copy">
          <h2>You can judge the product workflow before registration.</h2>
          <p>
            Dash Dental is not trying to replace your CRM. It shows which high-intent
            patient messages are late, unanswered, or ready for recovery.
          </p>
        </div>
        <div className="dd-frontdesk-panel">
          {proofPoints.map((point) => (
            <article key={point}>
              <CheckCircle2 size={16} />
              <div>
                <strong>{point}</strong>
              </div>
            </article>
          ))}
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
