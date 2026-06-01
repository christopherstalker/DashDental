"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Star } from "lucide-react";

export function ReviewRequestButton({
  disabled = false,
  leadId,
}: {
  disabled?: boolean;
  leadId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function requestReview() {
    setError(null);
    startTransition(async () => {
      const response = await fetch("/api/v1/reviews/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Could not request review.");
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="billing-action-stack">
      <button
        className="secondary-button compact-button"
        disabled={disabled || isPending}
        onClick={requestReview}
        type="button"
      >
        <Star size={15} />
        {disabled ? "Requested" : isPending ? "Requesting..." : "Request review"}
      </button>
      {error ? <p className="form-help">{error}</p> : null}
    </div>
  );
}

export function RecallReminderButton({
  disabled = false,
  leadId,
}: {
  disabled?: boolean;
  leadId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function scheduleRecall() {
    setError(null);
    startTransition(async () => {
      const response = await fetch("/api/v1/recall/reminders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Could not schedule recall.");
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="billing-action-stack">
      <button
        className="secondary-button compact-button"
        disabled={disabled || isPending}
        onClick={scheduleRecall}
        type="button"
      >
        <CalendarClock size={15} />
        {disabled ? "Scheduled" : isPending ? "Scheduling..." : "Recall tomorrow"}
      </button>
      {error ? <p className="form-help">{error}</p> : null}
    </div>
  );
}
