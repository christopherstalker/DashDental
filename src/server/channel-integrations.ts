import crypto from "node:crypto";
import type {
  AppState,
  CanonicalInboundMessage,
  Conversation,
  Integration,
  Lead,
  Provider,
} from "@/domain/types";
import { ApiError } from "./api-error";
import { decryptIntegrationSecret, encryptIntegrationSecret } from "./integration-secrets";
import { addAudit } from "./state-mutations";

type MessagingProvider = Extract<Provider, "telegram" | "whatsapp" | "instagram">;

interface ManagedConnectorMetadata {
  connectorMode?: "live" | "managed";
  managedByDashDental?: boolean;
}

interface TelegramCredentials extends ManagedConnectorMetadata {
  botToken: string;
  botUsername?: string;
  webhookSecret: string;
}

interface WhatsAppCredentials extends ManagedConnectorMetadata {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId?: string;
  appSecret?: string;
  webhookVerifyToken: string;
}

interface InstagramCredentials extends ManagedConnectorMetadata {
  pageAccessToken: string;
  pageId: string;
  instagramBusinessAccountId?: string;
  appSecret?: string;
  webhookVerifyToken: string;
}

type MessagingCredentialsMap = {
  telegram: TelegramCredentials;
  whatsapp: WhatsAppCredentials;
  instagram: InstagramCredentials;
};

interface ConfigureMessagingIntegrationInput {
  requestUrl: string;
  organizationId: string;
  provider: MessagingProvider;
  actorUserId?: string;
  credentials: MessagingCredentialsMap[MessagingProvider];
}

interface OutboundMessageResult {
  deliveredAt: string;
  payloadJson: Record<string, unknown>;
  providerMessageId: string;
}

const metaGraphVersion = process.env.META_GRAPH_API_VERSION?.trim() || "v23.0";

function createRuntimeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function isMessagingProvider(provider: Provider): provider is MessagingProvider {
  return provider === "telegram" || provider === "whatsapp" || provider === "instagram";
}

function createManagedSecret(provider: MessagingProvider): string {
  return `ddr_${provider}_${crypto.randomBytes(12).toString("hex")}`;
}

function createManagedExternalAccountId(provider: MessagingProvider, organizationId: string): string {
  return `dash-managed-${provider}-${organizationId}`;
}

function isManagedMessagingCredentials(
  credentials: ManagedConnectorMetadata | undefined,
): boolean {
  return credentials?.connectorMode === "managed" && credentials.managedByDashDental === true;
}

function createManagedCredentials(
  provider: "telegram",
  organizationId: string,
): TelegramCredentials;
function createManagedCredentials(
  provider: "whatsapp",
  organizationId: string,
): WhatsAppCredentials;
function createManagedCredentials(
  provider: "instagram",
  organizationId: string,
): InstagramCredentials;
function createManagedCredentials(
  provider: MessagingProvider,
  organizationId: string,
): MessagingCredentialsMap[MessagingProvider];
function createManagedCredentials(
  provider: MessagingProvider,
  organizationId: string,
): MessagingCredentialsMap[MessagingProvider] {
  const shared = {
    connectorMode: "managed" as const,
    managedByDashDental: true,
  };

  if (provider === "telegram") {
    return {
      ...shared,
      botToken: createManagedExternalAccountId(provider, organizationId),
      botUsername: "dashdental_managed",
      webhookSecret: createManagedSecret(provider),
    };
  }

  if (provider === "whatsapp") {
    return {
      ...shared,
      accessToken: createManagedExternalAccountId(provider, organizationId),
      businessAccountId: `managed-waba-${organizationId}`,
      phoneNumberId: `managed-phone-${organizationId}`,
      webhookVerifyToken: createManagedSecret(provider),
    };
  }

  return {
    ...shared,
    pageAccessToken: createManagedExternalAccountId(provider, organizationId),
    pageId: `managed-page-${organizationId}`,
    instagramBusinessAccountId: `managed-ig-${organizationId}`,
    webhookVerifyToken: createManagedSecret(provider),
  };
}

