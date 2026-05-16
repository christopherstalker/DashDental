import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { Prisma } from "@/generated/prisma/client";
import type { CanonicalInboundMessage, Provider } from "@/domain/types";
import { ApiError } from "./api-error";
import { isPrismaStorageEnabled, mutateAppState } from "./data-store";
import { isProductionRuntime } from "./feature-flags";
import { materializeInboundMessageOutboxEvent } from "./message-materialization";
import { prisma } from "./prisma";
import { createLeadFromInbound } from "./state-mutations";
import {
  applyStripeBillingEventToState,
  processStripeBillingOutboxEvent,
} from "./billing-ledger";
import { captureError, structuredLog } from "./observability";
import { enqueueOutboxDispatch } from "./queue-runtime";

type WebhookProvider = "telegram" | "meta" | "web_form" | "stripe";
type SignatureStatus = "valid" | "invalid" | "pending" | "skipped";

interface DurableInboundWebhookInput {
  provider: Exclude<WebhookProvider, "stripe">;
  rawBody: string;
  payload: Record<string, unknown>;
  signatureStatus: SignatureStatus;
  providerAccountKey?: string;
  externalEventId?: string;
  canonicalMessages: CanonicalInboundMessage[];
}

interface DurableStripeWebhookInput {
  rawBody: string;
  event: {
    id: string;
    type: string;
    created?: number;
    data: {
      object: Record<string, unknown>;
    };
  };
}

interface LedgerReceipt {
  id: string;
  provider: WebhookProvider;
  dedupeKey: string;
  externalEventId: string;
  payloadJson: Record<string, unknown>;
  payloadSha256: string;
  signatureStatus: SignatureStatus;
  processingStatus: "processed" | "ignored";
  providerAccountKey: string;
  receivedAt: string;
}

interface LedgerOutboxEvent {
  id: string;
  receiptId: string;
  eventName: string;
  payloadJson: Record<string, unknown>;
  status: "pending" | "dispatched" | "failed";
  createdAt: string;
}

interface FileWebhookLedger {
  receipts: LedgerReceipt[];
  outboxEvents: LedgerOutboxEvent[];
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function createRuntimeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function ledgerPath(): string {
  return path.join(process.cwd(), ".data", "durable-webhook-ledger.json");
}

async function readFileLedger(): Promise<FileWebhookLedger> {
  try {
    return JSON.parse(await fs.readFile(ledgerPath(), "utf8")) as FileWebhookLedger;
  } catch {
    return { receipts: [], outboxEvents: [] };
  }
}

async function writeFileLedger(ledger: FileWebhookLedger) {
  const filePath = ledgerPath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(ledger, null, 2), "utf8");
}

export function resolveWebhookExternalEventId(
  externalEventId: string | undefined,
  rawBody: string,
): string {
  return externalEventId?.trim() || `hash-${sha256(rawBody).slice(0, 40)}`;
}

export function createWebhookDedupeKey(input: {
  provider: WebhookProvider;
  channelProvider?: Provider;
  providerAccountKey?: string;
  externalEventId: string;
}): string {
  return sha256(
    [
      input.provider,
      input.channelProvider ?? "",
      input.providerAccountKey ?? "",
      input.externalEventId,
    ].join(":"),
  );
}

function canonicalToOutboxPayload(message: CanonicalInboundMessage) {
  return {
    provider: message.provider,
    channelProvider: message.provider,
    organizationId: message.organizationId,
    externalEventId: message.providerEventId,
    externalMessageId: message.providerMessageId,
    externalThreadId: message.providerThreadId,
    externalContactId: message.providerContactId,
    text: message.text,
    patientName: message.patientName,
    patientPhone: message.patientPhone,
    occurredAt: message.occurredAt,
    rawPayload: message.rawPayload,
  };
}

async function materializeInboundPayload(payload: Record<string, unknown>) {
  await mutateAppState((state) =>
    createLeadFromInbound(state, {
      organizationId: String(payload.organizationId ?? ""),
      source: payload.channelProvider as Provider,
      providerEventId: String(payload.externalEventId ?? ""),
      providerMessageId: String(payload.externalMessageId ?? ""),
      providerThreadId: String(payload.externalThreadId ?? ""),
      providerContactId: String(payload.externalContactId ?? ""),
      name: String(payload.patientName ?? "Patient"),
      phone: readString(payload.patientPhone),
      messageText: String(payload.text ?? "Inbound message received"),
      nowIso: readString(payload.occurredAt),
    }),
  );
}

