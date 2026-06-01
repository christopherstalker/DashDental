"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, Mail } from "lucide-react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [devUrl, setDevUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    setError(null);
    setDevUrl(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/auth/password-reset/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        devUrl?: string;
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error ?? "Could not request a password reset.");
        return;
      }

      setDevUrl(payload.devUrl ?? null);
      setSent(true);
    } catch {
      setError("Password reset request did not reach Dash Dental. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="auth-card">
      <div className="auth-card-heading">
        <p className="eyebrow">Account recovery</p>
        <h2>Reset your password</h2>
        <p>
          Enter the work email for your Dash Dental account. If it exists, we send
          a secure one-hour reset link.
        </p>
      </div>

      {sent ? (
        <div className="auth-success-panel">
          <CheckCircle2 size={18} />
          <div>
            <strong>Check your email</strong>
            <p>The reset link is sent if this account exists.</p>
            {devUrl ? <Link href={devUrl}>Open local reset link</Link> : null}
          </div>
        </div>
      ) : (
        <div className="login-form">
          <label className="login-field">
            <span>Work email</span>
            <input
              autoCapitalize="none"
              autoComplete="email"
              inputMode="email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="owner@clinic.com"
              required
              spellCheck={false}
              type="email"
              value={email}
            />
          </label>
          <button className="primary-button" disabled={isSubmitting} onClick={() => void handleSubmit()} type="button">
            {isSubmitting ? "Sending reset link..." : "Send reset link"}
            {isSubmitting ? <Loader2 className="login-spin" size={16} /> : <Mail size={16} />}
          </button>
        </div>
      )}

      {error ? <p className="login-error">{error}</p> : null}

      <div className="auth-alt-action">
        <ArrowRight size={16} />
        <span>Remembered it?</span>
        <Link href="/login">Back to sign in</Link>
      </div>
    </section>
  );
}
