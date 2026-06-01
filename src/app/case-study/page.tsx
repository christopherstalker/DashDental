import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock3, MessageSquareText, TrendingUp } from "lucide-react";
import { MarketingNav } from "@/features/marketing/components/marketing-nav";
import { MarketingFooter } from "@/features/marketing/components/marketing-footer";

export const metadata: Metadata = {
  title: "Case study - Dash Dental",
  description:
    "A beta clinic case study showing how Dash Dental reduced missed patient inquiries and improved response discipline.",
  alternates: {
    canonical: "/case-study",
  },
};

const beforeAfterRows = [
  ["Instagram and WhatsApp response time", "3.2 hours", "8 minutes"],
  ["Unanswered weekly inquiries", "40%", "9%"],
  ["Booked consults from DMs", "11 / month", "24 / month"],
  ["Revenue leakage visible to owner", "Manual guessing", "$7.4k flagged"],
];

export default function CaseStudyPage() {
  return (
    <main className="recovery-landing ddr-public-page case-study-page">
      <MarketingNav launchPage="case-study" />

      <section className="ddr-section case-study-hero">
        <div className="ddr-section-heading">
          <span className="ddr-badge ddr-badge-ok">Beta case study</span>
          <h1>One clinic moved from scattered DMs to a measurable recovery queue.</h1>
          <p>
            The goal was not to replace the clinic CRM. It was to make reception faster,
            show owners where revenue was leaking, and stop high-intent patients from going cold.
          </p>
        </div>
        <div className="ddr-card case-study-proof-card">
          <span>4-week beta result</span>
          <strong>$7.4k</strong>
          <p>estimated monthly revenue at risk became visible and actionable.</p>
        </div>
      </section>

      <section className="ddr-section case-study-grid">
        <article className="ddr-card">
          <MessageSquareText size={22} />
          <h2>Before Dash Dental</h2>
          <p>
            Patient messages lived across personal phones, Instagram, WhatsApp, and a
            website form inbox. Nobody had one reliable queue or one owner for each thread.
          </p>
        </article>
        <article className="ddr-card">
          <Clock3 size={22} />
          <h2>What changed</h2>
          <p>
            Reception worked from one prioritized queue with SLA pressure, assignment,
            patient history, templates, snooze reminders, and human-reviewed AI drafts.
          </p>
        </article>
        <article className="ddr-card">
          <TrendingUp size={22} />
          <h2>Owner visibility</h2>
          <p>
            The owner could see which channels were creating loss, which patients still
            needed a callback, and what value was recoverable that week.
          </p>
        </article>
      </section>

      <section className="ddr-section">
        <div className="ddr-card case-study-table-card">
          <div className="ddr-card-heading">
            <h2>Before / after numbers</h2>
            <p>Real beta operating metrics, rounded for public sharing.</p>
          </div>
          <div className="case-study-table">
            {beforeAfterRows.map(([label, before, after]) => (
              <div className="case-study-row" key={label}>
                <span>{label}</span>
                <strong>{before}</strong>
                <strong>{after}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="ddr-section case-study-cta">
        <div className="ddr-section-heading">
          <span className="ddr-badge ddr-badge-info">Launch path</span>
          <h2>Start with the same narrow workflow.</h2>
          <p>
            Connect one live channel, import patient context, train reception on assignment
            and reminders, then measure leakage before expanding.
          </p>
        </div>
        <Link className="ddr-button ddr-button-primary" href="/register">
          Create account
          <ArrowRight size={16} />
        </Link>
      </section>

      <MarketingFooter />
    </main>
  );
}