async function processInboundOutboxEvent(outboxEventId: string) {
  const outboxEvent = await prisma.outboxEvent.findUnique({
    where: { id: outboxEventId },
  });
  if (!outboxEvent) {
    return { outboxEventId, state: "missing" };
  }

  if (outboxEvent.status === "dispatched") {
    return { outboxEventId, state: "already-dispatched" };
  }

  try {
    const startedAt = Date.now();
    await prisma.outboxEvent.update({
      where: { id: outboxEventId },
      data: {
        status: "dispatching",
        claimedAt: new Date(),
        claimExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
        attemptCount: { increment: 1 },
      },
    });
    const materialized = await materializeInboundMessageOutboxEvent(outboxEventId);
    if (
      materialized.state === "invalid-payload" ||
      materialized.state === "missing-outbox-event"
    ) {
      throw new ApiError(
        422,
        `Inbound outbox materialization failed: ${materialized.state}`,
        "inbound_materialization_failed",
      );
    }
    await prisma.outboxEvent.update({
      where: { id: outboxEventId },
      data: {
        status: "dispatched",
        dispatchedAt: new Date(),
        claimedAt: null,
        claimExpiresAt: null,
        lastErrorCode: null,
        lastErrorMessage: null,
      },
    });
    structuredLog("info", "webhook.materialized", {
      outboxEventId,
      status: "dispatched",
      latencyMs: Date.now() - startedAt,
    });

    return { outboxEventId, state: "dispatched" };
  } catch (error) {
    const attemptCount = outboxEvent.attemptCount + 1;
    await prisma.outboxEvent.update({
      where: { id: outboxEventId },
      data: {
        status: attemptCount >= 8 ? "dead_letter" : "failed",
        claimedAt: null,
        claimExpiresAt: null,
        lastErrorCode: error instanceof Error ? error.name : "dispatch_error",
        lastErrorMessage: error instanceof Error ? error.message : String(error),
      },
    });
    captureError(error, {
      event: "webhook.materialization_failed",
      outboxEventId,
      status: attemptCount >= 8 ? "dead_letter" : "failed",
      attemptCount,
    });
    throw error;
  }
}

async function processFileInboundOutbox(event: LedgerOutboxEvent) {
  await materializeInboundPayload(event.payloadJson);
  event.status = "dispatched";
}

