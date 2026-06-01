"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  BellRing,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  UserRoundCheck,
} from "lucide-react";
import type {
  ConversationReminder,
  FeatureFlag,
  ReplyTemplate,
  TeamNote,
  User,
} from "@/domain/types";
import { safePathSegment } from "@/features/http/safe-url";

type ApiResult = { error?: string };

async function postJson(url: string, body: Record<string, unknown>): Promise<ApiResult> {
  const response = await fetch(url, {
    body: JSON.stringify(body),
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    method: "POST",
  });

  const result = (await response.json().catch(() => ({}))) as ApiResult;
  if (!response.ok) {
    return { error: result.error ?? "Request failed" };
  }

  return result;
}

export function ConversationOpsPanel({
  assignedTo,
  conversationId,
  featureFlags,
  leadId,
  reminders,
  staff,
  templates,
  teamNotes,
}: {
  assignedTo?: string;
  conversationId: string;
  featureFlags: FeatureFlag[];
  leadId: string;
  reminders: ConversationReminder[];
  staff: User[];
  templates: ReplyTemplate[];
  teamNotes: TeamNote[];
}) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [reminderNote, setReminderNote] = useState("Call back tomorrow");
  const [assignee, setAssignee] = useState(assignedTo ?? "");
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateBody, setTemplateBody] = useState("");
  const alertFlags = useMemo(
    () =>
      new Set(
        featureFlags
          .filter((flag) => flag.enabled)
          .map((flag) => flag.key),
      ),
    [featureFlags],
  );

  async function runAction(name: string, action: () => Promise<ApiResult>) {
    setError(null);
    setPendingAction(name);
    const result = await action();
    setPendingAction(null);

    if (result.error) {
      setError(result.error);
      return;
    }

    startTransition(() => router.refresh());
  }

  function conversationActionEndpoint() {
    return `/api/v1/conversations/${safePathSegment(conversationId, "conversation id")}/actions`;
  }

  function submitAssignment() {
    void runAction("assign", () =>
      postJson(conversationActionEndpoint(), {
        intent: "assign",
        assignedTo: assignee || undefined,
      }),
    );
  }

  function submitNote() {
    const body = note.trim();
    if (!body) {
      setError("Note cannot be empty");
      return;
    }

    void runAction("note", async () => {
      const result = await postJson("/api/v1/notes", {
        conversationId,
        leadId,
        body,
      });
      if (!result.error) {
        setNote("");
      }
      return result;
    });
  }

  function submitSnooze() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    void runAction("snooze", () =>
      postJson(conversationActionEndpoint(), {
        intent: "snooze",
        note: reminderNote,
        remindAt: tomorrow.toISOString(),
      }),
    );
  }

  function submitTemplate() {
    void runAction("template", async () => {
      const result = await postJson("/api/v1/reply-templates", {
        title: templateTitle,
        body: templateBody,
        category: "custom",
      });
      if (!result.error) {
        setTemplateTitle("");
        setTemplateBody("");
      }
      return result;
    });
  }

  const loading = Boolean(pendingAction) || isRefreshing;

  return (
    <section className="ops-panel" aria-label="Conversation operations">
      <div className="ops-grid">
        <div className="ops-card">
          <span>
            <UserRoundCheck size={15} />
            Assign
          </span>
          <select value={assignee} onChange={(event) => setAssignee(event.target.value)}>
            <option value="">Unassigned</option>
            {staff.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
          <button className="secondary-button compact-button" disabled={loading} onClick={submitAssignment} type="button">
            Save owner
          </button>
        </div>

        <div className="ops-card">
          <span>
            <FileText size={15} />
            Internal note
          </span>
          <textarea
            onChange={(event) => setNote(event.target.value)}
            placeholder="Visible only to clinic staff"
            value={note}
          />
          <button className="secondary-button compact-button" disabled={loading} onClick={submitNote} type="button">
            Add note
          </button>
        </div>

        <div className="ops-card">
          <span>
            <Clock3 size={15} />
            Snooze
          </span>
          <input value={reminderNote} onChange={(event) => setReminderNote(event.target.value)} />
          <button className="secondary-button compact-button" disabled={loading} onClick={submitSnooze} type="button">
            Remind tomorrow
          </button>
        </div>

        <div className="ops-card">
          <span>
            <CheckCircle2 size={15} />
            Saved reply
          </span>
          <input
            onChange={(event) => setTemplateTitle(event.target.value)}
            placeholder="Template name"
            value={templateTitle}
          />
          <textarea
            onChange={(event) => setTemplateBody(event.target.value)}
            placeholder="Reply text"
            value={templateBody}
          />
          <button className="secondary-button compact-button" disabled={loading} onClick={submitTemplate} type="button">
            Save template
          </button>
        </div>
      </div>

      <div className="ops-status-row">
        <span className={alertFlags.has("sla_push_alerts") ? "enabled" : ""}>
          <BellRing size={14} />
          Browser push {alertFlags.has("sla_push_alerts") ? "on" : "off"}
        </span>
        <span className={alertFlags.has("sound_alerts") ? "enabled" : ""}>
          <BellRing size={14} />
          Sound alerts {alertFlags.has("sound_alerts") ? "on" : "off"}
        </span>
        <button
          className="secondary-button compact-button"
          disabled={loading}
          onClick={() =>
            void runAction("archive", () =>
              postJson(conversationActionEndpoint(), {
                intent: "archive",
              }),
            )
          }
          type="button"
        >
          <Archive size={15} />
          Archive
        </button>
        {loading ? (
          <span>
            <Loader2 className="spin-icon" size={14} />
            Updating
          </span>
        ) : null}
      </div>

      <div className="ops-mini-list">
        <strong>Patient history</strong>
        <span>{teamNotes.length} internal notes</span>
        <span>{reminders.filter((reminder) => reminder.status === "scheduled").length} scheduled reminders</span>
        <span>{templates.length} saved reply templates</span>
      </div>

      {error ? <p className="reply-status error">{error}</p> : null}
    </section>
  );
}
