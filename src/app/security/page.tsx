import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Inbox,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { TrustPageShell } from "@/features/marketing/components/trust-page-shell";
import {
  privacyEmail,
  securityEmail,
  supportEmail,
} from "@/features/marketing/content/dash-dental";

export const metadata: Metadata = {
  title: "Security — Dash Dental",
  description:
    "Dash Dental security and privacy boundaries for patient-lead recovery, human-reviewed AI drafts, clinic workspace separation, data requests, and security reports.",
  alternates: {
    canonical: "/security",
  },
  openGraph: {
    title: "Security — Dash Dental",
    description:
      "Security-conscious patient-lead recovery with clear AI, privacy, and compliance boundaries.",
    url: "/security",
  },
};

const ownerCards = [
  {
    icon: Inbox,
    title: "Lead intake only",
    text:
      "Use Dash Dental for inbound inquiries, booking follow-up, and front-desk recovery workflows. Avoid storing unnecessary clinical history.",
  },
  {
    icon: Sparkles,
    title: "Human-reviewed AI",
    text:
      "AI can help summarize conversations and draft replies. Your team reviews responses before sending.",
  },
  {
    icon: Users,
    title: "Clinic workspace separation",
    text:
      "Each clinic workspace should only expose that clinic's conversations, users, roles, and operational records.",
  },
  {
    icon: LockKeyhole,
    title: "Access and roles",
    text:
      "Give access only to team members who need it. Owner, admin, manager, and support surfaces should remain separated.",
  },
  {
    icon: Database,
    title: "Data requests",
    text: `For export, deletion, or retention questions, contact ${privacyEmail}.`,
  },
  {
    icon: ShieldCheck,
    title: "Security reports",
    text: `Report security concerns to ${securityEmail}.`,
  },
] as const;

const aiBoundaries = [
  "AI may summarize conversations.",
  "AI may draft suggested replies.",
  "Clinic staff reviews and sends patient communications.",
  "AI does not make clinical, billing, insurance, eligibility, access, or compliance decisions.",
] as const;

const technicalControls = [
  {
    icon: LockKeyhole,
    title: "Authentication and roles",
    text:
      "Workspace access is tied to authenticated users and memberships. Owner/admin/manager roles are used to keep sensitive surfaces narrower.",
  },
  {
    icon: Database,
    title: "Operational data minimization",
    text:
      "The product is centered on leads, messages, notes, audit events, subscriptions, and support workflows rather than full medical records.",
  },
  {
    icon: KeyRound,
    title: "Provider secrets",
    text:
      "Channel tokens and provider secrets belong in server-side environment storage and should not be bundled into client-side code.",
  },
  {
    icon: ShieldCheck,
    title: "Integration reliability",
    text:
      "Channel delivery issues should be visible through status, logs, and support workflows so the team can recover missed inquiries.",
  },
] as const;

export default function SecurityPage() {
  return (
    <TrustPageShell
      description="Dash Dental is designed for managing inbound patient inquiries and recovery workflows - not for storing full medical records."
      heroPreview={
        <div className="security-hero-console" aria-label="Security contact and boundary summary">
          <span className="dd-status-chip active">Trust center</span>
          <strong>Clinic control boundaries</strong>
          <div className="security-hero-contact-grid">
            <Link href={`mailto:${supportEmail}`}>{supportEmail}</Link>
            <Link href={`mailto:${securityEmail}`}>{securityEmail}</Link>
            <Link href={`mailto:${privacyEmail}`}>{privacyEmail}</Link>
          </div>
          <div className="security-hero-checks">
            <span>
              <CheckCircle2 size={15} />
              Lead intake only
            </span>
            <span>
              <CheckCircle2 size={15} />
              Human-reviewed AI drafts
            </span>
            <span>
              <CheckCircle2 size={15} />
              No fake compliance badges
            </span>
          </div>
        </div>
      }
      descriptionKey="security.shell.description"
      kicker="Security and privacy"
      kickerKey="security.shell.kicker"
      launchPage="/security"
      title="Security and privacy boundaries for patient-lead recovery."
      titleKey="security.shell.title"
    >
      <div className="trust-panel">
        <div className="recovery-section-heading">
          <p className="recovery-kicker">Clinic-owner summary</p>
          <h2>Built for patient-lead workflows, with clear boundaries.</h2>
          <p>
            Dash Dental helps clinics manage unanswered patient inquiries, response-time
            risk, and follow-up work. It should not be used as a full EHR or a place to
            store unnecessary clinical history.
          </p>
        </div>
        <div className="trust-card-grid two-column">
          {ownerCards.map((card) => (
            <article className="trust-card" key={card.title}>
              <card.icon size={20} />
              <strong>{card.title}</strong>
              <p>{card.text}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="trust-warning-card">
        <AlertTriangle size={20} />
        <div>
          <strong>What we do not claim</strong>
          <p>
            Unless explicitly stated after completed audits or signed agreements, Dash
            Dental should not be presented as SOC 2 certified, ISO certified, HIPAA
            certified, or equivalent. We prefer clear boundaries over fake badges.
          </p>
        </div>
        <Link className="recovery-secondary-button" href="/privacy">
          Privacy summary
        </Link>
      </div>

      <div className="trust-panel split">
        <div>
          <p className="recovery-kicker">AI boundaries</p>
          <h2>AI can summarize and draft. Your team reviews and sends.</h2>
          <p>
            AI assistance is designed for communication workflow support, not autonomous
            medical, billing, insurance, access, or compliance decisions.
          </p>
        </div>
        <div className="trust-list">
          {aiBoundaries.map((item) => (
            <span key={item}>
              <CheckCircle2 size={15} />
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="trust-panel">
        <div className="recovery-section-heading compact">
          <p className="recovery-kicker">Technical detail</p>
          <h2>Controls that support the owner-friendly promises.</h2>
          <p>
            These are implementation-oriented controls and operating expectations. They
            should stay aligned with the actual product before being used in vendor review.
          </p>
        </div>
        <div className="trust-card-grid two-column">
          {technicalControls.map((control) => (
            <article className="trust-card" key={control.title}>
              <control.icon size={20} />
              <strong>{control.title}</strong>
              <p>{control.text}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="trust-panel split">
        <div>
          <p className="recovery-kicker">Support and incident contacts</p>
          <h2>Security questions should have a direct path.</h2>
          <p>
            We aim to respond during business days. Do not send unnecessary patient
            medical history by email.
          </p>
        </div>
        <div className="trust-list contact-list">
          <Link href={`mailto:${supportEmail}`}>{supportEmail}</Link>
          <Link href={`mailto:${securityEmail}`}>{securityEmail}</Link>
          <Link href={`mailto:${privacyEmail}`}>{privacyEmail}</Link>
        </div>
      </div>
    </TrustPageShell>
  );
}
