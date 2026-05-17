"use client";

import { useRef, useState, type FormEvent } from "react";
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

function readFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function buildDescription(formData: FormData) {
  const message = readFormValue(formData, "message");
  const rows = [
    ["Name", readFormValue(formData, "name")],
    ["Clinic", readFormValue(formData, "clinic")],
    ["Category", readFormValue(formData, "category")],
    ["Urgency", readFormValue(formData, "urgency")],
    ["Affected channel", readFormValue(formData, "channel")],
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
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("kind", kind === "feedback" ? "feature" : "bug");
    formData.set("description", buildDescription(formData));

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

      form.reset();
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setMessage(payload.id ? `${copy.success} Reference: ${payload.id}.` : copy.success);
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

      <form className="support-form" onSubmit={handleSubmit}>
        <div className="support-form-grid">
          <label>
            <span>{copy.labels.name}</span>
            <input
              autoComplete="name"
              defaultValue={initialRequest?.name}
              name="name"
              placeholder={copy.placeholders.name}
              type="text"
            />
          </label>

          <label>
            <span>{copy.labels.clinic}</span>
            <input
              autoComplete="organization"
              defaultValue={initialRequest?.clinic}
              name="clinic"
              placeholder={copy.placeholders.clinic}
              type="text"
            />
          </label>
        </div>

        <label>
          <span>{copy.labels.email}</span>
          <input
            autoComplete="email"
            defaultValue={initialRequest?.email}
            name="email"
            placeholder={copy.placeholders.email}
            required
            type="email"
          />
        </label>

        <div className="support-form-grid">
          <label>
            <span>{copy.labels.category}</span>
            <select defaultValue={initialRequest?.category} name="category">
              {copy.categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>

          <label>
            <span>{copy.labels.urgency}</span>
            <select defaultValue={initialRequest?.urgency} name="urgency">
              {copy.urgencies.map((urgency) => (
                <option key={urgency}>{urgency}</option>
              ))}
            </select>
          </label>
        </div>

        <label>
          <span>{copy.labels.channel}</span>
          <select defaultValue={initialRequest?.channel} name="channel">
            {copy.channels.map((channel) => (
              <option key={channel}>{channel}</option>
            ))}
          </select>
        </label>

        <label>
          <span>{copy.labels.message}</span>
          <textarea
            minLength={12}
            defaultValue={initialRequest?.message}
            name="message"
            placeholder={copy.placeholders.message}
            required
            rows={7}
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

        <button className="recovery-primary-button" disabled={isSubmitting} type="submit">
          {isSubmitting ? copy.sending : kind === "feedback" ? copy.submitFeedback : copy.submitIssue}
          <Send size={16} />
        </button>
      </form>

      {message ? <p className="support-form-message success">{message}</p> : null}
      {error ? <p className="support-form-message error">{error}</p> : null}
    </section>
  );
}
