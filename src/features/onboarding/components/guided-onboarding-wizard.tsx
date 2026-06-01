"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  PhoneCall,
  PlugZap,
  UserPlus,
} from "lucide-react";

type Step = "welcome" | "pms" | "phone" | "recall" | "invite" | "done";

interface ProgressItem {
  step: Step;
  completedAt: string | null;
  data: Record<string, unknown>;
}

interface Summary {
  activatedAt: string | null;
  currentStep: Step;
  progress: ProgressItem[];
  steps: Step[];
}

interface GuidedOnboardingWizardProps {
  clinicName: string;
  timezone: string;
}

const stepMeta: Record<Step, { title: string; detail: string }> = {
  welcome: {
    title: "Clinic profile",
    detail: "Confirm workspace identity and operating timezone.",
  },
  pms: {
    title: "PMS sync",
    detail: "Connect Jane App, Cliniko, or Mindbody as the appointment source of truth.",
  },
  phone: {
    title: "Phone capture",
    detail: "Prepare missed-call intake and SMS auto-reply.",
  },
  recall: {
    title: "Recall preview",
    detail: "Preview the first appointment reminder from synced data.",
  },
  invite: {
    title: "Invite teammate",
    detail: "Bring the front desk into the workspace.",
  },
  done: {
    title: "Activate clinic",
    detail: "Mark the workspace as live and notify the internal launch channel.",
  },
};

const stepIcons = {
  welcome: ClipboardCheck,
  pms: PlugZap,
  phone: PhoneCall,
  recall: CalendarCheck2,
  invite: UserPlus,
  done: CheckCircle2,
};

function onboardingStepEndpoint(step: Step): string {
  if (!(step in stepMeta)) {
    throw new Error("Invalid onboarding step.");
  }

  return `/api/onboarding/${step}`;
}

async function readJson(response: Response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof payload.error === "string" ? payload.error : "Onboarding request failed.",
    );
  }

  return payload;
}

