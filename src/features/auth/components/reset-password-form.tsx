"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(token ? null : "Reset token is missing.");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  async function handleSubmit() {
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/v1/auth/password-reset/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password, token }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error ?? "Could not reset this password.");
        return;
      }

      setCompleted(true);
    } catch {
      setError("Password reset did not reach Dash Dental. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="auth-card">
      <div className="auth-card-heading">
        <p className="eyebrow">Secure reset</p>
        <h2>Create a new password</h2>
        <p>
          Reset links expire after one hour. Once saved, previous signed-in
          sessions for this account are revoked.
        </p>
      </div>

      {completed ? (
        <div className="auth-success-panel">
          <CheckCircle2 size={18} />
          <div>
            <strong>Password updated</strong>
            <p>Sign in again with your new password.</p>
            <Link href="/login">Continue to sign in</Link>
          </div>
        </div>
      ) : (
        <div className="login-form login-form-grid">
          <label className="login-field">
            <span>New password</span>
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
            <span>Confirm password</span>
            <input
              autoComplete="new-password"
              minLength={10}
              name="confirmPassword"
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Repeat password"
              required
              type="password"
              value={confirmPassword}
            />
          </label>
          <button className="primary-button" disabled={isSubmitting || !token} onClick={() => void handleSubmit()} type="button">
            {isSubmitting ? "Saving password..." : "Save new password"}
            {isSubmitting ? <Loader2 className="login-spin" size={16} /> : <ShieldCheck size={16} />}
          </button>
        </div>
      )}

      {error ? <p className="login-error">{error}</p> : null}

      <div className="auth-alt-action">
        <ArrowRight size={16} />
        <span>Need a new link?</span>
        <Link href="/forgot-password">Request reset again</Link>
      </div>
    </section>
  );
}
