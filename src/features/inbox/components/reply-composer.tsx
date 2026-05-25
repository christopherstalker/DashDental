"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Send } from "lucide-react";
import type { Message, ReplyTemplate } from "@/domain/types";
import { LocalizedText } from "@/features/i18n/components/localized-text";
import {
  translate,
  type TranslationKey,
} from "@/features/i18n/translations";
import { useCurrentLanguageCode } from "@/features/i18n/translation-store";

export function ReplyComposer({
  conversationId,
  patientName,
  suggestedReplyKeys,
  templates = [],
  lastOutboundMessage,
}: {
  conversationId: string;
  lastOutboundMessage?: Message;
  patientName: string;
  suggestedReplyKeys: TranslationKey[];
  templates?: ReplyTemplate[];
}) {
  const router = useRouter();
  const languageCode = useCurrentLanguageCode();
  const [isRefreshing, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastQueuedText, setLastQueuedText] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [editText, setEditText] = useState(lastOutboundMessage?.text ?? "");
  const t = (key: TranslationKey) => translate(key, languageCode);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = text.trim();
    if (!trimmed) {
      setError(t("inbox.reply.error.empty"));
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const response = await fetch(`/api/v1/conversations/${conversationId}/messages`, {
      body: JSON.stringify({ text: trimmed }),
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const result = (await response.json().catch(() => ({}))) as {
      error?: string;
    };

    setIsSubmitting(false);

    if (!response.ok) {
      setError(result.error ?? t("inbox.reply.error.queue"));
      return;
    }

    setLastQueuedText(trimmed);
    setText("");
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleRecentMessage(action: "edit" | "undo") {
    if (!lastOutboundMessage) {
      return;
    }

    setError(null);
    setIsSubmitting(true);
    const response = await fetch(
      `/api/v1/conversations/${conversationId}/messages/${lastOutboundMessage.id}`,
      {
        body: action === "edit" ? JSON.stringify({ text: editText }) : undefined,
        credentials: "same-origin",
        headers: action === "edit" ? { "content-type": "application/json" } : undefined,
        method: action === "edit" ? "PATCH" : "DELETE",
      },
    );
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    setIsSubmitting(false);

    if (!response.ok) {
      setError(result.error ?? t("inbox.reply.error.queue"));
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <section className="reply-composer-panel" aria-label={t("inbox.reply.formAria")}>
      <div className="section-heading compact-heading">
        <div>
          <p className="eyebrow">
            <LocalizedText k="inbox.reply.nextAction" />
          </p>
          <h2>
            <LocalizedText k="inbox.reply.title" />
          </h2>
          <p className="blueprint-copy">
            <LocalizedText k="inbox.reply.copy" />
          </p>
        </div>
      </div>

      <div className="suggestion-row" aria-label={t("inbox.reply.suggestionsAria")}>
        {suggestedReplyKeys.map((replyKey) => (
          <button
            className="suggestion-chip"
            key={replyKey}
            onClick={() => setText(t(replyKey))}
            type="button"
          >
            {t(replyKey)}
          </button>
        ))}
        {templates.slice(0, 4).map((template) => (
          <button
            className="suggestion-chip"
            key={template.id}
            onClick={() => setText(template.body.replaceAll("{patientName}", patientName))}
            type="button"
          >
            {template.title}
          </button>
        ))}
      </div>

      <form className="composer recovery-reply-form" onSubmit={handleSubmit}>
        <label className="reply-field" htmlFor="patient-reply">
          <span>
            <LocalizedText k="inbox.reply.label" />
          </span>
          <textarea
            aria-describedby="patient-reply-help"
            id="patient-reply"
            name="text"
            onChange={(event) => setText(event.target.value)}
            placeholder={t("inbox.reply.placeholder").replace("{patientName}", patientName)}
            value={text}
          />
        </label>
        <button
          className="primary-button"
          disabled={isSubmitting || isRefreshing}
          type="submit"
        >
          {isSubmitting || isRefreshing ? t("inbox.reply.queueing") : t("inbox.reply.queue")}
          <Send size={16} />
        </button>
      </form>

      <p className="blueprint-copy" id="patient-reply-help">
        <LocalizedText k="inbox.reply.help" />
      </p>

      {lastQueuedText ? (
        <div className="reply-status success" role="status">
          <CheckCircle2 size={16} />
          <span>
            <LocalizedText k="inbox.reply.success" />
          </span>
          <strong>{lastQueuedText}</strong>
        </div>
      ) : null}

      {lastOutboundMessage ? (
        <div className="recent-message-tools">
          <label className="reply-field" htmlFor="edit-recent-message">
            <span>Edit last sent message</span>
            <input
              id="edit-recent-message"
              onChange={(event) => setEditText(event.target.value)}
              value={editText}
            />
          </label>
          <div className="recent-message-actions">
            <button
              className="secondary-button compact-button"
              disabled={isSubmitting || isRefreshing}
              onClick={() => void handleRecentMessage("edit")}
              type="button"
            >
              Save edit
            </button>
            <button
              className="secondary-button compact-button"
              disabled={isSubmitting || isRefreshing}
              onClick={() => void handleRecentMessage("undo")}
              type="button"
            >
              Undo send
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="reply-status error" role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      ) : null}
    </section>
  );
}
