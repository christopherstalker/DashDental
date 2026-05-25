"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, CalendarCheck2, Clock3, Loader2 } from "lucide-react";

export function BulkActionsBar({ conversationIds }: { conversationIds: string[] }) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>(conversationIds.slice(0, 2));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function run(action: "mark_booked" | "archive" | "snooze") {
    setError(null);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    const response = await fetch("/api/v1/conversations/bulk", {
      body: JSON.stringify({
        action,
        conversationIds: selectedIds,
        note: "Bulk reminder: follow up tomorrow",
        remindAt: tomorrow.toISOString(),
      }),
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const result = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      setError(result.error ?? "Bulk action failed");
      return;
    }

    startTransition(() => router.refresh());
  }

  return (
    <section className="bulk-actions-panel" aria-label="Bulk conversation actions">
      <div>
        <strong>Bulk actions</strong>
        <span>{selectedIds.length} selected</span>
      </div>
      <div className="bulk-select-list">
        {conversationIds.slice(0, 6).map((id) => (
          <label key={id}>
            <input
              checked={selectedIds.includes(id)}
              onChange={() => toggle(id)}
              type="checkbox"
            />
            {id}
          </label>
        ))}
      </div>
      <div className="bulk-action-buttons">
        <button
          className="secondary-button compact-button"
          disabled={pending || selectedIds.length === 0}
          onClick={() => void run("mark_booked")}
          type="button"
        >
          <CalendarCheck2 size={15} />
          Mark booked
        </button>
        <button
          className="secondary-button compact-button"
          disabled={pending || selectedIds.length === 0}
          onClick={() => void run("archive")}
          type="button"
        >
          <Archive size={15} />
          Archive
        </button>
        <button
          className="secondary-button compact-button"
          disabled={pending || selectedIds.length === 0}
          onClick={() => void run("snooze")}
          type="button"
        >
          <Clock3 size={15} />
          Snooze
        </button>
        {pending ? (
          <span>
            <Loader2 className="spin-icon" size={14} />
            Updating
          </span>
        ) : null}
      </div>
      {error ? <p className="reply-status error">{error}</p> : null}
    </section>
  );
}
