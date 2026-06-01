"use client";

import { useRef, useState } from "react";
import { Bug, Lightbulb, Paperclip, Send } from "lucide-react";
import { useCurrentLanguageCode } from "@/features/i18n/translation-store";
import { getTrustSupportCopy } from "@/features/marketing/content/trust-support";

type RequestKind = "issue" | "feedback";

interface SupportResponse {
  id?: string;
  error?: string;
}

export type InitialSupportRequest = Partial<
  Record<"category" | "channel" | "clinic" | "email" | "message" | "name" | "urgency", string>
>;

function buildDescription(input: Required<InitialSupportRequest>) {
  const message = input.message.trim();
  const rows = [
    ["Name", input.name.trim()],
    ["Clinic", input.clinic.trim()],
    ["Category", input.category.trim()],
    ["Urgency", input.urgency.trim()],
    ["Affected channel", input.channel.trim()],
  ].filter(([, value]) => value);

  const context = rows.map(([label, value]) => `${label}: ${value}`).join("\n");

  return [context, "Message:", message].filter(Boolean).join("\n\n");
}

export function SupportRequestForm({
  initialRequest,
}: {
  initialRequest?: InitialSupportRequest;
}) {
  const languageCode = useCurrentLanguageCode();
  const copy = getTrustSupportCopy(languageCode).support.form;
  const [kind, setKind] = useState<RequestKind>("issue");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draft, setDraft] = useState<Required<InitialSupportRequest>>({
    category: initialRequest?.category ?? copy.categories[0] ?? "",
    channel: initialRequest?.channel ?? copy.channels[0] ?? "",
    clinic: initialRequest?.clinic ?? "",
    email: initialRequest?.email ?? "",
    message: initialRequest?.message ?? "",
    name: initialRequest?.name ?? "",
    urgency: initialRequest?.urgency ?? copy.urgencies[0] ?? "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  function setField(key: keyof Required<InitialSupportRequest>, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit() {
    setError(null);
    setStatusMessage(null);

    const formData = new FormData();
    formData.set("kind", kind === "feedback" ? "feature" : "bug");
    formData.set("description", buildDescription(draft));
    formData.set("name", draft.name.trim());
    formData.set("clinic", draft.clinic.trim());
    formData.set("email", draft.email.trim());
    formData.set("category", draft.category.trim());
    formData.set("urgency", draft.urgency.trim());
    formData.set("channel", draft.channel.trim());
    formData.set("message", draft.message.trim());
    Array.from(fileInputRef.current?.files ?? []).forEach((file) => {
      formData.append("screenshots", file);
    });

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/v1/support/request", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json().catch(() => ({}))) as SupportResponse;

      if (!response.ok) {
        setError(payload.error ?? copy.error);
        return;
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setDraft((current) => ({ ...current, message: "" }));
      setStatusMessage(payload.id ? `${copy.success} Reference: ${payload.id}.` : copy.success);
    } catch {
      setError(copy.error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="support-request-panel" id="request">
      <div className="support-request-tabs" aria-label="Support request type">
        <button
          aria-pressed={kind === "issue"}
          className={kind === "issue" ? "active" : ""}
          onClick={() => setKind("issue")}
          type="button"
        >
          <Bug size={16} />
          {copy.tabs.issue}
        </button>
        <button
          aria-pressed={kind === "feedback"}
          className={kind === "feedback" ? "active" : ""}
          onClick={() => setKind("feedback")}
          type="button"
        >
          <Lightbulb size={16} />
          {copy.tabs.feedback}
        </button>
      </div>

      <div className="support-request-heading">
        <p>{copy.description}</p>
        <h2>{copy.title}</h2>
      </div>

      <div className="support-form">
        <div className="support-form-grid">
          <label>
            <span>{copy.labels.name}</span>
            <input
              autoComplete="name"
              onChange={(event) => setField("name", event.target.value)}
              placeholder={copy.placeholders.name}
              type="text"
              value={draft.name}
            />
          </label>

          <label>
            <span>{copy.labels.clinic}</span>
            <input
              autoComplete="organization"
              onChange={(event) => setField("clinic", event.target.value)}
              placeholder={copy.placeholders.clinic}
              type="text"
              value={draft.clinic}
            />
          </label>
        </div>

        <label>
          <span>{copy.labels.email}</span>
          <input
            autoComplete="email"
            onChange={(event) => setField("email", event.target.value)}
            placeholder={copy.placeholders.email}
            required
            type="email"
            value={draft.email}
          />
        </label>

        <div className="support-form-grid">
          <label>
            <span>{copy.labels.category}</span>
            <select onChange={(event) => setField("category", event.target.value)} value={draft.category}>
              {copy.categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>

          <label>
            <span>{copy.labels.urgency}</span>
            <select onChange={(event) => setField("urgency", event.target.value)} value={draft.urgency}>
              {copy.urgencies.map((urgency) => (
                <option key={urgency}>{urgency}</option>
              ))}
            </select>
          </label>
        </div>

        <label>
          <span>{copy.labels.channel}</span>
          <select onChange={(event) => setField("channel", event.target.value)} value={draft.channel}>
            {copy.channels.map((channel) => (
              <option key={channel}>{channel}</option>
            ))}
          </select>
        </label>

        <label>
          <span>{copy.labels.message}</span>
          <textarea
            onChange={(event) => setField("message", event.target.value)}
            minLength={12}
            placeholder={copy.placeholders.message}
            required
            rows={7}
            value={draft.message}
          />
        </label>

        <label className="support-upload-field">
          <span>
            <Paperclip size={15} />
            {copy.labels.screenshots}
          </span>
          <input
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            name="screenshots"
            ref={fileInputRef}
            type="file"
          />
        </label>

        <p className="support-form-privacy-note">{copy.privacyNote}</p>

        <button className="recovery-primary-button" disabled={isSubmitting} onClick={() => void handleSubmit()} type="button">
          {isSubmitting ? copy.sending : kind === "feedback" ? copy.submitFeedback : copy.submitIssue}
          <Send size={16} />
        </button>
      </div>

      {statusMessage ? <p className="support-form-message success">{statusMessage}</p> : null}
      {error ? <p className="support-form-message error">{error}</p> : null}
    </section>
  );
}
