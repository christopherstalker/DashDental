import { isPrismaStorageEnabled } from "./data-store";

function clampLimit(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return 50;
  }

  return Math.min(200, Math.max(1, Math.trunc(value ?? 50)));
}

export async function getWebhookPipelineVisibility(input?: {
  organizationId?: string;
  limit?: number;
}) {
  const limit = clampLimit(input?.limit);

  if (!isPrismaStorageEnabled()) {
    return {
      receipts: [],
      outboxEvents: [],
      messageDeliveries: [],
    };
  }

  const { prisma } = await import("./prisma");
  const organizationWhere = input?.organizationId
    ? { organizationId: input.organizationId }
    : {};
  const [receipts, outboxEvents, messageDeliveries] = await Promise.all([
    prisma.webhookReceipt.findMany({
      where: organizationWhere,
      orderBy: { receivedAt: "desc" },
      take: limit,
      select: {
        id: true,
        organizationId: true,
        provider: true,
        externalEventId: true,
        signatureStatus: true,
        processingStatus: true,
        retryCount: true,
        receivedAt: true,
        firstProcessedAt: true,
        lastProcessedAt: true,
        lastErrorCode: true,
        lastErrorMessage: true,
      },
    }),
    prisma.outboxEvent.findMany({
      where: organizationWhere,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        organizationId: true,
        receiptId: true,
        eventName: true,
        aggregateType: true,
        aggregateId: true,
        status: true,
        attemptCount: true,
        createdAt: true,
        availableAt: true,
        dispatchedAt: true,
        lastErrorCode: true,
        lastErrorMessage: true,
      },
    }),
    prisma.messageDelivery.findMany({
      where: organizationWhere,
      orderBy: { updatedAt: "desc" },
      take: limit,
      select: {
        id: true,
        organizationId: true,
        conversationId: true,
        messageId: true,
        outboxEventId: true,
        provider: true,
        localMessageId: true,
        providerMessageId: true,
        status: true,
        attemptCount: true,
        sentAt: true,
        deliveredAt: true,
        failedAt: true,
        createdAt: true,
        updatedAt: true,
        lastErrorCode: true,
        lastErrorMessage: true,
      },
    }),
  ]);

  return {
    receipts,
    outboxEvents,
    messageDeliveries,
  };
}

export async function getBillingLedgerVisibility(input?: {
  organizationId?: string;
  limit?: number;
}) {
  const limit = clampLimit(input?.limit);

  if (!isPrismaStorageEnabled()) {
    return {
      billingEvents: [],
      usageRollups: [],
    };
  }

  const { prisma } = await import("./prisma");
  const organizationWhere = input?.organizationId
    ? { organizationId: input.organizationId }
    : {};
  const [billingEvents, usageRollups] = await Promise.all([
    prisma.billingEvent.findMany({
      where: organizationWhere,
      orderBy: { eventCreatedAt: "desc" },
      take: limit,
      select: {
        id: true,
        organizationId: true,
        subscriptionId: true,
        outboxEventId: true,
        providerEventId: true,
        providerEventType: true,
        providerObjectId: true,
        externalCustomerId: true,
        externalSubscriptionId: true,
        status: true,
        decision: true,
        eventCreatedAt: true,
        processedAt: true,
        retryCount: true,
        errorCode: true,
        errorMessage: true,
        lastErrorCode: true,
        lastErrorMessage: true,
        updatedAt: true,
      },
    }),
    prisma.usageRollup.findMany({
      where: organizationWhere,
      orderBy: [{ periodStart: "desc" }, { metric: "asc" }],
      take: limit,
      select: {
        id: true,
        organizationId: true,
        metric: true,
        periodStart: true,
        periodEnd: true,
        quantity: true,
        lastEventAt: true,
        updatedAt: true,
      },
    }),
  ]);

  return {
    billingEvents,
    usageRollups,
  };
}
