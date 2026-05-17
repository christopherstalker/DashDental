"use client";

import { useState } from "react";
import styles from "./landing-system.module.css";

const recoverySteps = [
  {
    description: "A patient asks about pain, pricing, or availability in a patient channel.",
    signal: "Inbound",
    title: "Patient message arrives",
  },
  {
    description: "Dash Dental starts measuring first-response pressure immediately.",
    signal: "Timer",
    title: "SLA timer starts",
  },
  {
    description: "Urgency, wait time, channel, and value assumptions move the thread up.",
    signal: "Risk",
    title: "Risk is detected",
  },
  {
    description: "AI summarizes intent and prepares a receptionist-safe draft.",
    signal: "Draft",
    title: "AI drafts the reply",
  },
  {
    description: "Reception reviews the draft, edits it, and sends the human response.",
    signal: "Approve",
    title: "Staff approves",
  },
  {
    description: "The patient receives concrete appointment options and a clear next step.",
    signal: "Booked",
    title: "Patient books",
  },
  {
    description: "Owners see protected conversations, response speed, and remaining leakage.",
    signal: "Recovered",
    title: "Owner sees revenue",
  },
] as const;

export function RecoveryFlow() {
  const [activeIndex, setActiveIndex] = useState(2);
  const active = recoverySteps[activeIndex];

  return (
    <div className={styles.flowShell}>
      <div aria-label="Recovery pipeline" className={styles.flowTrack} role="list">
        {recoverySteps.map((step, index) => (
          <button
            aria-pressed={activeIndex === index}
            className={styles.flowNode}
            key={step.title}
            onClick={() => setActiveIndex(index)}
            onFocus={() => setActiveIndex(index)}
            onMouseEnter={() => setActiveIndex(index)}
            type="button"
          >
            <span className={styles.flowIndex}>{String(index + 1).padStart(2, "0")}</span>
            <span>{step.signal}</span>
            <strong>{step.title}</strong>
            <small>{step.description}</small>
          </button>
        ))}
      </div>

      <aside className={styles.timelineDetail} aria-live="polite">
        <div>
          <span className={styles.eyebrow}>Active recovery step</span>
          <strong>{active.title}</strong>
        </div>
        <p>{active.description}</p>
      </aside>
    </div>
  );
}
