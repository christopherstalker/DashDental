"use client";

import { useMemo, useState } from "react";
import {
  Bot,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  DollarSign,
  Inbox,
  MessageCircle,
  ShieldCheck,
  Siren,
  type LucideIcon,
} from "lucide-react";

interface DemoStep {
  id: string;
  title: string;
  time: string;
  channel: string;
  patient: string;
  value: string;
  risk: string;
  ownerView: string;
  staffAction: string;
  proof: string;
  icon: LucideIcon;
}

const demoSteps: DemoStep[] = [
  {
    id: "message",
    title: "Patient message arrives",
    time: "09:12",
    channel: "Instagram",
    patient: "Maria S.",
    value: "$1,200 implant consult",
    risk: "New lead",
    ownerView: "A new high-value consult enters the dashboard instead of staying hidden in DMs.",
    staffAction: "The front desk sees patient name, channel, last message, and estimated value.",
    proof: "Inbound channel activity creates a clinic-scoped conversation and lead record.",
    icon: MessageCircle,
  },
  {
    id: "sla",
    title: "SLA risk starts",
    time: "09:17",
    channel: "Instagram",
    patient: "Maria S.",
    value: "$1,200 at risk",
    risk: "5 min warning",
    ownerView: "Money at risk moves from invisible to visible before the patient disappears.",
    staffAction: "The queue ranks Maria above lower-value, lower-risk conversations.",
    proof: "Rules use first-message time, response state, and clinic value assumptions.",
    icon: Clock3,
  },
  {
    id: "queue",
    title: "Receptionist sees queue",
    time: "09:19",
    channel: "Instagram",
    patient: "Maria S.",
    value: "$1,200 recoverable",
    risk: "High priority",
    ownerView: "The owner sees exactly which patients need action today.",
    staffAction: "Staff gets one next action: offer a concrete appointment slot and ask for phone.",
    proof: "The queue sorts by SLA pressure, estimated value, and waiting time.",
    icon: Inbox,
  },
  {
    id: "assist",
    title: "AI assist drafts reply",
    time: "09:20",
    channel: "Instagram",
    patient: "Maria S.",
    value: "$1,200 protected",
    risk: "Human review",
    ownerView: "AI speeds up the team without making billing, access, or medical decisions.",
    staffAction: "Reception edits the suggested reply before sending it from the workspace.",
    proof: "AI is advisory; deterministic rules remain the source of truth.",
    icon: Bot,
  },
  {
    id: "booked",
    title: "Lead gets booked",
    time: "09:24",
    channel: "Instagram",
    patient: "Maria S.",
    value: "$1,200 saved revenue",
    risk: "Recovered",
    ownerView: "Recovered revenue and booked leads show why the subscription pays for itself.",
    staffAction: "Staff marks the consult booked and keeps the handoff note attached.",
    proof: "Booked status updates owner reporting, lead history, and audit context.",
    icon: CalendarCheck2,
  },
];

export function RecoveryFlowDemo() {
  const [activeId, setActiveId] = useState(demoSteps[0].id);
  const activeIndex = Math.max(
    0,
    demoSteps.findIndex((step) => step.id === activeId),
  );
  const active = demoSteps[activeIndex];
  const Icon = active.icon;
  const completed = useMemo(
    () => demoSteps.slice(0, activeIndex + 1).map((step) => step.id),
    [activeIndex],
  );

  return (
    <div className="recovery-demo-shell">
      <div className="recovery-demo-tabs" role="tablist" aria-label="Recovery flow steps">
        {demoSteps.map((step, index) => {
          const StepIcon = step.icon;

          return (
            <button
              aria-pressed={step.id === active.id}
              className={step.id === active.id ? "active" : ""}
              key={step.id}
              onClick={() => setActiveId(step.id)}
              type="button"
            >
              <StepIcon size={16} />
              <span>{index + 1}</span>
            </button>
          );
        })}
      </div>

      <div className="recovery-demo-grid">
        <section className="recovery-demo-panel live-inbox">
          <div className="demo-panel-heading">
            <div>
              <p className="recovery-kicker">Live inbox</p>
              <h2>{active.title}</h2>
            </div>
            <span>{active.time}</span>
          </div>
          <div className="demo-thread-card">
            <div className="demo-avatar">{active.patient.slice(0, 1)}</div>
            <div>
              <strong>{active.patient}</strong>
              <span>{active.channel}</span>
            </div>
            <em>{active.risk}</em>
          </div>
          <div className="demo-message-list">
            <p className="patient-message">
              Hi, I want to know implant options and the earliest appointment this week.
            </p>
            {completed.includes("assist") ? (
              <p className="assistant-message">
                We can offer a consult tomorrow at 11:30 or Friday at 16:00. Which time works for you?
              </p>
            ) : null}
            {completed.includes("booked") ? (
              <p className="system-message">
                Booked consult. Owner report updated with saved revenue.
              </p>
            ) : null}
          </div>
        </section>

        <section className="recovery-demo-panel owner-proof">
          <div className="demo-panel-heading">
            <div>
              <p className="recovery-kicker">Owner proof</p>
              <h2>Money at risk becomes work to do.</h2>
            </div>
            <Icon size={22} />
          </div>
          <div className="demo-metric-stack">
            <article>
              <DollarSign size={18} />
              <span>Estimated value</span>
              <strong>{active.value}</strong>
            </article>
            <article>
              <Siren size={18} />
              <span>SLA state</span>
              <strong>{active.risk}</strong>
            </article>
            <article>
              <ShieldCheck size={18} />
              <span>Control</span>
              <strong>Tenant scoped</strong>
            </article>
          </div>
          <div className="demo-proof-copy">
            <p>{active.ownerView}</p>
            <p>{active.staffAction}</p>
            <small>
              <CheckCircle2 size={14} />
              {active.proof}
            </small>
          </div>
        </section>
      </div>

      <div className="demo-before-after-grid">
        <article>
          <span>Before</span>
          <strong>Messages spread across channels</strong>
          <p>No owner-level view of who waited, who was worth saving, or which channel leaked.</p>
        </article>
        <article>
          <span>After</span>
          <strong>One recovery queue</strong>
          <p>Patients are ranked by urgency and value, with next action and revenue proof attached.</p>
        </article>
      </div>
    </div>
  );
}
