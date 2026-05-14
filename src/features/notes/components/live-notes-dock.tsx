"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquareText, NotebookPen, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { TeamNoteView } from "@/features/notes/types";
import { useCurrentLanguageCode } from "@/features/i18n/translation-store";
import { translate } from "@/features/i18n/translations";
import { LiveNotesPanel } from "./live-notes-panel";

function getConversationIdFromPath(pathname: string): string | undefined {
  const match = /^\/inbox\/([^/?#]+)/.exec(pathname);
  if (!match?.[1]) {
    return undefined;
  }

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export function LiveNotesDock({
  currentMembershipId,
  initialNotes,
  organizationId,
}: {
  currentMembershipId?: string;
  initialNotes: TeamNoteView[];
  organizationId: string;
}) {
  const languageCode = useCurrentLanguageCode();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isFullNotesPage = pathname === "/notes";
  const conversationId = getConversationIdFromPath(pathname);
  const contextKey = conversationId ? `conversation:${conversationId}` : "workspace";
  const launcherLabel = open
    ? translate("notes.dock.closeAria", languageCode)
    : translate("notes.dock.openAria", languageCode);

  useEffect(() => {
    if (!open) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  if (isFullNotesPage) {
    return null;
  }

  return (
    <div className={`live-notes-dock ${open ? "open" : ""}`}>
      {open ? (
        <section className="live-notes-drawer" aria-label="Live team notes drawer">
          <div className="live-notes-drawer-bar">
            <div>
              <p className="clinic-kicker">
                <MessageSquareText size={15} />
                {conversationId
                  ? translate("notes.dock.conversationLayer", languageCode)
                  : translate("notes.dock.workspaceLayer", languageCode)}
              </p>
              <strong>{translate("notes.dock.teamNotes", languageCode)}</strong>
            </div>
            <div className="live-notes-drawer-actions">
              <Link href="/notes">{translate("notes.dock.fullPage", languageCode)}</Link>
              <button aria-label={translate("notes.dock.closeAria", languageCode)} onClick={() => setOpen(false)} type="button">
                <X size={16} />
              </button>
            </div>
          </div>
          <LiveNotesPanel
            key={contextKey}
            compact
            contextLabel={
              conversationId
                ? translate("notes.panel.conversationHandoff", languageCode)
                : translate("notes.panel.teamHandoff", languageCode)
            }
            conversationId={conversationId}
            currentMembershipId={currentMembershipId}
            initialNotes={conversationId ? [] : initialNotes}
            organizationId={organizationId}
            title={
              conversationId
                ? translate("notes.panel.threadNotes", languageCode)
                : translate("notes.panel.liveNotes", languageCode)
            }
          />
        </section>
      ) : null}

      <button
        aria-expanded={open}
        aria-label={launcherLabel}
        className="live-notes-launcher"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span>
          <NotebookPen size={20} />
          {initialNotes.length > 0 ? <b>{Math.min(initialNotes.length, 99)}</b> : null}
        </span>
        <strong>
          {open
            ? translate("notes.dock.close", languageCode)
            : translate("notes.dock.notes", languageCode)}
        </strong>
      </button>
    </div>
  );
}
