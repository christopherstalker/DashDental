import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bot, CreditCard, DatabaseZap, LockKeyhole, ShieldCheck } from "lucide-react";
import { MarketingNav } from "@/features/marketing/components/marketing-nav";
import { MarketingFooter } from "@/features/marketing/components/marketing-footer";
import { securityControls, trustLinks } from "@/features/marketing/content/trust";

export const metadata: Metadata = {
  title: "Trust center - Dash Dental",
  description:
    "Dash Dental trust center covering workspace security, privacy, billing lock, AI boundaries, integrations, and policy links.",
  alternates: {
    canonical: "/trust",
  },
};

const trustPillars = [
  {
    icon: LockKeyhole,
    title: "Workspace isolation",
    body: "Clinic data is scoped by organization, membership, role, and active billing policy.",
  },
  {
    icon: CreditCard,
    title: "Billing lock",
    body: "After the 14-day trial, operational data locks until an active paid period is restored.",
  },
  {
    icon: Bot,
    title: "Human-reviewed AI",
    body: "AI drafts and summaries stay assistive. It does not autonomously send patient messages.",
  },
  {
    icon: DatabaseZap,
    title: "Integration transparency",
    body: "Channel health, credentials, webhook status, and provider issues are visible to admins.",
  },
];

export default function TrustPage() {
  return (
    <main className="recovery-landing ddr-public-page trust-center-page">
      <MarketingNav launchPage="trust" />

      <section className="ddr-section trust-center-hero">
        <div className="ddr-section-heading">
          <span className="ddr-badge ddr-badge-info">Trust center</span>
          <h1>Clear security, billing, AI, and data boundaries before a clinic connects live channels.</h1>
          <p>
            Dash Dental is still early, so the trust posture is intentionally plain:
            say what is implemented, show what is not a certification claim, and make
            the operational controls visible before checkout.
          </p>
        </div>
      </section>

      <section className="ddr-section trust-pillar-grid">
        {trustPillars.map((pillar) => {
          const Icon = pillar.icon;

          return (
            <article className="ddr-card" key={pillar.title}>
              <Icon size={22} />
              <h2>{pillar.title}</h2>
              <p>{pillar.body}</p>
            </article>
          );
        })}
      </section>

      <section className="ddr-section trust-center-grid">
        <article className="ddr-card trust-control-card">
          <div className="ddr-card-heading">
            <h2>Implemented control surface</h2>
            <p>Public wording maps to actual product controls instead of vague badges.</p>
          </div>
          <div className="trust-control-list">
            {securityControls.slice(0, 6).map((control) => (
              <div key={control.title}>
                <ShieldCheck size={16} />
                <span>
                  <strong>{control.title}</strong>
                  {control.text}
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="ddr-card trust-link-card">
          <div className="ddr-card-heading">
            <h2>Policy links</h2>
            <p>Use these pages during owner review, procurement, and onboarding.</p>
          </div>
          <div className="trust-link-list">
            {trustLinks.map((link) => (
              <Link href={link.href} key={link.href}>
                <span>
                  <strong>{link.title}</strong>
                  {link.text}
                </span>
                <ArrowRight size={16} />
              </Link>
            ))}
          </div>
        </article>
      </section>

      <MarketingFooter />
    </main>
  );
}