function getWebhookSecretForCredentials(
  provider: MessagingProvider,
  credentials: MessagingCredentialsMap[MessagingProvider],
): string {
  if (provider === "telegram") {
    return (credentials as TelegramCredentials).webhookSecret;
  }

  return (credentials as WhatsAppCredentials | InstagramCredentials).webhookVerifyToken;
}

function providerErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.length > 180 ? `${message.slice(0, 177)}...` : message;
}

function createManagedOutboundResult(
  provider: MessagingProvider,
  destination: string,
): OutboundMessageResult {
  return {
    providerMessageId: createRuntimeId(`managed-${provider}`),
    deliveredAt: new Date().toISOString(),
    payloadJson: {
      connectorMode: "managed",
      destination,
      live: false,
      provider,
    },
  };
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getAppBaseUrl(requestUrl: string): string {
  return process.env.APP_URL?.replace(/\/$/, "") ?? new URL(requestUrl).origin;
}

function ensureHttpsCallback(url: string, provider: MessagingProvider) {
  if (!url.startsWith("https://")) {
    throw new ApiError(
      409,
      `${provider} webhook registration requires a public HTTPS APP_URL`,
      "public_https_required",
      { provider, url },
    );
  }
}

function ensureSecretValue(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new ApiError(400, `${field} is required`, "validation_error", { field });
  }

  return normalized;
}

function sanitizeWebhookSecret(value: string, field: string): string {
  const normalized = ensureSecretValue(value, field);
  if (!/^[A-Za-z0-9_-]{6,256}$/.test(normalized)) {
    throw new ApiError(400, `${field} must contain only A-Z, a-z, 0-9, _ or -`, "validation_error", {
      field,
    });
  }

  return normalized;
}

function sanitizePhoneForWhatsApp(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 ? digits : undefined;
}

function upsertMessagingIntegration(
  integrations: Integration[],
  input: {
    organizationId: string;
    provider: MessagingProvider;
    patch: Partial<Integration>;
  },
): Integration[] {
  const existing = integrations.find(
    (integration) =>
      integration.organizationId === input.organizationId &&
      integration.provider === input.provider,
  );

  if (!existing) {
    return [
      {
        id: createRuntimeId(`int-${input.provider}`),
        organizationId: input.organizationId,
        provider: input.provider,
        status: "pending",
        encryptedCredentials: "",
        webhookSecret: "",
        healthScore: 0,
        ...input.patch,
      },
      ...integrations,
    ];
  }

  return integrations.map((integration) =>
    integration.id === existing.id
      ? {
          ...integration,
          ...input.patch,
        }
      : integration,
  );
}

function getIntegrationForProvider(
  state: AppState,
  organizationId: string,
  provider: MessagingProvider,
): Integration | undefined {
  return state.integrations.find(
    (integration) =>
      integration.organizationId === organizationId && integration.provider === provider,
  );
}

export function resolveMessagingCredentials<T extends MessagingProvider>(
  state: AppState,
  organizationId: string,
  provider: T,
): MessagingCredentialsMap[T] | undefined {
  const integration = getIntegrationForProvider(state, organizationId, provider);
  const encrypted = integration?.encryptedCredentials?.trim();
  if (!encrypted?.startsWith("enc:v1.")) {
    return undefined;
  }

  return decryptIntegrationSecret<MessagingCredentialsMap[T]>(encrypted);
}

function getRequiredMessagingCredentials<T extends MessagingProvider>(
  state: AppState,
  organizationId: string,
  provider: T,
): MessagingCredentialsMap[T] {
  const credentials = resolveMessagingCredentials(state, organizationId, provider);
  if (!credentials) {
    throw new ApiError(
      409,
      `${provider} integration is not configured with live API credentials`,
      "integration_not_configured",
      { provider, organizationId },
    );
  }

  return credentials;
}

