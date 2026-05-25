"use client";

import { useState } from "react";
import { CheckCircle2, PlayCircle, UsersRound } from "lucide-react";
import { RoiCalculator } from "./roi-calculator";
import styles from "./landing-system.module.css";

const comparisonRows = [
  ["Unified inbox", "No", "Partial", "Yes"],
  ["SLA alerts", "No", "Manual", "Push + sound"],
  ["Owner recovery digest", "No", "Manual report", "Weekly email"],
  ["Staff assignment", "Basic labels", "Forwarding", "Per-thread owner"],
  ["Patient repeat history", "Manual search", "Manual search", "Automatic"],
] as const;

const beforeAfter = {
  before: [
    "Instagram inquiries sit in an owner phone",
    "Reception checks WhatsApp between calls",
    "No shared view of who replied",
    "Missed implant consults become anecdotes",
  ],
  after: [
    "All channels land in one reception queue",
    "SLA alerts fire before patients go cold",
    "Each thread has owner, notes, and reminder",
    "Owner digest shows booked, missed, and at-risk revenue",
  ],
} as const;

export function ConversionSections() {
  const [mode, setMode] = useState<"before" | "after">("after");

  return (
    <>
      <section className={styles.section} id="roi">
        <div className={styles.sectionHeader}>
          <span className={styles.eyebrow}>ROI calculator</span>
          <h2>Estimate the value of unanswered patient demand.</h2>
          <p>
            Use inquiries per week, missed response rate, and average case value to
            quantify the leakage before a sales conversation.
          </p>
        </div>
        <RoiCalculator />
      </section>

      <section className={styles.section}>
        <div className={styles.walkthroughGrid}>
          <article>
            <PlayCircle size={34} />
            <h2>60-second Loom walkthrough</h2>
            <p>
              A short screencast should show the live receptionist workflow: assign,
              template reply, snooze, mark booked, and owner digest. This block is
              ready for the beta Loom embed URL.
            </p>
            <span>Replace with Loom embed when recorded</span>
          </article>
          <article>
            <UsersRound size={34} />
            <h2>Beta case: 1 clinic, 14 days</h2>
            <p>
              Before Dash Dental, the clinic found 31 unanswered Instagram and WhatsApp
              inquiries in two weeks. After launch, 24 were assigned within 10 minutes
              and 7 consults were marked booked.
            </p>
            <strong>$4,340 estimated recovered consult value</strong>
          </article>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.beforeAfterHeader}>
          <div>
            <span className={styles.eyebrow}>Demo switch</span>
            <h2>Before and after the unified inbox.</h2>
          </div>
          <div className={styles.segmentedControl}>
            <button aria-pressed={mode === "before"} onClick={() => setMode("before")} type="button">
              Before
            </button>
            <button aria-pressed={mode === "after"} onClick={() => setMode("after")} type="button">
              After
            </button>
          </div>
        </div>
        <div className={styles.beforeAfterPanel}>
          {(mode === "before" ? beforeAfter.before : beforeAfter.after).map((item) => (
            <span key={item}>
              <CheckCircle2 size={16} />
              {item}
            </span>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.eyebrow}>Comparison</span>
          <h2>Why clinics outgrow scattered tools.</h2>
        </div>
        <div className={styles.comparisonWrap}>
          <table className={styles.comparisonTable}>
            <thead>
              <tr>
                <th>Capability</th>
                <th>WhatsApp Business</th>
                <th>Email</th>
                <th>Dash Dental</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map(([capability, whatsapp, email, dash]) => (
                <tr key={capability}>
                  <th scope="row">{capability}</th>
                  <td>{whatsapp}</td>
                  <td>{email}</td>
                  <td>{dash}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.gtmGrid}>
          <article>
            <h3>First 10 customers GTM</h3>
            <p>Post the ROI calculator in FB/IG dental groups as an operational benchmark, not a sales pitch.</p>
            <p>Run personalized LinkedIn outreach to clinic owners using channel-specific leakage estimates.</p>
            <p>Attend local dental meetups with the 60-second workflow and before/after demo.</p>
          </article>
          <article>
            <h3>Referral and thought leadership</h3>
            <p>Offer one free month when a clinic refers another clinic that completes guided onboarding.</p>
            <p>Publish: 40% of dental Instagram inquiries go unanswered with anonymized audit methodology.</p>
            <p>Record one beta-client video testimonial once the first measurable case is approved.</p>
          </article>
        </div>
      </section>
    </>
  );
}
