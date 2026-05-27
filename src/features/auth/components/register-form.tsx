"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { sendLaunchEvent } from "@/features/launch-analytics/components/launch-event-tracker";
import { TurnstileChallenge } from "./turnstile-challenge";

type Currency = "USD" | "EUR" | "UAH";

function authErrorMessage(code?: string, fallback = "Could not create workspace.") {
  if (code === "bot_protection_required") {
    return "Complete the bot protection challenge before creating the account.";
  }
  if (code === "bot_protection_failed") {
    return "Bot protection could not verify this browser. Try the challenge again.";
  }
  if (code === "bot_protection_not_configured") {
    return "Account signup is temporarily unavailable while bot protection is being configured.";
  }

  return fallback;
}

export function RegisterForm({ turnstileSiteKey }: { turnstileSiteKey?: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clinicName, setClinicName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [timezone, setTimezone] = useState("Europe/Kiev");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (turnstileSiteKey && !turnstileToken) {
      setError("Complete the bot protection challenge before creating the account.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/v1/auth/register", {
        credentials: "same-origin",
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clinicName,
          ownerName,
          email,
          password,
          timezone,
          currency,
          turnstileToken,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        code?: string;
        error?: string;
      };

      if (!response.ok) {
        setError(authErrorMessage(result.code, result.error ?? "Could not create workspace."));
        setTurnstileResetKey((value) => value + 1);
        setIsSubmitting(false);
        return;
      }

      sendLaunchEvent({
        event: "auth.register.created",
        page: "/register",
        plan: "starter",
        section: "registration-form",
        target: "/workspaces",
      });

      // Give the browser a moment to commit the Set-Cookie header before navigation.
      await new Promise((resolve) => window.setTimeout(resolve, 50));
      window.location.assign("/workspaces");
    } catch {
      setError("Signup request did not reach Dash Dental. Check the connection and try again.");
      setTurnstileResetKey((value) => value + 1);
      setIsSubmitting(false);
    }
  }

  return (
    <section className="auth-card register-auth-card">
      <div className="auth-card-heading">
        <p className="eyebrow">Create account</p>
        <h2>Create your Dash Dental account</h2>
        <p>
          This creates your owner login and a clinic workspace. After signup,
          you land in the account hub, then open the dashboard from the selected
          workspace.
        </p>
        <div className="register-helper-links">
          <Link href="/demo">Want to see it first? Try sample dashboard</Link>
          <Link href="/login">Already have an account? Sign in</Link>
        </div>
      </div>

      <form
        className="login-form login-form-grid"
        data-launch-event="auth.register.submitted"
        data-launch-page="/register"
        data-launch-plan="starter"
        data-launch-section="registration-form"
        data-launch-target="/workspaces"
        onSubmit={handleSubmit}
      >
        <label className="login-field">
          <span>Clinic name</span>
          <input
            autoComplete="organization"
            name="clinicName"
            onChange={(event) => setClinicName(event.target.value)}
            placeholder="Bright Smile Dental"
            required
            type="text"
            value={clinicName}
          />
        </label>
        <label className="login-field">
          <span>Owner name</span>
          <input
            autoComplete="name"
            name="ownerName"
            onChange={(event) => setOwnerName(event.target.value)}
            placeholder="Anna Smith"
            required
            type="text"
            value={ownerName}
          />
        </label>
        <label className="login-field">
          <span>Work email</span>
          <input
            autoComplete="email"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="owner@clinic.com"
            required
            type="email"
            value={email}
          />
        </label>
        <label className="login-field">
          <span>Password</span>
          <input
            autoComplete="new-password"
            minLength={10}
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="10+ characters"
            required
            type="password"
            value={password}
          />
        </label>
        <label className="login-field">
          <span>Timezone</span>
          <select
            name="timezone"
            onChange={(event) => setTimezone(event.target.value)}
            value={timezone}
          >
            <option value="Europe/Kiev">Europe/Kiev</option>
            <option value="Europe/Warsaw">Europe/Warsaw</option>
            <option value="Europe/Berlin">Europe/Berlin</option>
            <option value="UTC">UTC</option>
            <option value="America/New_York">America/New_York</option>
          </select>
        </label>
        <label className="login-field">
          <span>Currency</span>
          <select
            name="currency"
            onChange={(event) => setCurrency(event.target.value as Currency)}
            value={currency}
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="UAH">UAH</option>
          </select>
        </label>
        <TurnstileChallenge
          action="register"
          resetKey={turnstileResetKey}
          siteKey={turnstileSiteKey}
          onError={setError}
          onTokenChange={setTurnstileToken}
        />
        <button className="primary-button" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Creating account..." : "Create account"}
          {isSubmitting ? <Loader2 className="login-spin" size={16} /> : <ArrowRight size={16} />}
        </button>
      </form>

      {error ? <p className="login-error">{error}</p> : null}

      <div className="registration-proof-list">
        <span>
          <CheckCircle2 size={15} /> Owner access is created automatically.
        </span>
        <span>
          <CheckCircle2 size={15} /> Use a work email for your clinic workspace.
        </span>
        <span>
          <CheckCircle2 size={15} /> Account hub opens before the dashboard.
        </span>
        <span>
          <CheckCircle2 size={15} /> Active plan access starts with readable setup and billing controls.
        </span>
        <span>
          <ShieldCheck size={15} /> Clinic DB access starts as a protected approval flow.
        </span>
      </div>
    </section>
  );
}
