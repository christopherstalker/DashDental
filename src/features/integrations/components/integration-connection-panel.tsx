"use client";

import { useMemo, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  CheckCircle2,
  Copy,
  Database,
  Globe2,
  MessageCircle,
  PhoneCall,
  PlayCircle,
  Send,
  ShieldCheck,
} from "lucide-react";
import type { Integration, Provider } from "@/domain/types";
import { useCurrentLanguageCode } from "@/features/i18n/translation-store";
import { translate, type TranslationKey } from "@/features/i18n/translations";

type MessagingProvider = Extract<Provider, "telegram" | "whatsapp" | "instagram">;

const publicWebhookOrigin =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://dashdental.space";

interface MessagingSetupGuide {
  provider: MessagingProvider;
  callbackUrl: string;
  verifyToken: string;
  docsUrl: string;
  portalLabel: string;
  requiredCredentials: string[];
  steps: string[];
}

interface WebFormSetupGuide {
  provider: "web_form";
  endpointUrl: string;
  webhookSecret: string;
  requiredCredentials: string[];
  samplePayload: Record<string, string>;
  steps: string[];
}

interface Feedback {
  tone: "success" | "error";
  message: string;
}

function getIntegrationErrorKey(errorState?: string | null): TranslationKey | undefined {
  if (errorState === "Add credentials to activate this channel.") {
    return "integrations.error.addCredentials";
  }

  if (errorState === "Add a clinic database connection before the first sync.") {
    return "integrations.error.addClinicDb";
  }

  return undefined;
}

function getIntegrationStatusKey(status: Integration["status"] | "pending"): TranslationKey {
  switch (status) {
    case "active":
      return "integrations.status.configured";
    case "degraded":
      return "integrations.status.needsAttention";
    case "disconnected":
      return "integrations.status.disconnected";
    case "pending":
      return "integrations.status.needsSetup";
  }
}

interface IntegrationConnectionPanelProps {
  clinicDbConfigured: boolean;
  clinicDbContractApproved: boolean;
  integrations: Integration[];
  messagingGuides: MessagingSetupGuide[];
  organizationId: string;
  webFormGuide: WebFormSetupGuide;
}

