import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, FileLock2, ShieldCheck } from "lucide-react";
import { TrustPageShell } from "@/features/marketing/components/trust-page-shell";
import {
  privacyEmail,
  securityEmail,
  supportEmail,
} from "@/features/marketing/content/dash-dental";
import { policyEffectiveDate } from "@/features/marketing/content/trust";

export const metadata: Metadata = {
  title: "Privacy — Dash Dental",
  description:
    "Plain-English privacy summary for Dash Dental: clinic account data, team users, inbound patient messages, channel metadata, billing, AI boundaries, and data requests.",
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title: "Privacy — Dash Dental",
    description:
      "Clear privacy boundaries for patient-lead intake and front-desk recovery workflows.",
    url: "/privacy",
  },
};

const dataCategories = [
  "Clinic account details",
  "Team user details",
  "Inbound patient messages and leads",
  "Channel metadata and integration status",
  "Usage, support, and billing information",
] as const;

const privacyPrinciples = [
  {
    title: "Lead intake boundary",
    body:
      "Dash Dental is designed for inbound patient inquiries and recovery workflows, not for storing full medical records.",
  },
  {
    title: "Clinic responsibility",
    body:
      "Clinics are responsible for having a lawful basis or permission to process patient communications through connected channels.",
  },
  {
    title: "AI assistance",
    body:
      "AI features may summarize conversations and draft suggested replies. Clinic staff should review before sending.",
  },
  {
    title: "Data requests",
    body: `For export, deletion, retention, or privacy questions, contact ${privacyEmail}.`,
  },
] as const;

export default function PrivacyPage() {
  return (
    <TrustPageShell
      description="This is a plain-English privacy summary for clinics evaluating Dash Dental. It should be reviewed by counsel before broad commercial rollout."
      kicker="Privacy summary"
      launchPage="/privacy"
      title="Patient communication data should be useful, limited, and explainable."
    >
      <div className="trust-panel">
        <div className="recovery-section-heading">
          <p className="recovery-kicker">Plain-English summary</p>
          <h2>Dash Dental processes data needed for missed-message recovery.</h2>
          <p>
            Effective date: {policyEffectiveDate}. Avoid uploading unnecessary clinical
            history. Use the product for lead intake, booking follow-up, and front-desk
            recovery workflows.
          </p>
        </div>
        <div className="privacy-category-grid">
          {dataCategories.map((category) => (
            <span key={category}>
              <CheckCircle2 size={15} />
              {category}
            </span>
          ))}
        </div>
      </div>

      <div className="trust-card-grid two-column">
        {privacyPrinciples.map((principle) => (
          <article className="trust-card policy-card" key={principle.title}>
            <FileLock2 size={20} />
            <strong>{principle.title}</strong>
            <p>{principle.body}</p>
          </article>
        ))}
      </div>

      <div className="trust-warning-card">
        <AlertTriangle size={20} />
        <div>
          <strong>Do not over-share clinical history</strong>
          <p>
            Please do not upload or email unnecessary patient medical records. If a
            regulated deployment requires additional contracts, data-processing terms,
            or a BAA-style agreement, confirm those requirements before connecting live
            patient channels.
          </p>
        </div>
        <Link className="recovery-secondary-button" href="/security">
          Security summary
        </Link>
      </div>

      <div className="trust-panel split">
        <div>
          <p className="recovery-kicker">Compliance honesty</p>
          <h2>No fake badges, no pretend legal policy.</h2>
          <p>
            Dash Dental should not claim SOC 2, HIPAA, ISO, or equivalent certification
            unless the audits, agreements, and required procedures are actually complete.
            This plain-English summary is not a substitute for legal review.
          </p>
        </div>
        <div className="trust-list">
          {[
            "Human-reviewed AI drafts",
            "No sale of clinic or patient data",
            "Export or deletion requests through privacy contact",
            "Security reports through security contact",
            "Support questions through support contact",
          ].map((item) => (
            <span key={item}>
              <ShieldCheck size={15} />
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="trust-panel split">
        <div>
          <p className="recovery-kicker">Contacts</p>
          <h2>Use the right address for the request.</h2>
        </div>
        <div className="trust-list contact-list">
          <Link href={`mailto:${privacyEmail}`}>{privacyEmail}</Link>
          <Link href={`mailto:${securityEmail}`}>{securityEmail}</Link>
          <Link href={`mailto:${supportEmail}`}>{supportEmail}</Link>
        </div>
      </div>
    </TrustPageShell>
  );
}
