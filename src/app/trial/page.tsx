import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, CreditCard, Database, LockKeyhole } from "lucide-react";
import { TrustPageShell } from "@/features/marketing/components/trust-page-shell";

export const metadata: Metadata = {
  title: "Start Trial — Dash Dental",
  description:
    "Understand the 14-day Dash Dental guided trial, what is included, what happens after trial, and how billing activation works.",
  alternates: {
    canonical: "/trial",
  },
};

const trialSteps = [
  {
    icon: CheckCircle2,
    title: "During the 14-day guided trial",
    text: "Create the owner workspace, invite the front desk, review demo data, connect safe intake channels, and validate the recovery queue.",
  },
  {
    icon: LockKeyhole,
    title: "After the trial",
    text: "If billing is not activated, paid workflow screens move to a locked state. Owners keep read access to billing, setup, and export paths.",
  },
  {
    icon: CreditCard,
    title: "Activation paths",
    text: "Request a manual invoice now, or use Stripe checkout later when company and provider setup are ready.",
  },
  {
    icon: Database,
    title: "Data retention",
    text: "Trial data remains available for reasonable billing, support, and export workflows. Stricter retention can be handled by support.",
  },
] as const;

export default function TrialPage() {
  return (
    <TrustPageShell
      description="A buyer-safe explanation of the 14-day guided trial, limits, locked state, billing activation, and data retention."
      kicker="Trial flow"
      primaryActionHref="/register"
      title="Try Dash Dental for 14 days without guessing what happens next."
    >
      <div className="trust-card-grid two-column">
        {trialSteps.map((step) => (
          <article className="trust-card" key={step.title}>
            <step.icon size={20} />
            <strong>{step.title}</strong>
            <p>{step.text}</p>
          </article>
        ))}
      </div>

      <div className="trust-warning-card">
        <LockKeyhole size={20} />
        <div>
          <strong>Locked does not mean deleted</strong>
          <p>
            The paid recovery surfaces lock after trial expiration, but owners should still
            understand their plan, request an invoice, and coordinate export or retention with support.
          </p>
        </div>
        <Link className="recovery-secondary-button" href="/pricing">
          Compare plans
        </Link>
      </div>

      <div className="trust-cta-panel">
        <div>
          <ArrowRight size={20} />
          <span>Ready to create the trial workspace?</span>
        </div>
        <Link
          className="recovery-white-button"
          data-launch-event="public.trial.start_clicked"
          data-launch-page="/trial"
          data-launch-section="trial-cta"
          data-launch-target="/register"
          href="/register"
        >
          Start 14-day guided trial
          <ArrowRight size={16} />
        </Link>
      </div>
    </TrustPageShell>
  );
}
