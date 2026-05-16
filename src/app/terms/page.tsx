import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, FileText, ShieldCheck } from "lucide-react";
import { TrustPageShell } from "@/features/marketing/components/trust-page-shell";
import { policyEffectiveDate, termsSections } from "@/features/marketing/content/trust";

export const metadata: Metadata = {
  title: "Dash Dental Terms | Trial, billing, integrations, AI limits",
  description:
    "Service terms for Dash Dental covering free trial, manual invoice billing, acceptable use, integrations, AI limitations, and availability boundaries.",
  alternates: {
    canonical: "/terms",
  },
};

export default function TermsPage() {
  return (
    <TrustPageShell
      description="Plain-language service terms that set expectations before a clinic starts a trial, connects channels, or asks for a manual invoice."
      descriptionKey="terms.shell.description"
      kicker="Service terms"
      kickerKey="terms.shell.kicker"
      title="Clear rules make the SaaS feel safer to buy."
      titleKey="terms.shell.title"
    >
      <div className="trust-panel">
        <div className="recovery-section-heading">
          <p className="recovery-kicker">Terms summary</p>
          <h2>Commercial clarity for trial, billing, integrations, and AI.</h2>
          <p>
            Effective date: {policyEffectiveDate}. These terms are a product-facing baseline and
            should be reviewed by counsel before enterprise contracts or regulated deployments.
          </p>
        </div>

        <div className="trust-card-grid two-column">
          {termsSections.map((section) => (
            <article className="trust-card policy-card" key={section.title}>
              <FileText size={20} />
              <strong>{section.title}</strong>
              <p>{section.body}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="trust-panel split">
        <div>
          <p className="recovery-kicker">What should be in the paid contract later</p>
          <h2>Do not rely on a marketing page forever.</h2>
          <p>
            Once clinics start paying, move serious customers into a proper order form or SaaS
            agreement that covers plan, price, data processing, support, liability, termination,
            and renewal rules.
          </p>
        </div>
        <div className="trust-list">
          {[
            "Order form and plan limits",
            "Data-processing agreement",
            "Support and uptime terms",
            "Refund and downgrade rules",
            "Integration responsibility boundaries",
          ].map((item) => (
            <span key={item}>
              <CheckCircle2 size={15} />
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="trust-panel split">
        <div>
          <p className="recovery-kicker">Trial and limits</p>
          <h2>The buyer should understand the lock before it happens.</h2>
          <p>
            The standard trial lasts 14 days. After expiration, paid workflow actions
            can be locked while setup, billing, and reasonable read/export paths remain available
            for owners. Over-limit paid actions may be blocked until the plan is upgraded.
          </p>
        </div>
        <div className="trust-list">
          {[
            "Starter, Growth, and Scale limits are visible before purchase",
            "Manual invoice activation is handled by platform support",
            "Stripe checkout can be enabled when provider setup is ready",
            "Upgrade and downgrade decisions should account for seats, channels, messages, and AI usage",
          ].map((item) => (
            <span key={item}>
              <CheckCircle2 size={15} />
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="trust-warning-card">
        <ShieldCheck size={20} />
        <div>
          <strong>Plain-English disclaimer</strong>
          <p>
            This page helps buyers understand the current service posture. It is not a substitute
            for a signed customer agreement, privacy addendum, business associate agreement, or
            jurisdiction-specific legal advice where those are required.
          </p>
        </div>
        <Link className="recovery-secondary-button" href="/privacy">
          Privacy policy
        </Link>
      </div>

      <div className="trust-cta-panel trust-cta-panel-split">
        <div>
          <ArrowRight size={20} />
          <span>Ready to evaluate Dash Dental?</span>
        </div>
        <div className="trust-cta-actions">
          <Link className="recovery-white-button" href="/register">
            Start 14-day guided trial
            <ArrowRight size={16} />
          </Link>
          <Link className="recovery-secondary-button" href="/demo">
            Try sample dashboard
          </Link>
        </div>
      </div>
    </TrustPageShell>
  );
}