export function provisionManagedMessagingIntegration(
  state: AppState,
  input: {
    organizationId: string;
    provider: MessagingProvider;
    actorUserId?: string;
  },
): AppState {
  const nowIso = new Date().toISOString();
  const credentials = createManagedCredentials(input.provider, input.organizationId);
  const encryptedCredentials = encryptIntegrationSecret(credentials);

  let nextState: AppState = {
    ...state,
    integrations: upsertMessagingIntegration(state.integrations, {
      organizationId: input.organizationId,
      provider: input.provider,
      patch: {
        encryptedCredentials,
        errorState: undefined,
        externalAccountId: createManagedExternalAccountId(input.provider, input.organizationId),
        healthScore: 96,
        lastSyncAt: nowIso,
        status: "active",
        webhookSecret: getWebhookSecretForCredentials(input.provider, credentials),
      },
    }),
  };

  nextState = addAudit(nextState, {
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "integration.managed_connector_enabled",
    entityType: "integration",
    entityId:
      getIntegrationForProvider(nextState, input.organizationId, input.provider)?.id ??
      input.organizationId,
    metadataJson: {
      connectorMode: "managed",
      provider: input.provider,
    },
  });

  return nextState;
}

async function telegramRequest<T>(
  botToken: string,
  method: string,
  body: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as {
    description?: string;
    ok?: boolean;
    result?: T;
  };

  if (!response.ok || payload.ok !== true || !payload.result) {
    throw new ApiError(
      502,
      payload.description ?? `Telegram ${method} request failed`,
      "telegram_request_failed",
      { method },
    );
  }

  return payload.result;
}

async function metaGraphGet(
  path: string,
  accessToken: string,
  fields: string,
): Promise<Record<string, unknown>> {
  const url = new URL(`https://graph.facebook.com/${metaGraphVersion}/${path}`);
  url.searchParams.set("fields", fields);
  url.searchParams.set("access_token", accessToken);
  const response = await fetch(url, { cache: "no-store" });
  const payload = (await response.json().catch(() => ({}))) as {
    error?: { message?: string; type?: string };
  };

  if (!response.ok) {
    throw new ApiError(
      502,
      payload.error?.message ?? "Meta Graph API request failed",
      "meta_graph_request_failed",
      { path, fields, type: payload.error?.type },
    );
  }

  return asRecord(payload) ?? {};
}

