import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Plug, ShieldCheck, Sparkles } from "lucide-react";
import { LocalizedText } from "@/features/i18n/components/localized-text";
import { TrustPageShell } from "@/features/marketing/components/trust-page-shell";
import { primaryCta } from "@/features/marketing/content/dash-dental";
import { faqItems } from "@/features/marketing/content/trust";

export const metadata: Metadata = {
  title: "Q&A — Dash Dental",
  description:
    "Answers for dental clinics evaluating Dash Dental: guided trial, billing, integrations, team seats, AI limitations, privacy, and security posture.",
  alternates: {
    canonical: "/qa",
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

export default function FaqPage() {
  return (
    <TrustPageShell
      description="Straight answers for clinic owners and front-desk teams before they connect patient channels or start a paid plan."
      kicker="Buyer Q&A"
      launchPage="/qa"
      primaryActionHref="/support#request"
      primaryActionLabel={primaryCta}
      title="Everything a clinic asks before trusting a new recovery inbox."
    >
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        type="application/ld+json"
      />

      <div className="trust-panel">
        <div className="recovery-section-heading">
          <p className="recovery-kicker">Fast answers</p>
          <h2>Trial, billing, integrations, AI, and privacy boundaries.</h2>
          <p>
            Dash Dental is deliberately narrow: missed-message recovery for dental
            clinics, with human-reviewed AI assistance and no fake compliance claims.
          </p>
        </div>

        <div className="recovery-faq-grid">
          {faqItems.map((item) => (
            <details className="recovery-faq-card" key={item.question}>
              <summary>
                <span className="recovery-faq-question">
                  <LocalizedText fallback={item.question} k={item.questionKey} />
                </span>
              </summary>
              <p>
                <LocalizedText fallback={item.answer} k={item.answerKey} />
              </p>
            </details>
          ))}
        </div>
      </div>

      <div className="trust-card-grid">
        <article className="trust-card">
          <Plug size={20} />
          <strong>Start with one channel</strong>
          <p>
            Most clinics should prove the recovery workflow with one patient channel
            before expanding setup.
          </p>
        </article>
        <article className="trust-card">
          <ShieldCheck size={20} />
          <strong>Lead intake boundary</strong>
          <p>
            Dash Dental is not a full EHR and should not store unnecessary clinical
            history.
          </p>
        </article>
        <article className="trust-card">
          <Sparkles size={20} />
          <strong>AI stays assistive</strong>
          <p>
            AI summaries and drafts should be reviewed by your team before any patient
            message is sent.
          </p>
        </article>
      </div>

      <div className="trust-cta-panel">
        <div>
          <CheckCircle2 size={20} />
          <span>No CRM migration required. Start with missed-message recovery.</span>
        </div>
        <Link className="recovery-white-button" href="/support#request">
          {primaryCta}
          <ArrowRight size={16} />
        </Link>
      </div>
    </TrustPageShell>
  );
}