export async function acceptInboundWebhook(input: DurableInboundWebhookInput) {
  if (input.signatureStatus === "invalid") {
    throw new ApiError(401, "Webhook signature is invalid", "invalid_webhook_secret");
  }

  const externalEventId = resolveWebhookExternalEventId(
    input.externalEventId ?? input.canonicalMessages[0]?.providerEventId,
    input.rawBody,
  );
  const providerAccountKey =
    input.providerAccountKey ??
    input.canonicalMessages[0]?.organizationId ??
    input.provider;
  const channelProvider = input.canonicalMessages[0]?.provider;
  const dedupeKey = createWebhookDedupeKey({
    provider: input.provider,
    channelProvider,
    providerAccountKey,
    externalEventId,
  });
  const payloadSha256 = sha256(input.rawBody);
  structuredLog("info", "webhook.received", {
    provider: input.provider,
    externalEventId,
    providerAccountKey,
    verificationStatus: input.signatureStatus,
    canonicalMessageCount: input.canonicalMessages.length,
  });

  if (!isPrismaStorageEnabled()) {
    const ledger = await readFileLedger();
    const existing = ledger.receipts.find((receipt) => receipt.dedupeKey === dedupeKey);
    if (existing) {
      structuredLog("info", "webhook.duplicate", {
        provider: input.provider,
        receiptId: existing.id,
        externalEventId,
        providerAccountKey,
      });
      return {
        duplicate: true,
        receiptId: existing.id,
        outboxEventIds: ledger.outboxEvents
          .filter((event) => event.receiptId === existing.id)
          .map((event) => event.id),
      };
    }

    const receipt: LedgerReceipt = {
      id: createRuntimeId("receipt"),
      provider: input.provider,
      dedupeKey,
      externalEventId,
      payloadJson: input.payload,
      payloadSha256,
      signatureStatus: input.signatureStatus,
      processingStatus: input.canonicalMessages.length > 0 ? "processed" : "ignored",
      providerAccountKey,
      receivedAt: new Date().toISOString(),
    };
    const events: LedgerOutboxEvent[] = input.canonicalMessages.map((message) => ({
      id: createRuntimeId("outbox"),
      receiptId: receipt.id,
      eventName: "messaging.inbound.received",
      payloadJson: canonicalToOutboxPayload(message),
      status: "pending",
      createdAt: new Date().toISOString(),
    }));
    ledger.receipts.push(receipt);
    ledger.outboxEvents.push(...events);
    await writeFileLedger(ledger);

    for (const event of events) {
      await processFileInboundOutbox(event);
    }
    await writeFileLedger(ledger);

    return {
      duplicate: false,
      receiptId: receipt.id,
      outboxEventIds: events.map((event) => event.id),
    };
  }

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.webhookReceipt.findUnique({
      where: { dedupeKey },
      select: { id: true },
    });
    if (existing) {
      const outboxEvents = await tx.outboxEvent.findMany({
        where: { receiptId: existing.id },
        select: { id: true },
      });
      return {
        duplicate: true,
        receiptId: existing.id,
        outboxEventIds: outboxEvents.map((event) => event.id),
      };
    }

    const receipt = await tx.webhookReceipt.create({
      data: {
        provider: input.provider,
        channelProvider,
        organizationId: input.canonicalMessages[0]?.organizationId,
        externalEventId,
        dedupeKey,
        payloadJson: toJsonValue(input.payload),
        payloadSha256,
        signatureStatus: input.signatureStatus,
        processingStatus: input.canonicalMessages.length > 0 ? "processed" : "ignored",
        correlationId: crypto.randomUUID(),
        providerAccountKey,
        occurredAt: input.canonicalMessages[0]?.occurredAt
          ? new Date(input.canonicalMessages[0].occurredAt)
          : undefined,
        firstProcessedAt: new Date(),
        lastProcessedAt: new Date(),
      },
      select: { id: true, correlationId: true },
    });

    const createdOutbox = [];
    for (const message of input.canonicalMessages) {
      const payloadJson = canonicalToOutboxPayload(message);
      const outboxEvent = await tx.outboxEvent.create({
        data: {
          organizationId: message.organizationId,
          receiptId: receipt.id,
          aggregateType: "external_conversation",
          aggregateId: `${message.provider}:${message.organizationId}:${message.providerThreadId}`,
          eventName: "messaging.inbound.received",
          schemaVersion: 1,
          status: "pending",
          partitionKey: `${message.provider}:${message.organizationId}:${message.providerThreadId}`,
          causationId: receipt.id,
          correlationId: receipt.correlationId,
          payloadJson: toJsonValue(payloadJson),
          occurredAt: new Date(message.occurredAt),
        },
        select: { id: true },
      });
      createdOutbox.push(outboxEvent.id);
    }

    return {
      duplicate: false,
      receiptId: receipt.id,
      outboxEventIds: createdOutbox,
    };
  });
  structuredLog("info", result.duplicate ? "webhook.duplicate" : "webhook.stored", {
    provider: input.provider,
    receiptId: result.receiptId,
    externalEventId,
    providerAccountKey,
    outboxEventCount: result.outboxEventIds.length,
  });

  if (!result.duplicate) {
    for (const outboxEventId of result.outboxEventIds) {
      const queueResult = await enqueueOutboxDispatch(outboxEventId);
      if (!queueResult.queued && !isProductionRuntime()) {
        await processInboundOutboxEvent(outboxEventId);
      }
    }
  }

  return result;
}

function organizationIdFromStripeObject(object: Record<string, unknown>): string | undefined {
  const metadata = object.metadata as Record<string, unknown> | undefined;
  return readString(metadata?.organization_id) ?? readString(object.client_reference_id);
}