export function IntegrationConnectionPanel({
  clinicDbConfigured,
  clinicDbContractApproved,
  integrations,
  messagingGuides,
  organizationId,
  webFormGuide,
}: IntegrationConnectionPanelProps) {
  const languageCode = useCurrentLanguageCode();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const guides = useMemo(
    () => new Map(messagingGuides.map((guide) => [guide.provider, guide])),
    [messagingGuides],
  );
  const [telegram, setTelegram] = useState({
    botToken: "",
    botUsername: "",
    webhookSecret: guides.get("telegram")?.verifyToken ?? "",
  });
  const [whatsapp, setWhatsApp] = useState({
    accessToken: "",
    phoneNumberId: "",
    businessAccountId: "",
    appSecret: "",
    webhookVerifyToken: guides.get("whatsapp")?.verifyToken ?? "",
  });
  const [instagram, setInstagram] = useState({
    pageAccessToken: "",
    pageId: "",
    instagramBusinessAccountId: "",
    appSecret: "",
    webhookVerifyToken: guides.get("instagram")?.verifyToken ?? "",
  });
  const [webForm, setWebForm] = useState({
    webhookSecret: webFormGuide.webhookSecret,
  });
  const [phone, setPhone] = useState({
    accountSid: "",
    authToken: "",
    autoReplyEnabled: true,
    messagingServiceSid: "",
    phoneNumber: "",
  });
  const [clinicDb, setClinicDb] = useState({
    connectionString: "",
    ssl: true,
  });

  function integrationFor(provider: Provider) {
    return integrations.find((integration) => integration.provider === provider);
  }

  function runJsonAction(
    actionKey: string,
    endpoint: string,
    payload: Record<string, unknown>,
    successMessage: string,
  ) {
    setFeedback(null);
    setPendingAction(actionKey);
    startTransition(async () => {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = (await response.json().catch(() => ({}))) as { error?: string };

        if (!response.ok) {
          setFeedback({
            tone: "error",
            message: result.error ?? translate("integrations.feedback.actionFailed", languageCode),
          });
          return;
        }

        setFeedback({ tone: "success", message: successMessage });
        router.refresh();
      } catch {
        setFeedback({
          tone: "error",
          message: translate("integrations.feedback.serverError", languageCode),
        });
      } finally {
        setPendingAction(null);
      }
    });
  }

  function saveTelegram(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    runJsonAction(
      "telegram",
      "/api/v1/integrations/messaging/config",
      {
        organizationId,
        provider: "telegram",
        ...telegram,
      },
      translate("integrations.feedback.telegram", languageCode),
    );
  }

  function saveWhatsApp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    runJsonAction(
      "whatsapp",
      "/api/v1/integrations/messaging/config",
      {
        organizationId,
        provider: "whatsapp",
        ...whatsapp,
      },
      translate("integrations.feedback.whatsapp", languageCode),
    );
  }

  function saveInstagram(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    runJsonAction(
      "instagram",
      "/api/v1/integrations/messaging/config",
      {
        organizationId,
        provider: "instagram",
        ...instagram,
      },
      translate("integrations.feedback.instagram", languageCode),
    );
  }

  function saveWebForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    runJsonAction(
      "web_form",
      "/api/v1/integrations/web-form/config",
      {
        organizationId,
        webhookSecret: webForm.webhookSecret,
      },
      translate("integrations.feedback.webForm", languageCode),
    );
  }

  function savePhone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    runJsonAction(
      "phone",
      "/api/v1/integrations/phone/config",
      {
        organizationId,
        ...phone,
      },
      "Missed-call capture is ready.",
    );
  }

  function sendWebFormTestLead() {
    setFeedback(null);
    setPendingAction("web_form_test");
    startTransition(async () => {
      try {
        const eventId = `website-test-${Date.now()}`;
        const response = await fetch("/api/v1/webhooks/web-form", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "idempotency-key": eventId,
            "x-webhook-secret": webForm.webhookSecret,
          },
          body: JSON.stringify({
            ...webFormGuide.samplePayload,
            eventId,
            organizationId,
          }),
        });
        const result = (await response.json().catch(() => ({}))) as { error?: string };

        if (!response.ok) {
          setFeedback({
            tone: "error",
            message: result.error ?? translate("integrations.feedback.testLeadRejected", languageCode),
          });
          return;
        }

        setFeedback({
          tone: "success",
          message: translate("integrations.feedback.testLeadAccepted", languageCode),
        });
        router.refresh();
      } catch {
        setFeedback({
          tone: "error",
          message: translate("integrations.feedback.testLeadError", languageCode),
        });
      } finally {
        setPendingAction(null);
      }
    });
  }

  function approveClinicDbContract() {
    runJsonAction(
      "clinic_db_contract",
      "/api/v1/integrations/clinic-db/contract",
      {
        action: "approve",
        organizationId,
        provider: "clinic_database",
      },
      translate("integrations.feedback.clinicDbContract", languageCode),
    );
  }

  function saveClinicDb(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    runJsonAction(
      "clinic_db",
      "/api/v1/integrations/clinic-db/config",
      {
        organizationId,
        connectionString: clinicDb.connectionString,
        ssl: clinicDb.ssl,
      },
      translate("integrations.feedback.clinicDbSaved", languageCode),
    );
  }

  return (
    <div className="integration-connect-stack">
      {feedback ? (
        <div className={`integration-feedback ${feedback.tone}`}>
          <CheckCircle2 size={16} />
          <span>{feedback.message}</span>
        </div>
      ) : null}

      <div className="integration-connect-grid">
        <MessagingCard
          anchorId="telegram"
          guide={guides.get("telegram")}
          icon={<Send size={18} />}
          integration={integrationFor("telegram")}
          isPending={isPending && pendingAction === "telegram"}
          onSubmit={saveTelegram}
          title={translate("integrations.provider.telegram.title", languageCode)}
        >
          <Field
            label={translate("integrations.form.botToken", languageCode)}
            onChange={(value) => setTelegram((current) => ({ ...current, botToken: value }))}
            placeholder="123456:ABC..."
            required
            type="password"
            value={telegram.botToken}
          />
          <Field
            label={translate("integrations.form.botUsername", languageCode)}
            onChange={(value) => setTelegram((current) => ({ ...current, botUsername: value }))}
            placeholder="@clinic_bot"
            value={telegram.botUsername}
          />
          <Field
            label={translate("integrations.form.secretToken", languageCode)}
            onChange={(value) => setTelegram((current) => ({ ...current, webhookSecret: value }))}
            required
            value={telegram.webhookSecret}
          />
        </MessagingCard>

        <MessagingCard
          anchorId="whatsapp"
          guide={guides.get("whatsapp")}
          icon={<MessageCircle size={18} />}
          integration={integrationFor("whatsapp")}
          isPending={isPending && pendingAction === "whatsapp"}
          onSubmit={saveWhatsApp}
          title={translate("integrations.provider.whatsapp.title", languageCode)}
        >
          <Field
            label={translate("integrations.form.accessToken", languageCode)}
            onChange={(value) => setWhatsApp((current) => ({ ...current, accessToken: value }))}
            required
            type="password"
            value={whatsapp.accessToken}
          />
          <Field
            label={translate("integrations.form.phoneNumberId", languageCode)}
            onChange={(value) => setWhatsApp((current) => ({ ...current, phoneNumberId: value }))}
            required
            value={whatsapp.phoneNumberId}
          />
          <Field
            label={translate("integrations.form.wabaId", languageCode)}
            onChange={(value) => setWhatsApp((current) => ({ ...current, businessAccountId: value }))}
            value={whatsapp.businessAccountId}
          />
          <Field
            label={translate("integrations.form.metaSecret", languageCode)}
            onChange={(value) => setWhatsApp((current) => ({ ...current, appSecret: value }))}
            type="password"
            value={whatsapp.appSecret}
          />
          <Field
            label={translate("integrations.form.verifyToken", languageCode)}
            onChange={(value) =>
              setWhatsApp((current) => ({ ...current, webhookVerifyToken: value }))
            }
            required
            value={whatsapp.webhookVerifyToken}
          />
        </MessagingCard>

        <MessagingCard
          anchorId="instagram"
          guide={guides.get("instagram")}
          icon={<Camera size={18} />}
          integration={integrationFor("instagram")}
          isPending={isPending && pendingAction === "instagram"}
          onSubmit={saveInstagram}
          title={translate("integrations.provider.instagram.title", languageCode)}
        >
          <Field
            label={translate("integrations.form.pageToken", languageCode)}
            onChange={(value) => setInstagram((current) => ({ ...current, pageAccessToken: value }))}
            required
            type="password"
            value={instagram.pageAccessToken}
          />
          <Field
            label={translate("integrations.form.facebookPage", languageCode)}
            onChange={(value) => setInstagram((current) => ({ ...current, pageId: value }))}
            required
            value={instagram.pageId}
          />
          <Field
            label={translate("integrations.form.instagramBusiness", languageCode)}
            onChange={(value) =>
              setInstagram((current) => ({ ...current, instagramBusinessAccountId: value }))
            }
            value={instagram.instagramBusinessAccountId}
          />
          <Field
            label={translate("integrations.form.metaSecret", languageCode)}
            onChange={(value) => setInstagram((current) => ({ ...current, appSecret: value }))}
            type="password"
            value={instagram.appSecret}
          />
          <Field
            label={translate("integrations.form.verifyToken", languageCode)}
            onChange={(value) =>
              setInstagram((current) => ({ ...current, webhookVerifyToken: value }))
            }
            required
            value={instagram.webhookVerifyToken}
          />
        </MessagingCard>

        <section className="integration-config-card" id="phone">
          <ConnectionCardHeader
            icon={<PhoneCall size={18} />}
            integration={integrationFor("phone")}
            title="Missed calls"
          />
          <CopyableLine
            label="Twilio call status webhook"
            value={`${publicWebhookOrigin}/api/webhooks/twilio/call`}
          />
          <form className="integration-config-form" onSubmit={savePhone}>
            <Field
              label="Clinic phone number"
              onChange={(value) => setPhone((current) => ({ ...current, phoneNumber: value }))}
              placeholder="+15551234567"
              required
              value={phone.phoneNumber}
            />
            <Field
              label="Twilio Account SID"
              onChange={(value) => setPhone((current) => ({ ...current, accountSid: value }))}
              placeholder="AC..."
              value={phone.accountSid}
            />
            <Field
              label="Twilio Auth Token"
              onChange={(value) => setPhone((current) => ({ ...current, authToken: value }))}
              type="password"
              value={phone.authToken}
            />
            <Field
              label="Messaging Service SID"
              onChange={(value) => setPhone((current) => ({ ...current, messagingServiceSid: value }))}
              placeholder="MG..."
              value={phone.messagingServiceSid}
            />
            <label className="integration-checkbox">
              <input
                checked={phone.autoReplyEnabled}
                onChange={(event) =>
                  setPhone((current) => ({ ...current, autoReplyEnabled: event.target.checked }))
                }
                type="checkbox"
              />
              <span>Send instant SMS after missed call</span>
            </label>
            <button className="primary-button" disabled={isPending} type="submit">
              <PhoneCall size={16} />
              {pendingAction === "phone" ? "Saving..." : "Activate missed calls"}
            </button>
          </form>
        </section>

        <section className="integration-config-card" id="web_form">
          <ConnectionCardHeader
            icon={<Globe2 size={18} />}
            integration={integrationFor("web_form")}
            title={translate("integrations.provider.webForm.title", languageCode)}
          />
          <CopyableLine label={translate("integrations.webForm.post", languageCode)} value={webFormGuide.endpointUrl} />
          <form className="integration-config-form" onSubmit={saveWebForm}>
            <Field
              label={translate("integrations.form.webhookSecret", languageCode)}
              onChange={(value) => setWebForm({ webhookSecret: value })}
              required
              value={webForm.webhookSecret}
            />
            <div className="integration-form-actions">
              <button className="primary-button" disabled={isPending} type="submit">
                <ShieldCheck size={16} />
                {pendingAction === "web_form"
                  ? translate("integrations.form.activating", languageCode)
                  : translate("integrations.form.activateWebForm", languageCode)}
              </button>
              <button
                className="secondary-button"
                disabled={isPending}
                onClick={sendWebFormTestLead}
                type="button"
              >
                <PlayCircle size={16} />
                {pendingAction === "web_form_test"
                  ? translate("integrations.form.sending", languageCode)
                  : translate("integrations.form.sendTest", languageCode)}
              </button>
            </div>
          </form>
        </section>

        <section className="integration-config-card" id="clinic_database">
          <ConnectionCardHeader
            icon={<Database size={18} />}
            integration={integrationFor("clinic_database")}
            title={translate("integrations.provider.clinicDb.title", languageCode)}
          />
          <div className="connection-checks compact-checks">
            <ConnectionCheck
              label={translate("integrations.form.contractApproved", languageCode)}
              ok={clinicDbContractApproved}
            />
            <ConnectionCheck label={translate("integrations.form.connectionSaved", languageCode)} ok={clinicDbConfigured} />
          </div>
          <div className="integration-form-actions">
            <button
              className="secondary-button"
              disabled={isPending || clinicDbContractApproved}
              onClick={approveClinicDbContract}
              type="button"
            >
              <ShieldCheck size={16} />
              {pendingAction === "clinic_db_contract"
                ? translate("integrations.form.approving", languageCode)
                : translate("integrations.form.approveContract", languageCode)}
            </button>
          </div>
          <form className="integration-config-form" onSubmit={saveClinicDb}>
            <Field
              label={translate("integrations.form.postgresUrl", languageCode)}
              onChange={(value) => setClinicDb((current) => ({ ...current, connectionString: value }))}
              placeholder="postgresql://readonly:..."
              required
              type="password"
              value={clinicDb.connectionString}
            />
            <label className="integration-checkbox">
              <input
                checked={clinicDb.ssl}
                onChange={(event) =>
                  setClinicDb((current) => ({ ...current, ssl: event.target.checked }))
                }
                type="checkbox"
              />
              <span>{translate("integrations.form.useSsl", languageCode)}</span>
            </label>
            <button className="primary-button" disabled={isPending} type="submit">
              <Database size={16} />
              {pendingAction === "clinic_db"
                ? translate("integrations.form.saving", languageCode)
                : translate("integrations.form.saveClinicDb", languageCode)}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

function MessagingCard({
  anchorId,
  children,
  guide,
  icon,
  integration,
  isPending,
  onSubmit,
  title,
}: {
  anchorId: MessagingProvider;
  children: ReactNode;
  guide?: MessagingSetupGuide;
  icon: ReactNode;
  integration?: Integration;
  isPending: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  title: string;
}) {
  const languageCode = useCurrentLanguageCode();

  return (
    <section className="integration-config-card" id={anchorId}>
      <ConnectionCardHeader icon={icon} integration={integration} title={title} />
      {guide ? (
        <>
          <CopyableLine label={translate("integrations.webhook.callback", languageCode)} value={guide.callbackUrl} />
          <CopyableLine label={translate("integrations.form.verifyToken", languageCode)} value={guide.verifyToken} />
        </>
      ) : null}
      <form className="integration-config-form" onSubmit={onSubmit}>
        {children}
        <button className="primary-button" disabled={isPending} type="submit">
          <ShieldCheck size={16} />
          {isPending
            ? translate("integrations.form.connecting", languageCode)
            : `${translate("integrations.form.connect", languageCode)} ${title}`}
        </button>
      </form>
    </section>
  );
}

function ConnectionCardHeader({
  icon,
  integration,
  title,
}: {
  icon: ReactNode;
  integration?: Integration;
  title: string;
}) {
  const languageCode = useCurrentLanguageCode();
  const status = integration?.status ?? "pending";
  const errorKey = getIntegrationErrorKey(integration?.errorState);

  return (
    <div className="integration-config-head">
      <div className="provider-icon-badge">{icon}</div>
      <div>
        <h3>{title}</h3>
        <p>
          {errorKey
            ? translate(errorKey, languageCode)
            : integration?.errorState ??
              translate("integrations.form.pasteCredentials", languageCode)}
        </p>
      </div>
      <span className={`status-dot ${status === "active" ? "active" : status}`}>
        {translate(getIntegrationStatusKey(status), languageCode)}
      </span>
    </div>
  );
}

function CopyableLine({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="copyable-value integration-copyable">
      <div>
        <span>{label}</span>
        <code>{value}</code>
      </div>
      <button className="icon-button" onClick={copy} type="button">
        {copied ? <CheckCircle2 size={15} /> : <Copy size={15} />}
      </button>
    </div>
  );
}

function Field({
  label,
  onChange,
  placeholder,
  required = false,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: "text" | "password";
  value: string;
}) {
  return (
    <label className="login-field integration-field">
      <span>{label}</span>
      <input
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}

function ConnectionCheck({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className={`connection-check ${ok ? "ok" : "warn"}`}>
      {ok ? <CheckCircle2 size={16} /> : <ShieldCheck size={16} />}
      <span>{label}</span>
    </div>
  );
}
