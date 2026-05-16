"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import type { Subscription } from "@/domain/types";

export function ManualSubscriptionAdminButton({
  label,
  organizationId,
  plan,
}: {
  label?: string;
  organizationId: string;
  plan: Subscription["plan"];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  function activate() {
    setFeedback(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/v1/admin/billing/manual-activation", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ organizationId, plan }),
        });
        const payload = (await response.json().catch(() => ({}))) as { error?: string };

        if (!response.ok) {
          setFeedback(payload.error ?? "Manual activation failed.");
          return;
        }

        setFeedback(`${plan} activated until month end.`);
        router.refresh();
      } catch {
        setFeedback("Manual activation failed. Check server logs.");
      }
    });
  }

  return (
    <div className="billing-action-stack">
      <button
        className="secondary-button compact-button"
        disabled={isPending}
        onClick={activate}
        type="button"
      >
        <ShieldCheck size={15} />
        {isPending ? "Activating..." : label ?? `Activate ${plan}`}
      </button>
      {feedback ? <p className="form-help">{feedback}</p> : null}
    </div>
  );
}
