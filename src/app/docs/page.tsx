import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CalendarCheck2,
  CircleDollarSign,
  Inbox,
  ListChecks,
  ShieldCheck,
  Users,
} from "lucide-react";
import { SiteShell } from "@/features/design-system/components/site-shell";
import { MarketingFooter } from "@/features/marketing/components/marketing-footer";
import { MarketingNav } from "@/features/marketing/components/marketing-nav";

const docSections = [
  {
    icon: CircleDollarSign,
    title: "Revenue and risk tiles",
    body:
      "The first row shows revenue under risk, recovered revenue, unanswered patients, average first response, and booked patients. Use it as the owner snapshot for today.",
  },
  {
    icon: ListChecks,
    title: "Recover now queue",
    body:
      "This is the daily work list. Reply to the highest-risk patient first, then move through the queue by SLA pressure and estimated value.",
  },
  {
    icon: Inbox,
    title: "Inbox and conversations",
    body:
      "Open Inbox to see patient messages by source. Each thread keeps channel, patient context, suggested reply, and delivery state together.",
  },
  {
    icon: Bot,
    title: "Ask AI",
    body:
      "Ask AI can summarize patients, revenue pressure, plan limits, and reply drafts. It is a drafting assistant, not an automatic sender or medical decision maker.",
  },
  {
    icon: CalendarCheck2,
    title: "Calendar and next action",
    body:
      "Calendar cards show booking context and upcoming visits. Next Action explains what the front desk should do to move a patient toward a booked visit.",
  },
  {
    icon: Users,
    title: "Team, roles, and setup",
    body:
      "Setup tracks launch readiness. Team access should match daily roles: owner for business oversight, admin for configuration, manager for operations.",
  },
];

export const metadata: Metadata = {
  title: "Dashboard Docs — Dash Dental",
  description:
    "A practical guide to using the Dash Dental dashboard, inbox, queue, AI helper, billing, and setup views.",
  alternates: {
    canonical: "/docs",
  },
};

export default function DocsPage() {
  return (
    <SiteShell>
      <main className="recovery-landing docs-page dash-marketing">
      <section className="recovery-hero docs-hero">
        <MarketingNav launchPage="/docs" />
        <div className="docs-hero-grid">
          <div className="docs-hero-copy">
            <span className="recovery-beta-badge">Dashboard docs</span>
            <h1>Use Dash Dental as a daily missed-message recovery dashboard.</h1>
            <p>
              This guide explains what every major dashboard area is for, how to
              decide what to do first, and where to go when billing or setup blocks work.
            </p>
            <div className="recovery-hero-actions">
              <Link className="recovery-primary-button" href="/dashboard">
                Open dashboard
                <ArrowRight size={16} />
              </Link>
              <Link className="recovery-secondary-button" href="/support">
                Contact support
              </Link>
            </div>
          </div>
          <div className="docs-map-panel" aria-label="Dashboard map">
            <div className="docs-map-row active">
              <span>01</span>
              <strong>Check risk tiles</strong>
              <small>Know if money is leaking today.</small>
            </div>
            <div className="docs-map-row">
              <span>02</span>
              <strong>Open the queue</strong>
              <small>Reply to highest-risk patients first.</small>
            </div>
            <div className="docs-map-row">
              <span>03</span>
              <strong>Use Inbox</strong>
              <small>Keep patient context and replies together.</small>
            </div>
            <div className="docs-map-row">
              <span>04</span>
              <strong>Review billing and setup</strong>
              <small>Keep access, channels, and limits healthy.</small>
            </div>
          </div>
        </div>
      </section>

      <section className="recovery-section docs-guide-section">
        <div className="recovery-section-heading">
          <p className="recovery-kicker">Dashboard guide</p>
          <h2>What to look at first</h2>
          <p>
            Start from the top summary, then work the queue. The dashboard is designed
            for repeated daily use, not long exploration.
          </p>
        </div>
        <div className="docs-card-grid">
          {docSections.map((section) => (
            <article className="docs-card" key={section.title}>
              <section.icon size={20} />
              <strong>{section.title}</strong>
              <p>{section.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="recovery-section docs-playbook-section">
        <div className="docs-playbook">
          <div>
            <p className="recovery-kicker">Daily playbook</p>
            <h2>Simple operating rhythm</h2>
          </div>
          <ol>
            <li>Check unanswered patients and revenue under risk.</li>
            <li>Open the priority queue and handle the oldest high-value conversations.</li>
            <li>Use Ask AI for a reply draft when context is unclear.</li>
            <li>Confirm booking details in the calendar or patient thread.</li>
            <li>Review setup and billing if access, channels, or plan limits block work.</li>
          </ol>
          <div className="docs-boundary-note">
            <ShieldCheck size={18} />
            <span>
              Human review is required before sending patient replies. Dash Dental is
              for lead intake and front-desk recovery, not diagnosis or medical records.
            </span>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </main>
    </SiteShell>
  );
}
