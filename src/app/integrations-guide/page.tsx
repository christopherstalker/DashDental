import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Plug } from "lucide-react";
import { SiteShell } from "@/features/design-system/components/site-shell";
import { MarketingFooter } from "@/features/marketing/components/marketing-footer";
import { MarketingNav } from "@/features/marketing/components/marketing-nav";
import {
  integrationRows,
  primaryCta,
  secondaryCta,
} from "@/features/marketing/content/dash-dental";

export const metadata: Metadata = {
  title: "Integrations — Dash Dental",
  description:
    "Dash Dental integration matrix for WhatsApp, Instagram, Telegram, website forms, clinic context, and manual call notes.",
  alternates: {
    canonical: "/integrations-guide",
  },
  openGraph: {
    title: "Integrations — Dash Dental",
    description:
      "See channel status, setup type, and notes for Dash Dental patient-message recovery integrations.",
    url: "/integrations-guide",
  },
};

export default function IntegrationsGuidePage() {
  return (
    <SiteShell>
      <main className="recovery-landing integrations-page dash-marketing">
      <section className="recovery-hero integrations-hero">
        <MarketingNav launchPage="/integrations-guide" />
        <div className="pricing-hero-shell integrations-hero-shell">
          <div className="pricing-hero-copy">
            <span className="recovery-beta-badge">Channel matrix</span>
            <h1>Meet patients where they already message you.</h1>
            <p>
              Most clinics should start with one channel, prove the recovery workflow,
              then add the next. Status labels are intentionally conservative until
              provider access is confirmed.
            </p>
            <div className="recovery-hero-actions">
              <Link className="recovery-primary-button" href="/support#request">
                {primaryCta}
                <ArrowRight size={16} />
              </Link>
              <Link className="recovery-secondary-button" href="/demo">
                {secondaryCta}
              </Link>
            </div>
          </div>

          <div className="integration-status-panel">
            {integrationRows.slice(0, 4).map((row) => (
              <article key={row.channel}>
                <Plug size={18} />
                <strong>{row.channel}</strong>
                <span>{row.status}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="recovery-section integration-matrix-section">
        <div className="recovery-section-heading">
          <p className="recovery-kicker">Integration matrix</p>
          <h2>Start narrow, then expand with confidence.</h2>
          <p>
            Available means the repository has working support. Requires approval
            means the channel usually depends on external platform permissions. Guided
            setup means Dash Dental should help the clinic configure it safely.
          </p>
        </div>
        <div className="comparison-table-wrap">
          <table className="pricing-comparison-table integration-matrix-table">
            <thead>
              <tr>
                <th scope="col">Channel</th>
                <th scope="col">What it captures</th>
                <th scope="col">Setup type</th>
                <th scope="col">Status</th>
                <th scope="col">Notes</th>
              </tr>
            </thead>
            <tbody>
              {integrationRows.map((row) => (
                <tr key={row.channel}>
                  <th scope="row">{row.channel}</th>
                  <td>{row.captures}</td>
                  <td>{row.setup}</td>
                  <td>
                    <span className="integration-status-pill">{row.status}</span>
                  </td>
                  <td>{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="recovery-section dash-final-cta">
        <div>
          <CheckCircle2 size={22} />
          <h2>Start with one channel.</h2>
          <p>No CRM migration required. Add more once the team is comfortable.</p>
        </div>
        <div className="recovery-hero-actions">
          <Link className="recovery-primary-button" href="/support#request">
            {primaryCta}
            <ArrowRight size={16} />
          </Link>
          <Link className="recovery-secondary-button" href="/demo">
            {secondaryCta}
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </main>
    </SiteShell>
  );
}
