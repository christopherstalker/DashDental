"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, UserMinus, UserPlus } from "lucide-react";
import type { Role } from "@/domain/types";
import { LocalizedText } from "@/features/i18n/components/localized-text";
import { translate } from "@/features/i18n/translations";
import { useCurrentLanguageCode } from "@/features/i18n/translation-store";

type TeamRole = Exclude<Role, "super_admin">;

interface TeamActionResponse {
  error?: string;
  inviteDelivery?: {
    devInviteUrl?: string;
    error?: string;
    status: "failed" | "sent" | "skipped";
  };
}

export function TeamMemberForm({
  disabled,
  organizationId,
}: {
  disabled: boolean;
  organizationId: string;
}) {
  const router = useRouter();
  const languageCode = useCurrentLanguageCode();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("manager");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/v1/team/members", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            email,
            name,
            organizationId,
            role,
          }),
        });
        const payload = (await response.json().catch(() => ({}))) as TeamActionResponse;

        if (!response.ok) {
          setFeedback(payload.error ?? translate("team.form.addError", languageCode));
          return;
        }

        if (payload.inviteDelivery?.status === "sent") {
          setFeedback(`${name} was invited. Resend delivered the setup link.`);
        } else if (payload.inviteDelivery?.devInviteUrl) {
          setFeedback(`Invite created. Local setup link: ${payload.inviteDelivery.devInviteUrl}`);
        } else if (payload.inviteDelivery?.status === "failed") {
          setFeedback(
            `Invite created, but email delivery failed: ${payload.inviteDelivery.error ?? "unknown error"}`,
          );
        } else {
          setFeedback(`${name} can now sign in if they already have an account.`);
        }
        setName("");
        setEmail("");
        setRole("manager");
        router.refresh();
      } catch {
        setFeedback(translate("team.form.addErrorRetry", languageCode));
      }
    });
  }

  return (
    <form className="team-form-grid" onSubmit={submit}>
      <label className="login-field">
        <span>
          <LocalizedText k="team.form.name" />
        </span>
        <input
          disabled={disabled || isPending}
          onChange={(event) => setName(event.target.value)}
          placeholder={translate("team.form.namePlaceholder", languageCode)}
          required
          type="text"
          value={name}
        />
      </label>
      <label className="login-field">
        <span>
          <LocalizedText k="team.form.email" />
        </span>
        <input
          disabled={disabled || isPending}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="team@clinic.com"
          required
          type="email"
          value={email}
        />
      </label>
      <label className="login-field">
        <span>
          <LocalizedText k="team.form.role" />
        </span>
        <select
          disabled={disabled || isPending}
          onChange={(event) => setRole(event.target.value as TeamRole)}
          value={role}
        >
          <option value="manager">{translate("workspace.role.manager", languageCode)}</option>
          <option value="admin">{translate("workspace.role.admin", languageCode)}</option>
          <option value="owner">{translate("workspace.role.owner", languageCode)}</option>
        </select>
      </label>
      <button className="primary-button" disabled={disabled || isPending} type="submit">
        <UserPlus size={16} />
        {isPending ? <LocalizedText k="team.form.adding" /> : "Invite member"}
      </button>
      {feedback ? <p className="form-help team-form-feedback">{feedback}</p> : null}
    </form>
  );
}

export function DeactivateTeamMemberButton({
  disabled,
  membershipId,
  organizationId,
  userName,
}: {
  disabled?: boolean;
  membershipId: string;
  organizationId: string;
  userName: string;
}) {
  const router = useRouter();
  const languageCode = useCurrentLanguageCode();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  function deactivate() {
    setFeedback(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/v1/team/members/${membershipId}/deactivate`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ organizationId }),
        });
        const payload = (await response.json().catch(() => ({}))) as TeamActionResponse;

        if (!response.ok) {
          setFeedback(payload.error ?? translate("team.action.deactivateError", languageCode));
          return;
        }

        setFeedback(`${userName} ${translate("team.action.deactivated", languageCode)}`);
        router.refresh();
      } catch {
        setFeedback(translate("team.action.deactivateErrorRetry", languageCode));
      }
    });
  }

  return (
    <div className="billing-action-stack">
      <button
        className="secondary-button compact-button danger"
        disabled={disabled || isPending}
        onClick={deactivate}
        type="button"
      >
        {disabled ? <ShieldCheck size={15} /> : <UserMinus size={15} />}
        {isPending ? (
          <LocalizedText k="team.action.removing" />
        ) : disabled ? (
          <LocalizedText k="team.action.protected" />
        ) : (
          <LocalizedText k="team.action.deactivate" />
        )}
      </button>
      {feedback ? <p className="form-help">{feedback}</p> : null}
    </div>
  );
}