export function GuidedOnboardingWizard({
  clinicName,
  timezone,
}: GuidedOnboardingWizardProps) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [activeStep, setActiveStep] = useState<Step>("welcome");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    apiKey: "",
    appointmentId: "",
    baseUrl: "",
    clinicName,
    email: "",
    inviteName: "",
    phoneNumber: "",
    provider: "jane_app",
    role: "manager",
    sendPreview: false,
    smsAutoReplyEnabled: true,
    testSync: false,
    timezone,
    webhookSecret: "",
  });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/onboarding/welcome", { cache: "no-store" })
      .then(readJson)
      .then((payload) => {
        if (cancelled) {
          return;
        }
        setSummary(payload.summary);
        setActiveStep(payload.summary?.currentStep ?? "welcome");
      })
      .catch((requestError: Error) => {
        if (!cancelled) {
          setError(requestError.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const steps = summary?.steps ?? (Object.keys(stepMeta) as Step[]);
  const completed = useMemo(
    () => new Set((summary?.progress ?? []).filter((item) => item.completedAt).map((item) => item.step)),
    [summary],
  );
  const completedCount = completed.size;
  const progress = Math.round((completedCount / steps.length) * 100);

  function setField<Key extends keyof typeof form>(key: Key, value: (typeof form)[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submitStep(step: Step) {
    setError("");
    setSuccess("");
    startTransition(async () => {
      try {
        const payload =
          step === "welcome"
            ? { clinicName: form.clinicName, timezone: form.timezone }
            : step === "pms"
              ? {
                  provider: form.provider,
                  apiKey: form.apiKey,
                  baseUrl: form.baseUrl,
                  webhookSecret: form.webhookSecret,
                  testSync: form.testSync,
                }
              : step === "phone"
                ? {
                    phoneNumber: form.phoneNumber,
                    smsAutoReplyEnabled: form.smsAutoReplyEnabled,
                  }
                : step === "recall"
                  ? {
                      appointmentId: form.appointmentId,
                      sendPreview: form.sendPreview,
                    }
                  : {
                      email: form.email,
                      name: form.inviteName,
                      role: form.role,
                    };
        const response = await fetch(onboardingStepEndpoint(step), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const next = await readJson(response);
        setSummary(next.summary);
        const nextIndex = Math.min(steps.indexOf(step) + 1, steps.length - 1);
        setActiveStep(steps[nextIndex] ?? "done");
        setSuccess(`${stepMeta[step].title} saved.`);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Onboarding failed.");
      }
    });
  }

  function complete() {
    setError("");
    setSuccess("");
    startTransition(async () => {
      try {
        const response = await fetch("/api/onboarding/complete", { method: "POST" });
        const payload = await readJson(response);
        setSummary(payload.summary);
        setSuccess("Clinic workspace activated.");
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Activation failed.");
      }
    });
  }

  return (
    <section className="guided-onboarding">
      <div className="guided-onboarding__header">
        <div>
          <p className="eyebrow">Guided release setup</p>
          <h2>Get this clinic live without support handoff</h2>
          <p>
            Complete the operational path: profile, PMS sync, phone capture, recall preview, team invite, and activation.
          </p>
        </div>
        <div className="guided-onboarding__meter">
          <strong>{progress}%</strong>
          <span>{completedCount}/{steps.length} complete</span>
        </div>
      </div>

      <div className="guided-onboarding__progress" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>

      {error ? <div className="guided-onboarding__alert danger">{error}</div> : null}
      {success ? <div className="guided-onboarding__alert success">{success}</div> : null}

      <div className="guided-onboarding__body">
        <nav className="guided-onboarding__steps" aria-label="Onboarding steps">
          {steps.map((step) => {
            const Icon = stepIcons[step];
            const isActive = activeStep === step;
            const isDone = completed.has(step);
            return (
              <button
                className={isActive ? "active" : ""}
                key={step}
                onClick={() => setActiveStep(step)}
                type="button"
              >
                <Icon size={16} />
                <span>{stepMeta[step].title}</span>
                {isDone ? <CheckCircle2 size={14} /> : null}
              </button>
            );
          })}
        </nav>

        <div className="guided-onboarding__panel">
          <div className="guided-onboarding__panel-head">
            <div>
              <p className="eyebrow">{activeStep}</p>
              <h3>{stepMeta[activeStep].title}</h3>
              <p>{stepMeta[activeStep].detail}</p>
            </div>
          </div>

          {activeStep === "welcome" ? (
            <div className="guided-onboarding__form two">
              <label>
                Clinic name
                <input
                  value={form.clinicName}
                  onChange={(event) => setField("clinicName", event.target.value)}
                />
              </label>
              <label>
                Timezone
                <input
                  value={form.timezone}
                  onChange={(event) => setField("timezone", event.target.value)}
                />
              </label>
              <button className="primary-button" disabled={isPending} onClick={() => submitStep("welcome")} type="button">
                {isPending ? <Loader2 size={16} className="spin" /> : <ArrowRight size={16} />}
                Save profile
              </button>
            </div>
          ) : null}

          {activeStep === "pms" ? (
            <div className="guided-onboarding__form two">
              <label>
                PMS provider
                <select value={form.provider} onChange={(event) => setField("provider", event.target.value)}>
                  <option value="jane_app">Jane App</option>
                  <option value="cliniko">Cliniko</option>
                  <option value="mindbody">Mindbody</option>
                </select>
              </label>
              <label>
                API key
                <input
                  type="password"
                  value={form.apiKey}
                  onChange={(event) => setField("apiKey", event.target.value)}
                  placeholder="Stored encrypted"
                />
              </label>
              <label>
                API base URL
                <input
                  value={form.baseUrl}
                  onChange={(event) => setField("baseUrl", event.target.value)}
                  placeholder="https://api.vendor.com"
                />
              </label>
              <label>
                Webhook secret
                <input
                  type="password"
                  value={form.webhookSecret}
                  onChange={(event) => setField("webhookSecret", event.target.value)}
                />
              </label>
              <label className="guided-onboarding__check">
                <input
                  checked={form.testSync}
                  onChange={(event) => setField("testSync", event.target.checked)}
                  type="checkbox"
                />
                Run test sync when base URL is available
              </label>
              <button className="primary-button" disabled={isPending} onClick={() => submitStep("pms")} type="button">
                {isPending ? <Loader2 size={16} className="spin" /> : <PlugZap size={16} />}
                Save PMS
              </button>
            </div>
          ) : null}

          {activeStep === "phone" ? (
            <div className="guided-onboarding__form two">
              <label>
                Clinic phone number
                <input
                  value={form.phoneNumber}
                  onChange={(event) => setField("phoneNumber", event.target.value)}
                  placeholder="+15551234567"
                />
              </label>
              <label className="guided-onboarding__check">
                <input
                  checked={form.smsAutoReplyEnabled}
                  onChange={(event) => setField("smsAutoReplyEnabled", event.target.checked)}
                  type="checkbox"
                />
                Send instant SMS after missed call
              </label>
              <button className="primary-button" disabled={isPending} onClick={() => submitStep("phone")} type="button">
                {isPending ? <Loader2 size={16} className="spin" /> : <PhoneCall size={16} />}
                Save phone capture
              </button>
            </div>
          ) : null}

          {activeStep === "recall" ? (
            <div className="guided-onboarding__form">
              <label>
                Appointment ID
                <input
                  value={form.appointmentId}
                  onChange={(event) => setField("appointmentId", event.target.value)}
                  placeholder="Leave empty to use the next synced appointment"
                />
              </label>
              <label className="guided-onboarding__check">
                <input
                  checked={form.sendPreview}
                  onChange={(event) => setField("sendPreview", event.target.checked)}
                  type="checkbox"
                />
                Mark preview as sent
              </label>
              <button className="primary-button" disabled={isPending} onClick={() => submitStep("recall")} type="button">
                {isPending ? <Loader2 size={16} className="spin" /> : <CalendarCheck2 size={16} />}
                Generate recall preview
              </button>
            </div>
          ) : null}

          {activeStep === "invite" ? (
            <div className="guided-onboarding__form two">
              <label>
                Teammate name
                <input value={form.inviteName} onChange={(event) => setField("inviteName", event.target.value)} />
              </label>
              <label>
                Teammate email
                <input value={form.email} onChange={(event) => setField("email", event.target.value)} />
              </label>
              <label>
                Role
                <select value={form.role} onChange={(event) => setField("role", event.target.value)}>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                </select>
              </label>
              <button className="primary-button" disabled={isPending} onClick={() => submitStep("invite")} type="button">
                {isPending ? <Loader2 size={16} className="spin" /> : <UserPlus size={16} />}
                Send invite
              </button>
            </div>
          ) : null}

          {activeStep === "done" ? (
            <div className="guided-onboarding__finish">
              <CheckCircle2 size={34} />
              <h3>{summary?.activatedAt ? "Clinic is activated" : "Ready to activate"}</h3>
              <p>
                Activation records the workspace as live and sends the internal release notification.
              </p>
              <button className="primary-button" disabled={isPending || Boolean(summary?.activatedAt)} onClick={complete} type="button">
                {isPending ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />}
                {summary?.activatedAt ? "Activated" : "Activate clinic"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
