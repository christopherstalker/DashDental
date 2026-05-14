"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import type { Subscription } from "@/domain/types";

const periodOptions = [
  { label: "30 days", value: "30" },
  { label: "90 days", value: "90" },
  { label: "Calendar month", value: "calendar" },
];

const statusOptions: Array<{ label: string; value: Subscription["status"] }> = [
  { label: "Active paid access", value: "active" },
  { label: "Read-only hold", value: "read_only" },
  { label: "Past due lock", value: "past_due" },
  { label: "Canceled access", value: "canceled" },
];

export function ManualSubscriptionGrantForm({
  currentPlan,
  organizationId,
}: {
  currentPlan: Subscription["plan"];
  organizationId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [plan, setPlan] = useState<Subscription["plan"]>(currentPlan);
  const [period, setPeriod] = useState("30");
  const [status, setStatus] = useState<Subscription["status"]>("active");
  const [externalReference, setExternalReference] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  function activate() {
    setFeedback(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/v1/admin/billing/manual-activation", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            externalReference: externalReference.trim() || undefined,
            organizationId,
            periodDays: period === "calendar" ? undefined : Number(period),
            plan,
            status,
          }),
        });
        const payload = (await response.json().catch(() => ({}))) as { error?: string };

        if (!response.ok) {
          setFeedback(payload.error ?? "Manual activation failed.");
          return;
        }

        setFeedback(
          `${plan} ${status.replaceAll("_", " ")}${period === "calendar" ? " until month end" : ` for ${period} days`}.`,
        );
        router.refresh();
      } catch {
        setFeedback("Manual activation failed. Check server logs.");
      }
    });
  }

  return (
    <div className="manual-grant-form">
      <label>
        <span>Plan</span>
        <select
          aria-label={`Subscription plan for ${organizationId}`}
          onChange={(event) => setPlan(event.target.value as Subscription["plan"])}
          value={plan}
        >
          <option value="starter">Starter</option>
          <option value="growth">Growth</option>
          <option value="scale">Scale</option>
        </select>
      </label>
      <label>
        <span>Period</span>
        <select
          aria-label={`Subscription period for ${organizationId}`}
          onChange={(event) => setPeriod(event.target.value)}
          value={period}
        >
          {periodOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Access</span>
        <select
          aria-label={`Access mode for ${organizationId}`}
          onChange={(event) => setStatus(event.target.value as Subscription["status"])}
          value={status}
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="manual-grant-reference">
        <span>Invoice ref</span>
        <input
          aria-label={`Invoice reference for ${organizationId}`}
          onChange={(event) => setExternalReference(event.target.value)}
          placeholder="INV-2026-001"
          value={externalReference}
        />
      </label>
      <button
        className="primary-button compact-button"
        disabled={isPending}
        onClick={activate}
        type="button"
      >
        <ShieldCheck aria-hidden="true" size={15} />
        {isPending ? "Applying..." : status === "active" ? "Grant access" : "Update access"}
      </button>
      {feedback ? <p className="form-help">{feedback}</p> : null}
    </div>
  );
}
