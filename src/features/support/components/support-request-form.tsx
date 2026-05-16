"use client";

import { useRef, useState, type FormEvent } from "react";
import { Bug, Lightbulb, Paperclip, Send } from "lucide-react";

type RequestKind = "bug" | "feature";

interface SupportResponse {
  id?: string;
  error?: string;
}

const labels: Record<
  RequestKind,
  {
    cta: string;
    description: string;
    placeholder: string;
    title: string;
  }
> = {
  bug: {
    cta: "Send bug report",
    description:
      "Tell support what broke, where it happened, and what you expected instead.",
    placeholder:
      "Example: On the dashboard pricing button wraps, browser is Chrome, screenshot attached.",
    title: "Bug report",
  },
  feature: {
    cta: "Send feature idea",
    description:
      "Suggest what should be added, who needs it, and why it helps the clinic.",
    placeholder:
      "Example: Add a weekly owner digest with unanswered patients and recovered revenue.",
    title: "Feature request",
  },
};

export function SupportRequestForm() {
  const [kind, setKind] = useState<RequestKind>("bug");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const active = labels[kind];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("kind", kind);

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/v1/support/request", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json().catch(() => ({}))) as SupportResponse;

      if (!response.ok) {
        setError(payload.error ?? "Could not send the request. Try again.");
        return;
      }

      form.reset();
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setMessage(
        payload.id
          ? `Request received. Reference: ${payload.id}.`
          : "Request received.",
      );
    } catch {
      setError("Could not send the request. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="support-request-panel" id="request">
      <div className="support-request-tabs" aria-label="Support request type">
        <button
          aria-pressed={kind === "bug"}
          className={kind === "bug" ? "active" : ""}
          onClick={() => setKind("bug")}
          type="button"
        >
          <Bug size={16} />
          Bug report
        </button>
        <button
          aria-pressed={kind === "feature"}
          className={kind === "feature" ? "active" : ""}
          onClick={() => setKind("feature")}
          type="button"
        >
          <Lightbulb size={16} />
          Feature idea
        </button>
      </div>

      <div className="support-request-heading">
        <p>{active.description}</p>
        <h2>{active.title}</h2>
      </div>

      <form className="support-form" onSubmit={handleSubmit}>
        <label>
          <span>Your email</span>
          <input
            autoComplete="email"
            name="email"
            placeholder="you@clinic.com"
            required
            type="email"
          />
        </label>

        <label>
          <span>Description</span>
          <textarea
            minLength={12}
            name="description"
            placeholder={active.placeholder}
            required
            rows={7}
          />
        </label>

        <label className="support-upload-field">
          <span>
            <Paperclip size={15} />
            Screenshots (optional)
          </span>
          <input
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            name="screenshots"
            ref={fileInputRef}
            type="file"
          />
        </label>

        <button className="recovery-primary-button" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Sending..." : active.cta}
          <Send size={16} />
        </button>
      </form>

      {message ? <p className="support-form-message success">{message}</p> : null}
      {error ? <p className="support-form-message error">{error}</p> : null}
    </section>
  );
}