async function metaGraphPost<T>(
  path: string,
  accessToken: string,
  body: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`https://graph.facebook.com/${metaGraphVersion}/${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as {
    error?: { message?: string; type?: string };
  };

  if (!response.ok) {
    throw new ApiError(
      502,
      payload.error?.message ?? "Meta Graph API request failed",
      "meta_graph_request_failed",
      { path, type: payload.error?.type },
    );
  }

  return payload as T;
}

async function verifyTelegramConfig(
  requestUrl: string,
  credentials: TelegramCredentials,
): Promise<{
  botUsername?: string;
  healthScore: number;
  statusMessage: string;
}> {
  const webhookUrl = `${getAppBaseUrl(requestUrl)}/api/v1/webhooks/telegram`;
  ensureHttpsCallback(webhookUrl, "telegram");
  const me = await telegramRequest<{ username?: string; first_name?: string }>(
    credentials.botToken,
    "getMe",
    {},
  );
  await telegramRequest<boolean>(credentials.botToken, "setWebhook", {
    url: webhookUrl,
    allowed_updates: ["message"],
    drop_pending_updates: true,
    secret_token: credentials.webhookSecret,
  });

  return {
    botUsername: readString(me.username),
    healthScore: 97,
    statusMessage: `Webhook registered${me.username ? ` for @${me.username}` : ""}.`,
  };
}

async function verifyWhatsAppConfig(credentials: WhatsAppCredentials): Promise<{
  healthScore: number;
  statusMessage: string;
}> {
  const details = await metaGraphGet(
    credentials.phoneNumberId,
    credentials.accessToken,
    "display_phone_number,verified_name",
  );
  const number = readString(details.display_phone_number);
  const verifiedName = readString(details.verified_name);

  return {
    healthScore: 90,
    statusMessage: `WhatsApp Cloud API verified${number ? ` for ${number}` : ""}${verifiedName ? ` (${verifiedName})` : ""}. Add the callback URL and verify token in Meta Webhooks for inbound events.`,
  };
}

async function verifyInstagramConfig(credentials: InstagramCredentials): Promise<{
  healthScore: number;
  statusMessage: string;
}> {
  const page = await metaGraphGet(credentials.pageId, credentials.pageAccessToken, "name");
  const usernameRecord = credentials.instagramBusinessAccountId
    ? await metaGraphGet(
        credentials.instagramBusinessAccountId,
        credentials.pageAccessToken,
        "username",
      )
    : undefined;

  return {
    healthScore: 86,
    statusMessage: `Instagram messaging verified for ${readString(page.name) ?? "selected page"}${readString(usernameRecord?.username) ? ` / @${readString(usernameRecord?.username)}` : ""}. Put the app into Live mode and subscribe the webhook fields in Meta before receiving production DMs.`,
  };
}

function ensureTelegramCredentials(
  credentials: TelegramCredentials,
): TelegramCredentials {
  return {
    botToken: ensureSecretValue(credentials.botToken, "botToken"),
    botUsername: readString(credentials.botUsername),
    webhookSecret: sanitizeWebhookSecret(credentials.webhookSecret, "webhookSecret"),
  };
}

function ensureWhatsAppCredentials(
  credentials: WhatsAppCredentials,
): WhatsAppCredentials {
  return {
    accessToken: ensureSecretValue(credentials.accessToken, "accessToken"),
    phoneNumberId: ensureSecretValue(credentials.phoneNumberId, "phoneNumberId"),
    businessAccountId: readString(credentials.businessAccountId),
    appSecret: readString(credentials.appSecret),
    webhookVerifyToken: sanitizeWebhookSecret(
      credentials.webhookVerifyToken,
      "webhookVerifyToken",
    ),
  };
}

function ensureInstagramCredentials(
  credentials: InstagramCredentials,
): InstagramCredentials {
  return {
    pageAccessToken: ensureSecretValue(credentials.pageAccessToken, "pageAccessToken"),
    pageId: ensureSecretValue(credentials.pageId, "pageId"),
    instagramBusinessAccountId: readString(credentials.instagramBusinessAccountId),
    appSecret: readString(credentials.appSecret),
    webhookVerifyToken: sanitizeWebhookSecret(
      credentials.webhookVerifyToken,
      "webhookVerifyToken",
    ),
  };
}

export async function configureMessagingIntegration(
  state: AppState,
  input: ConfigureMessagingIntegrationInput,
): Promise<AppState> {
  const nowIso = new Date().toISOString();

  if (input.provider === "telegram") {
    const credentials = ensureTelegramCredentials(input.credentials as TelegramCredentials);
    const verification = await verifyTelegramConfig(input.requestUrl, credentials).catch((error) => ({
      botUsername: credentials.botUsername,
      healthScore: 72,
      statusMessage: `Credentials saved. Telegram provider verification is pending: ${providerErrorMessage(error)}`,
    }));
    const encryptedCredentials = encryptIntegrationSecret({
      ...credentials,
      connectorMode: "live",
      botUsername: verification.botUsername ?? credentials.botUsername,
    } satisfies TelegramCredentials);

    let nextState: AppState = {
      ...state,
      integrations: upsertMessagingIntegration(state.integrations, {
        organizationId: input.organizationId,
        provider: "telegram",
        patch: {
          externalAccountId: verification.botUsername ?? credentials.botUsername ?? "",
          encryptedCredentials,
          webhookSecret: credentials.webhookSecret,
          status: "active",
          errorState: verification.statusMessage,
          healthScore: verification.healthScore,
          lastSyncAt: nowIso,
        },
      }),
    };

    nextState = addAudit(nextState, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "integration.credentials_updated",
      entityType: "integration",
      entityId:
        getIntegrationForProvider(nextState, input.organizationId, "telegram")?.id ??
        input.organizationId,
      metadataJson: {
        provider: "telegram",
        liveWebhook: `${getAppBaseUrl(input.requestUrl)}/api/v1/webhooks/telegram`,
      },
    });

    return nextState;
  }

  if (input.provider === "whatsapp") {
    const credentials = ensureWhatsAppCredentials(input.credentials as WhatsAppCredentials);
    const verification = await verifyWhatsAppConfig(credentials).catch((error) => ({
      healthScore: 72,
      statusMessage: `Credentials saved. WhatsApp provider verification is pending: ${providerErrorMessage(error)}`,
    }));
    const encryptedCredentials = encryptIntegrationSecret({
      ...credentials,
      connectorMode: "live",
    } satisfies WhatsAppCredentials);

    let nextState: AppState = {
      ...state,
      integrations: upsertMessagingIntegration(state.integrations, {
        organizationId: input.organizationId,
        provider: "whatsapp",
        patch: {
          externalAccountId: credentials.phoneNumberId,
          encryptedCredentials,
          webhookSecret: credentials.webhookVerifyToken,
          status: "active",
          errorState: verification.statusMessage,
          healthScore: verification.healthScore,
          lastSyncAt: nowIso,
        },
      }),
    };

    nextState = addAudit(nextState, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "integration.credentials_updated",
      entityType: "integration",
      entityId:
        getIntegrationForProvider(nextState, input.organizationId, "whatsapp")?.id ??
        input.organizationId,
      metadataJson: {
        provider: "whatsapp",
        liveWebhook: `${getAppBaseUrl(input.requestUrl)}/api/v1/webhooks/meta`,
      },
    });

    return nextState;
  }

  const credentials = ensureInstagramCredentials(input.credentials as InstagramCredentials);
  const verification = await verifyInstagramConfig(credentials).catch((error) => ({
    healthScore: 72,
    statusMessage: `Credentials saved. Instagram provider verification is pending: ${providerErrorMessage(error)}`,
  }));
  const encryptedCredentials = encryptIntegrationSecret({
    ...credentials,
    connectorMode: "live",
  } satisfies InstagramCredentials);

  let nextState: AppState = {
    ...state,
    integrations: upsertMessagingIntegration(state.integrations, {
      organizationId: input.organizationId,
      provider: "instagram",
      patch: {
        externalAccountId: credentials.pageId,
        encryptedCredentials,
        webhookSecret: credentials.webhookVerifyToken,
        status: "active",
        errorState: verification.statusMessage,
        healthScore: verification.healthScore,
        lastSyncAt: nowIso,
      },
    }),
  };

  nextState = addAudit(nextState, {
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "integration.credentials_updated",
    entityType: "integration",
    entityId:
      getIntegrationForProvider(nextState, input.organizationId, "instagram")?.id ??
      input.organizationId,
    metadataJson: {
      provider: "instagram",
      liveWebhook: `${getAppBaseUrl(input.requestUrl)}/api/v1/webhooks/meta`,
    },
  });

  return nextState;
}

export async function sendLiveProviderMessage(
  state: AppState,
  conversation: Conversation,
  lead: Lead,
  text: string,
): Promise<OutboundMessageResult> {
  const trimmedText = text.trim();
  if (!trimmedText) {
    throw new ApiError(400, "text is required", "validation_error", { field: "text" });
  }

  if (conversation.provider === "telegram") {
    const credentials = getRequiredMessagingCredentials(
      state,
      conversation.organizationId,
      "telegram",
    );
    const chatId = conversation.providerThreadId || lead.providerContactId;
    if (isManagedMessagingCredentials(credentials)) {
      return createManagedOutboundResult("telegram", chatId || lead.id);
    }
    if (!chatId) {
      throw new ApiError(409, "Telegram chat_id is missing for this conversation", "channel_not_replyable");
    }

    const result = await telegramRequest<{ date?: number; message_id?: number }>(
      credentials.botToken,
      "sendMessage",
      {
        chat_id: chatId,
        text: trimmedText,
      },
    );
    const deliveredAt = result.date
      ? new Date(result.date * 1000).toISOString()
      : new Date().toISOString();

    return {
      providerMessageId: result.message_id ? `tg-${result.message_id}` : createRuntimeId("tg"),
      deliveredAt,
      payloadJson: {
        live: true,
        provider: "telegram",
        chatId,
      },
    };
  }

  if (conversation.provider === "whatsapp") {
    const credentials = getRequiredMessagingCredentials(
      state,
      conversation.organizationId,
      "whatsapp",
    );
    if (isManagedMessagingCredentials(credentials)) {
      const destination =
        sanitizePhoneForWhatsApp(lead.phone) ??
        sanitizePhoneForWhatsApp(conversation.providerThreadId) ??
        sanitizePhoneForWhatsApp(lead.providerContactId) ??
        lead.providerContactId ??
        conversation.providerThreadId ??
        lead.id;
      return createManagedOutboundResult("whatsapp", destination);
    }
    const to =
      sanitizePhoneForWhatsApp(lead.phone) ??
      sanitizePhoneForWhatsApp(conversation.providerThreadId) ??
      sanitizePhoneForWhatsApp(lead.providerContactId);
    if (!to) {
      throw new ApiError(
        409,
        "WhatsApp requires a patient phone number or wa_id on the lead",
        "channel_not_replyable",
      );
    }

    const payload = await metaGraphPost<{ messages?: Array<{ id?: string }> }>(
      `${credentials.phoneNumberId}/messages`,
      credentials.accessToken,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: {
          body: trimmedText,
          preview_url: false,
        },
      },
    );
    const providerMessageId = readString(payload.messages?.[0]?.id);
    if (!providerMessageId) {
      throw new ApiError(502, "WhatsApp did not return a message id", "provider_message_missing");
    }

    return {
      providerMessageId,
      deliveredAt: new Date().toISOString(),
      payloadJson: {
        live: true,
        provider: "whatsapp",
        phoneNumberId: credentials.phoneNumberId,
        to,
      },
    };
  }

  if (conversation.provider === "instagram") {
    const credentials = getRequiredMessagingCredentials(
      state,
      conversation.organizationId,
      "instagram",
    );
    const recipientId = conversation.providerThreadId || lead.providerContactId;
    if (isManagedMessagingCredentials(credentials)) {
      return createManagedOutboundResult("instagram", recipientId || lead.id);
    }
    if (!recipientId) {
      throw new ApiError(409, "Instagram recipient id is missing", "channel_not_replyable");
    }

    const payload = await metaGraphPost<{ message_id?: string }>(
      `${credentials.pageId}/messages`,
      credentials.pageAccessToken,
      {
        recipient: { id: recipientId },
        messaging_type: "RESPONSE",
        message: {
          text: trimmedText,
        },
      },
    );
    const providerMessageId = readString(payload.message_id);
    if (!providerMessageId) {
      throw new ApiError(502, "Instagram Send API did not return a message id", "provider_message_missing");
    }

    return {
      providerMessageId,
      deliveredAt: new Date().toISOString(),
      payloadJson: {
        live: true,
        provider: "instagram",
        pageId: credentials.pageId,
        recipientId,
      },
    };
  }

  if (conversation.provider === "web_form") {
    throw new ApiError(
      409,
      "Web form leads require manual follow-up. There is no outbound messaging API for this source.",
      "channel_not_replyable",
    );
  }

  throw new ApiError(
    409,
    "Clinic DB conversations are read-only and do not support outbound messaging",
    "channel_not_replyable",
  );
}

export function extractTelegramInboundMessage(
  state: AppState,
  payload: Record<string, unknown>,
  secretToken: string | null,
): CanonicalInboundMessage | undefined {
  if (!secretToken) {
    throw new ApiError(401, "Telegram secret header is missing", "invalid_webhook_secret");
  }

  const integration = state.integrations.find(
    (item) => item.provider === "telegram" && item.webhookSecret === secretToken,
  );
  if (!integration || integration.status === "disconnected") {
    throw new ApiError(401, "Telegram webhook secret is invalid", "invalid_webhook_secret");
  }

  const updateId = readNumber(payload.update_id);
  const message =
    asRecord(payload.message) ??
    asRecord(payload.edited_message) ??
    asRecord(payload.channel_post);
  if (!message) {
    return undefined;
  }

  const text = readString(message.text) ?? readString(message.caption);
  if (!text) {
    return undefined;
  }

  const chat = asRecord(message.chat) ?? {};
  const from = asRecord(message.from) ?? {};
  const chatId = String(chat.id ?? from.id ?? createRuntimeId("tg-chat"));
  const firstName = readString(from.first_name);
  const lastName = readString(from.last_name);
  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  const fallbackName = readString(chat.title) ?? readString(from.username) ?? "Telegram patient";
  const unixDate = readNumber(message.date);
  const messageId = readNumber(message.message_id);

  return {
    organizationId: integration.organizationId,
    provider: "telegram",
    providerEventId: updateId ? `tg-update-${updateId}` : createRuntimeId("tg-update"),
    providerMessageId: messageId ? `tg-msg-${messageId}` : createRuntimeId("tg-msg"),
    providerContactId: chatId,
    providerThreadId: chatId,
    patientName: fullName || fallbackName,
    text,
    occurredAt: unixDate ? new Date(unixDate * 1000).toISOString() : new Date().toISOString(),
    rawPayload: payload,
  };
}

function pickWhatsAppIntegration(
  state: AppState,
  phoneNumberId?: string,
): { credentials: WhatsAppCredentials; integration: Integration } | undefined {
  const integrations = state.integrations.filter((item) => item.provider === "whatsapp");
  for (const integration of integrations) {
    const credentials = resolveMessagingCredentials(
      state,
      integration.organizationId,
      "whatsapp",
    );
    if (!credentials || isManagedMessagingCredentials(credentials)) {
      continue;
    }

    if (!phoneNumberId || credentials.phoneNumberId === phoneNumberId) {
      return { credentials, integration };
    }
  }

  return undefined;
}

function pickInstagramIntegration(
  state: AppState,
  pageId?: string,
): { credentials: InstagramCredentials; integration: Integration } | undefined {
  const integrations = state.integrations.filter((item) => item.provider === "instagram");
  for (const integration of integrations) {
    const credentials = resolveMessagingCredentials(
      state,
      integration.organizationId,
      "instagram",
    );
    if (!credentials || isManagedMessagingCredentials(credentials)) {
      continue;
    }

    if (!pageId || credentials.pageId === pageId) {
      return { credentials, integration };
    }
  }

  return undefined;
}

function extractWhatsAppMessages(
  state: AppState,
  payload: Record<string, unknown>,
): CanonicalInboundMessage[] {
  const results: CanonicalInboundMessage[] = [];
  for (const entry of asArray(payload.entry)) {
    const entryRecord = asRecord(entry);
    if (!entryRecord) {
      continue;
    }

    for (const change of asArray(entryRecord.changes)) {
      const changeRecord = asRecord(change);
      const value = asRecord(changeRecord?.value);
      const metadata = asRecord(value?.metadata);
      const phoneNumberId = readString(metadata?.phone_number_id);
      const integration = pickWhatsAppIntegration(state, phoneNumberId);
      if (!integration) {
        continue;
      }

      const contacts = asArray(value?.contacts)
        .map((item) => asRecord(item))
        .filter((item): item is Record<string, unknown> => Boolean(item));
      for (const message of asArray(value?.messages)) {
        const messageRecord = asRecord(message);
        if (!messageRecord) {
          continue;
        }

        const text = readString(asRecord(messageRecord.text)?.body);
        const from = readString(messageRecord.from);
        const messageId = readString(messageRecord.id);
        if (!text || !from || !messageId) {
          continue;
        }

        const contact = contacts.find((item) => readString(item.wa_id) === from);
        const patientName =
          readString(asRecord(contact?.profile)?.name) ?? `WhatsApp patient ${from.slice(-4)}`;
        const timestamp = readString(messageRecord.timestamp);
        const occurredAt =
          timestamp && !Number.isNaN(Number(timestamp))
            ? new Date(Number(timestamp) * 1000).toISOString()
            : new Date().toISOString();

        results.push({
          organizationId: integration.integration.organizationId,
          provider: "whatsapp",
          providerEventId: messageId,
          providerMessageId: messageId,
          providerContactId: from,
          providerThreadId: from,
          patientName,
          patientPhone: from,
          text,
          occurredAt,
          rawPayload: messageRecord,
        });
      }
    }
  }

  return results;
}

function extractInstagramMessages(
  state: AppState,
  payload: Record<string, unknown>,
): CanonicalInboundMessage[] {
  const results: CanonicalInboundMessage[] = [];
  for (const entry of asArray(payload.entry)) {
    const entryRecord = asRecord(entry);
    if (!entryRecord) {
      continue;
    }

    const pageId = readString(entryRecord.id);
    const integration = pickInstagramIntegration(state, pageId);
    if (!integration) {
      continue;
    }

    for (const messagingItem of asArray(entryRecord.messaging)) {
      const event = asRecord(messagingItem);
      if (!event) {
        continue;
      }
      const sender = asRecord(event?.sender);
      const recipient = asRecord(event?.recipient);
      const message = asRecord(event?.message);
      const senderId = readString(sender?.id);
      const recipientId = readString(recipient?.id) ?? pageId;
      const messageId = readString(message?.mid);
      const text = readString(message?.text);
      const timestamp = readNumber(event?.timestamp);
      const isEcho = message?.is_echo === true;

      if (!senderId || !recipientId || !messageId || !text || isEcho) {
        continue;
      }

      results.push({
        organizationId: integration.integration.organizationId,
        provider: "instagram",
        providerEventId: messageId,
        providerMessageId: messageId,
        providerContactId: senderId,
        providerThreadId: senderId,
        patientName: `Instagram user ${senderId.slice(-4)}`,
        text,
        occurredAt: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString(),
        rawPayload: event,
      });
    }
  }

  return results;
}

export function extractMetaInboundMessages(
  state: AppState,
  payload: Record<string, unknown>,
): CanonicalInboundMessage[] {
  const objectType = readString(payload.object);

  if (objectType === "whatsapp_business_account") {
    return extractWhatsAppMessages(state, payload);
  }

  if (objectType === "instagram" || objectType === "page") {
    const instagramMessages = extractInstagramMessages(state, payload);
    if (instagramMessages.length > 0) {
      return instagramMessages;
    }

    return extractWhatsAppMessages(state, payload);
  }

  return [];
}

export function verifyMetaWebhookSignature(
  state: AppState,
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  const secrets = state.integrations
    .filter((integration) => integration.provider === "whatsapp" || integration.provider === "instagram")
    .map((integration) => {
      const credentials =
        integration.provider === "whatsapp"
          ? resolveMessagingCredentials(state, integration.organizationId, "whatsapp")
          : resolveMessagingCredentials(state, integration.organizationId, "instagram");
      return readString(credentials?.appSecret);
    })
    .filter((value): value is string => Boolean(value));

  if (secrets.length === 0) {
    return false;
  }

  if (!signatureHeader?.startsWith("sha256=")) {
    return false;
  }

  return secrets.some((secret) => {
    const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    const expected = `sha256=${digest}`;
    const left = Buffer.from(signatureHeader);
    const right = Buffer.from(expected);
    return left.length === right.length && crypto.timingSafeEqual(left, right);
  });
}

export function isKnownMetaVerifyToken(
  state: AppState,
  verifyToken: string,
): boolean {
  return state.integrations.some(
    (integration) =>
      (integration.provider === "whatsapp" || integration.provider === "instagram") &&
      integration.webhookSecret === verifyToken,
  );
}
