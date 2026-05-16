import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bug,
  CheckCircle2,
  CreditCard,
  LifeBuoy,
  LockKeyhole,
  Mail,
  Plug,
  ShieldAlert,
} from "lucide-react";
import { SiteShell } from "@/features/design-system/components/site-shell";
import { MarketingFooter } from "@/features/marketing/components/marketing-footer";
import { MarketingNav } from "@/features/marketing/components/marketing-nav";
import {
  privacyEmail,
  securityEmail,
  supportEmail,
} from "@/features/marketing/content/dash-dental";
import { SupportRequestForm } from "@/features/support/components/support-request-form";

export const metadata: Metadata = {
  title: "Support â€” Dash Dental",
  description:
    "Contact Dash Dental support for clinic setup, billing, integrations, privacy/data requests, security reports, bugs, and feature ideas.",
  alternates: {
    canonical: "/support",
  },
  openGraph: {
    title: "Support â€” Dash Dental",
    description:
      "Professional support contacts and request forms for Dash Dental clinic setup, bugs, feature ideas, privacy, and security.",
    url: "/support",
  },
};

const supportChannels = [
  {
    icon: LifeBuoy,
    title: "For clinic setup",
    text: "Pilot setup, first channel connection, launch checklist, and front-desk workflow questions.",
    href: `mailto:${supportEmail}`,
    label: supportEmail,
  },
  {
    icon: CreditCard,
    title: "For billing",
    text: "Plan questions, invoice activation, trial status, and subscription support.",
    href: `mailto:${supportEmail}`,
    label: supportEmail,
  },
  {
    icon: Plug,
    title: "For integration issues",
    text: "Channel access, delivery problems, provider approvals, and setup blockers.",
    href: `mailto:${supportEmail}`,
    label: supportEmail,
  },
  {
    icon: LockKeyhole,
    title: "For privacy/data requests",
    text: "Export, deletion, retention, or data-handling questions for a clinic workspace.",
    href: `mailto:${privacyEmail}`,
    label: privacyEmail,
  },
  {
    icon: ShieldAlert,
    title: "For security reports",
    text: "Security concerns, suspected data exposure, account access issues, or vulnerability reports.",
    href: `mailto:${securityEmail}`,
    label: securityEmail,
  },
] as const;

const checklist = [
  "Clinic name",
  "Workspace email",
  "Affected channel",
  "Approximate timestamp",
  "Screenshot if safe",
  "Do not send unnecessary clinical records",
] as const;

export default function SupportPage() {
  return (
    <SiteShell>
      <main className="recovery-landing support-page dash-marketing">
      <section className="recovery-hero support-hero">
        <MarketingNav launchPage="/support" />
        <div className="support-hero-grid">
          <div className="support-hero-copy">
            <span className="recovery-beta-badge">Business-day support</span>
            <h1>Contact support, report bugs, or suggest what should be added next.</h1>
            <p>
              Send enough context for us to reproduce the issue or understand the
              request. We aim to respond during business days.
            </p>
            <div className="support-contact-card">
              <Mail size={18} />
              <span>
                Main support
                <Link href={`mailto:${supportEmail}`}>{supportEmail}</Link>
              </span>
            </div>
            <div className="recovery-hero-actions">
              <Link className="recovery-primary-button" href="#request">
                Open request form
                <ArrowRight size={16} />
              </Link>
              <Link className="recovery-secondary-button" href="/docs">
                Read dashboard docs
              </Link>
            </div>
          </div>

          <div className="support-summary-panel" aria-label="Support request options">
            <article>
              <Bug size={20} />
              <strong>Bug report</strong>
              <p>Description, optional screenshots, and your email for the fix follow-up.</p>
            </article>
            <article>
              <LifeBuoy size={20} />
              <strong>Clinic help</strong>
              <p>Setup, billing, integrations, privacy/data requests, and security reports.</p>
            </article>
            <article>
              <CheckCircle2 size={20} />
              <strong>Feature idea</strong>
              <p>Suggest the workflow Dash Dental should support next and why it matters.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="recovery-section support-channel-section">
        <div className="recovery-section-heading">
          <p className="recovery-kicker">Contact paths</p>
          <h2>Use the right inbox for the right request.</h2>
          <p>
            Please avoid sending unnecessary patient medical history by email. Screenshots
            should hide sensitive data whenever possible.
          </p>
        </div>
        <div className="support-channel-grid">
          {supportChannels.map((channel) => (
            <article className="support-channel-card" key={channel.title}>
              <channel.icon size={20} />
              <strong>{channel.title}</strong>
              <p>{channel.text}</p>
              <Link href={channel.href}>{channel.label}</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="recovery-section support-workflow-section">
        <div className="support-content-grid">
          <SupportRequestForm />

          <aside className="support-guidance-panel">
            <p className="recovery-kicker">Before contacting support</p>
            <h2>Include this when contacting support.</h2>
            <p>Good reports are short, specific, and safe to share.</p>
            <div className="support-guidance-list">
              {checklist.map((item) => (
                <span key={item}>
                  <CheckCircle2 size={16} />
                  {item}
                </span>
              ))}
            </div>
            <div className="support-safe-note">
              Do not send unnecessary patient medical records or clinical history. Dash
              Dental is designed for patient lead intake and communication workflows.
            </div>
          </aside>
        </div>
      </section>

      <MarketingFooter />
    </main>
    </SiteShell>
  );
}

