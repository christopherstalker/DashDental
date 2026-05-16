"use client";

import Link from "next/link";
import { Clock3, Loader2, MessageSquareText, SendHorizonal, UserRound } from "lucide-react";
import { useEffect, useState, useTransition, type FormEvent } from "react";
import type { TeamNotesApiResponse, TeamNoteView } from "@/features/notes/types";
import { useCurrentLanguageCode } from "@/features/i18n/translation-store";
import { translate } from "@/features/i18n/translations";

function buildNotesEndpoint(input: {
  organizationId: string;
  conversationId?: string;
  leadId?: string;
  limit?: number;
}) {
  const params = new URLSearchParams({
    organizationId: input.organizationId,
    limit: String(input.limit ?? 50),
  });

  if (input.conversationId) {
    params.set("conversationId", input.conversationId);
  }

  if (input.leadId) {
    params.set("leadId", input.leadId);
  }

  return `/api/v1/notes?${params.toString()}`;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatNoteTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function LiveNotesPanel({
  compact = false,
  contextLabel,
  conversationId,
  currentMembershipId,
  initialNotes,
  leadId,
  organizationId,
  title,
}: {
  compact?: boolean;
  contextLabel?: string;
  conversationId?: string;
  currentMembershipId?: string;
  initialNotes: TeamNoteView[];
  leadId?: string;
  organizationId: string;
  title?: string;
}) {
  const languageCode = useCurrentLanguageCode();
  const [notes, setNotes] = useState(initialNotes);
  const [body, setBody] = useState("");
  const [feedback, setFeedback] = useState(() =>
    translate("notes.panel.syncEveryFew", languageCode),
  );
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const endpoint = buildNotesEndpoint({
    organizationId,
    conversationId,
    leadId,
    limit: compact ? 8 : 50,
  });
  const resolvedContextLabel = contextLabel ?? translate("notes.panel.workspace", languageCode);
  const resolvedTitle = title ?? translate("notes.panel.title", languageCode);

  useEffect(() => {
    let active = true;

    async function refreshNotes() {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }

      try {
        const response = await fetch(endpoint, { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as TeamNotesApiResponse;
        if (!active) {
          return;
        }

        startTransition(() => {
          setNotes(payload.notes);
          setLastSyncedAt(payload.serverTime);
        });
      } catch {
        if (active) {
          setFeedback(translate("notes.panel.syncPaused", languageCode));
        }
      }
    }

    void refreshNotes();
    const interval = window.setInterval(refreshNotes, 3500);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [endpoint, languageCode]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextBody = body.trim();
    if (!nextBody) {
      setFeedback(translate("notes.panel.writeBeforeSaving", languageCode));
      return;
    }

    startTransition(async () => {
      setFeedback(translate("notes.panel.saving", languageCode));

      try {
        const response = await fetch("/api/v1/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organizationId,
            conversationId,
            leadId,
            body: nextBody,
          }),
        });
        const payload = (await response.json().catch(() => ({}))) as
          | TeamNotesApiResponse
          | { error?: string };

        if (!response.ok || !("notes" in payload)) {
          const errorMessage =
            "error" in payload ? payload.error : "Could not save note.";
          setFeedback(errorMessage ?? "Could not save note.");
          return;
        }

        setNotes(payload.notes);
        setLastSyncedAt(payload.serverTime);
        setBody("");
        setFeedback(translate("notes.panel.saved", languageCode));
      } catch {
        setFeedback(translate("notes.panel.saveError", languageCode));
      }
    });
  }

  return (
    <div className={`live-notes-panel ${compact ? "compact" : ""}`}>
      <div className="live-notes-heading">
        <div>
          <p className="clinic-kicker">
            <MessageSquareText size={15} />
            {resolvedContextLabel}
          </p>
          <h2>{resolvedTitle}</h2>
          <span>
            {translate("notes.panel.description", languageCode)}
          </span>
        </div>
        <div className="live-sync-pill">
          {isPending ? <Loader2 size={14} /> : <Clock3 size={14} />}
          <span>
            {lastSyncedAt
              ? `Synced ${formatNoteTime(lastSyncedAt)}`
              : translate("notes.panel.live", languageCode)}
          </span>
        </div>
      </div>

      <form className="live-note-form" onSubmit={handleSubmit}>
        <textarea
          aria-label={translate("notes.panel.textareaAria", languageCode)}
          maxLength={2000}
          onChange={(event) => setBody(event.target.value)}
          placeholder={translate("notes.panel.placeholder", languageCode)}
          value={body}
        />
        <div>
          <span>{feedback}</span>
          <button className="primary-button compact-button" disabled={isPending} type="submit">
            <SendHorizonal size={15} />
            {isPending
              ? translate("notes.panel.savingButton", languageCode)
              : translate("notes.panel.addNote", languageCode)}
          </button>
        </div>
      </form>

      <div className="live-note-list">
        {notes.map((note) => {
          const isMine = note.author.membershipId === currentMembershipId;

          return (
            <article className={`live-note-card ${isMine ? "mine" : ""}`} key={note.id}>
              <div className="live-note-avatar">
                {initials(note.author.name) || <UserRound size={15} />}
              </div>
              <div className="live-note-body">
                <header>
                  <div>
                    <strong>{note.author.name}</strong>
                    <span>
                      {note.author.role.replaceAll("_", " ")} seat - {formatNoteTime(note.createdAt)}
                    </span>
                  </div>
                  {isMine ? <b>{translate("notes.panel.you", languageCode)}</b> : null}
                </header>
                <p>{note.body}</p>
                {note.context.href ? (
                  <Link href={note.context.href}>{note.context.label}</Link>
                ) : (
                  <span>{note.context.label}</span>
                )}
              </div>
            </article>
          );
        })}
        {notes.length === 0 ? (
          <div className="empty-premium-row">
            <MessageSquareText size={18} />
            <span>{translate("notes.panel.empty", languageCode)}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
