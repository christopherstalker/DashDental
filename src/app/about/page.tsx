import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleSlash, HeartHandshake } from "lucide-react";
import { TrustPageShell } from "@/features/marketing/components/trust-page-shell";
import {
  primaryCta,
  supportEmail,
} from "@/features/marketing/content/dash-dental";

export const metadata: Metadata = {
  title: "About — Dash Dental",
  description:
    "Dash Dental is built for dental teams that cannot afford to miss patient messages across WhatsApp, Instagram, Telegram, and website forms.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About — Dash Dental",
    description:
      "Learn why Dash Dental focuses on missed-message recovery for dental clinics.",
    url: "/about",
  },
};

const whatWeAre = [
  "A recovery queue for inbound patient messages",
  "Owner visibility into missed-message risk",
  "A front-desk workflow for follow-up",
  "Human-reviewed AI assistance",
] as const;

const whatWeAreNot = [
  "Not a full EHR",
  "Not a replacement for clinical judgment",
  "Not a bloated CRM migration",
  "Not an autonomous medical chatbot",
] as const;

export default function AboutPage() {
  return (
    <TrustPageShell
      description="Dash Dental focuses on one painful operational gap: patients already reached out, but the clinic answered too late or not at all."
      kicker="Company"
      launchPage="/about"
      primaryActionHref="/support#request"
      primaryActionLabel={primaryCta}
      title="Built for dental teams that cannot afford to miss patient messages."
    >
      <div className="trust-panel split">
        <div>
          <p className="recovery-kicker">Why we exist</p>
          <h2>Owners should not need to inspect every inbox to find lost patients.</h2>
          <p>
            Dental owners already pay to create demand through referrals, ads, websites,
            and social channels. Dash Dental helps make the missed-message leak visible
            before a high-intent patient goes elsewhere.
          </p>
        </div>
        <div className="about-principle-card">
          <HeartHandshake size={22} />
          <strong>Keep the existing systems.</strong>
          <p>
            Dash Dental sits on top of patient channels and focuses on recovery work,
            not ripping out the current clinic tools.
          </p>
        </div>
      </div>

      <div className="trust-card-grid two-column">
        <article className="trust-card">
          <CheckCircle2 size={20} />
          <strong>What we are</strong>
          <ul className="trust-plain-list">
            {whatWeAre.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article className="trust-card">
          <CircleSlash size={20} />
          <strong>What we are not</strong>
          <ul className="trust-plain-list">
            {whatWeAreNot.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </div>

      <div className="trust-panel split">
        <div>
          <p className="recovery-kicker">Company details</p>
          <h2>Vendor details are handled during commercial review.</h2>
          <p>
            The repository does not contain verified founder, legal entity, registration,
            or office address details. We avoid inventing them on the public site; they
            should be confirmed before broad commercial launch or enterprise procurement.
          </p>
        </div>
        <div className="trust-list contact-list">
          <Link href={`mailto:${supportEmail}`}>{supportEmail}</Link>
        </div>
      </div>

      <div className="trust-cta-panel">
        <div>
          <ArrowRight size={20} />
          <span>Want to see how missed-message recovery fits your clinic?</span>
        </div>
        <Link className="recovery-white-button" href="/support#request">
          {primaryCta}
          <ArrowRight size={16} />
        </Link>
      </div>
    </TrustPageShell>
  );
}
