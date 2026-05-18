"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";
import type { TeamInvitePreview } from "@/server/team-invites";

interface InviteAcceptResponse {
  error?: string;
  redirectTo?: string;
}

export function InviteAcceptForm({
  preview,
  token,
}: {
  preview: TeamInvitePreview;
  token: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(preview.error ?? null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const canAccept = preview.status === "valid";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    if (password !== confirmPassword) {
      setFeedback("Passwords do not match.");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/v1/invites/accept", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name,
            password,
            token,
          }),
        });
        const payload = (await response.json().catch(() => ({}))) as InviteAcceptResponse;

        if (!response.ok) {
          setFeedback(payload.error ?? "Could not accept this invitation.");
          return;
        }

        router.replace(payload.redirectTo ?? "/workspaces");
        router.refresh();
      } catch {
        setFeedback("Could not accept this invitation. Try again.");
      }
    });
  }

  return (
    <section className="auth-card invite-accept-card">
      <div className="auth-card-heading">
        <p className="eyebrow">Clinic invitation</p>
        <h2>Accept your Dash Dental invite</h2>
        <p>
          {canAccept
            ? `Join ${preview.organizationName ?? "this clinic"} as ${preview.role?.replaceAll("_", " ")}.`
            : "This invitation cannot be accepted."}
        </p>
      </div>

      <div className="registration-proof-list">
        <span>
          <ShieldCheck size={15} />
          {preview.email ?? "Invite email hidden"}
        </span>
        <span>
          <CheckCircle2 size={15} />
          Human-reviewed AI drafts
        </span>
        <span>
          <LockKeyhole size={15} />
          One-time setup link
        </span>
      </div>

      <form className="login-form" onSubmit={submit}>
        <label className="login-field">
          <span>Your name</span>
          <input
            autoComplete="name"
            disabled={!canAccept || isPending}
            minLength={2}
            onChange={(event) => setName(event.target.value)}
            placeholder="Full name"
            required
            type="text"
            value={name}
          />
        </label>
        <label className="login-field">
          <span>Create password</span>
          <input
            autoComplete="new-password"
            disabled={!canAccept || isPending}
            minLength={10}
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
            disabled={!canAccept || isPending}
            minLength={10}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Repeat password"
            required
            type="password"
            value={confirmPassword}
          />
        </label>
        <button className="primary-button" disabled={!canAccept || isPending} type="submit">
          {isPending ? "Accepting invite..." : "Accept invite"}
        </button>
        {feedback ? <p className="form-help">{feedback}</p> : null}
      </form>
    </section>
  );
}
