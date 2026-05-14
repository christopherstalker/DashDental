"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function ReplayEventButton({
  endpoint,
  force = true,
  label = "Replay",
  pendingLabel = "Replaying...",
  successMessage = "Replay queued",
  requestBody,
  tone = "neutral",
}: {
  endpoint: string;
  force?: boolean;
  label?: string;
  pendingLabel?: string;
  successMessage?: string;
  requestBody?: Record<string, unknown>;
  tone?: "neutral" | "danger";
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function replay() {
    setFeedback(null);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(requestBody ?? { force }),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setFeedback(
        payload && typeof payload === "object" && "error" in payload
          ? String(payload.error)
          : "Replay failed",
      );
      return;
    }

    setFeedback(successMessage);
    router.refresh();
  }

  return (
    <div className="admin-action-stack">
      <button
        className={`secondary-button compact-button${tone === "danger" ? " danger" : ""}`}
        disabled={isPending}
        onClick={() => {
          startTransition(() => {
            void replay();
          });
        }}
        type="button"
      >
        {isPending ? pendingLabel : label}
      </button>
      {feedback ? <small className="form-help">{feedback}</small> : null}
    </div>
  );
}