export async function acceptStripeWebhook(input: DurableStripeWebhookInput) {
  const object = input.event.data.object;
  const organizationId = organizationIdFromStripeObject(object);
  const dedupeKey = createWebhookDedupeKey({
    provider: "stripe",
    providerAccountKey: organizationId ?? readString(object.customer) ?? "",
    externalEventId: input.event.id,
  });
  structuredLog("info", "stripe.event.received", {
    provider: "stripe",
    organizationId,
    externalEventId: input.event.id,
    eventType: input.event.type,
    customerId: readString(object.customer),
  });

  if (!isPrismaStorageEnabled()) {
    let duplicate = false;
    await mutateAppState((state) => {
      const result = applyStripeBillingEventToState(state, {
          eventId: input.event.id,
          eventType: input.event.type,
          organizationId,
          customerId: readString(object.customer),
          subscriptionId: readString(object.subscription) ?? readString(object.id),
          stripeObject: object,
          receivedAt: input.event.created
            ? new Date(input.event.created * 1000).toISOString()
            : new Date().toISOString(),
          rawEvent: input.event,
        });
      duplicate = result.duplicate;
      return result.state;
    });

    structuredLog("info", duplicate ? "stripe.event.duplicate" : "stripe.event.processed", {
      provider: "stripe",
      organizationId,
      externalEventId: input.event.id,
      eventType: input.event.type,
    });
    return {
      duplicate,
      receiptId: undefined,
      outboxEventId: undefined,
    };
  }

  const occurredAt = input.event.created
    ? new Date(input.event.created * 1000)
    : new Date();
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.webhookReceipt.findUnique({
      where: { dedupeKey },
      select: { id: true },
    });
    if (existing) {
      const outboxEvent = await tx.outboxEvent.findFirst({
        where: { receiptId: existing.id, eventName: "billing.stripe.received" },
        select: { id: true },
      });
      return {
        duplicate: true,
        receiptId: existing.id,
        outboxEventId: outboxEvent?.id,
      };
    }

    const receipt = await tx.webhookReceipt.create({
      data: {
        provider: "stripe",
        organizationId,
        externalEventId: input.event.id,
        dedupeKey,
        payloadJson: toJsonValue(input.event),
        payloadSha256: sha256(input.rawBody),
        signatureStatus: "valid",
        processingStatus: "received",
        correlationId: crypto.randomUUID(),
        providerAccountKey: organizationId ?? readString(object.customer) ?? "",
        occurredAt,
        firstProcessedAt: new Date(),
        lastProcessedAt: new Date(),
      },
      select: { id: true, correlationId: true },
    });
    const payloadJson = {
      provider: "stripe",
      externalEventId: input.event.id,
      eventType: input.event.type,
      objectId: readString(object.id),
      organizationId,
      stripeObject: object,
      rawEvent: input.event,
    };
    const outboxEvent = await tx.outboxEvent.create({
      data: {
        organizationId,
        receiptId: receipt.id,
        aggregateType: "organization_billing",
        aggregateId: organizationId ?? input.event.id,
        eventName: "billing.stripe.received",
        schemaVersion: 1,
        status: "pending",
        partitionKey: organizationId ?? input.event.id,
        causationId: receipt.id,
        correlationId: receipt.correlationId,
        payloadJson: toJsonValue(payloadJson),
        occurredAt,
      },
      select: { id: true },
    });
    await tx.billingEvent.create({
      data: {
        organizationId,
        outboxEventId: outboxEvent.id,
        provider: "stripe",
        providerEventId: input.event.id,
        providerEventType: input.event.type,
        providerObjectId: readString(object.id),
        externalCustomerId: readString(object.customer),
        externalSubscriptionId: readString(object.subscription) ?? readString(object.id),
        status: "processing",
        eventCreatedAt: occurredAt,
        rawPayloadJson: toJsonValue(input.event),
      },
    });

    return {
      duplicate: false,
      receiptId: receipt.id,
      outboxEventId: outboxEvent.id,
    };
  });
  structuredLog("info", result.duplicate ? "stripe.event.duplicate" : "stripe.event.stored", {
    provider: "stripe",
    organizationId,
    externalEventId: input.event.id,
    eventType: input.event.type,
    receiptId: result.receiptId,
    outboxEventId: result.outboxEventId,
  });

  if (!result.duplicate && result.outboxEventId) {
    const queueResult = await enqueueOutboxDispatch(result.outboxEventId);
    if (!queueResult.queued && !isProductionRuntime()) {
      await processStripeBillingOutboxEvent(result.outboxEventId);
    }
  }

  return result;
}
