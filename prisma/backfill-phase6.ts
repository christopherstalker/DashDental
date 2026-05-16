import { prisma } from "../src/server/prisma";
import { refreshConversationProjection } from "../src/server/inbox-projections";
import { upsertMessageDeliveryStatus } from "../src/server/message-deliveries";
import { structuredLog } from "../src/server/observability";

type BackfillSummary = {
  dryRun: boolean;
  organizationId?: string;
  conversationProjections: number;
  messageDeliveries: number;
  billingEvents: number;
  usageRollups: number;
};

function readArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv
    .find((arg) => arg.startsWith(prefix))
    ?.slice(prefix.length)
    .trim();
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function jsonObject(value: unknown): Record<string, unknown> {
  return asRecord(value) ?? {};
}

async function backfillConversationProjections(
  dryRun: boolean,
  organizationId?: string,
): Promise<number> {
  const conversations = await prisma.conversation.findMany({
    where: organizationId ? { organizationId } : {},
    select: { id: true },
    orderBy: { lastMessageAt: "desc" },
  });

  if (!dryRun) {
    for (const conversation of conversations) {
      await refreshConversationProjection(conversation.id);
    }
  }

  return conversations.length;
}

async function backfillMessageDeliveries(
  dryRun: boolean,
  organizationId?: string,
): Promise<number> {
  const messages = await prisma.message.findMany({
    where: {
      direction: "outbound",
      conversation: organizationId ? { organizationId } : undefined,
    },
    include: {
      conversation: true,
      delivery: true,
    },
    orderBy: { sentAt: "asc" },
  });
  const missingDeliveries = messages.filter((message) => !message.delivery);

  if (!dryRun) {
    for (const message of missingDeliveries) {
      const payload = jsonObject(message.payloadJson);
      await upsertMessageDeliveryStatus({
        organizationId: message.conversation.organizationId,
        conversationId: message.conversationId,
        localProviderMessageId: message.providerMessageId,
        outboxEventId: readString(payload.outboxEventId),
        providerMessageId: readString(payload.providerMessageId),
        status: message.deliveredAt ? "delivered" : "pending",
        attempts: readNumber(payload.attempts),
        timestampIso: (message.deliveredAt ?? message.sentAt).toISOString(),
      });
    }
  }

  return missingDeliveries.length;
}

async function backfillBillingEvents(
  dryRun: boolean,
  organizationId?: string,
): Promise<number> {
  const allEvents = await prisma.billingEvent.findMany({
    where: organizationId ? { organizationId } : {},
    orderBy: { eventCreatedAt: "asc" },
  });
  const events = allEvents.filter(
    (event) =>
      !event.externalCustomerId ||
      !event.externalSubscriptionId ||
      event.rawPayloadJson === null ||
      !event.subscriptionId,
  );

  if (!dryRun) {
    for (const event of events) {
      const raw = jsonObject(event.rawPayloadJson);
      const object =
        asRecord(asRecord(raw.data)?.object) ??
        asRecord(raw.stripeObject) ??
        {};
      const result = jsonObject(event.resultJson);
      const externalCustomerId =
        event.externalCustomerId ??
        readString(object.customer) ??
        readString(result.externalCustomerId);
      const externalSubscriptionId =
        event.externalSubscriptionId ??
        readString(object.subscription) ??
        readString(object.id) ??
        readString(result.externalSubscriptionId);
      const subscription = event.subscriptionId
        ? undefined
        : await prisma.subscription.findFirst({
            where: {
              ...(event.organizationId ? { organizationId: event.organizationId } : {}),
              ...(externalSubscriptionId
                ? { externalSubscriptionId }
                : externalCustomerId
                  ? { externalCustomerId }
                  : {}),
            },
            select: { id: true },
            orderBy: { updatedAt: "desc" },
          });

      await prisma.billingEvent.update({
        where: { id: event.id },
        data: {
          externalCustomerId,
          externalSubscriptionId,
          subscriptionId: event.subscriptionId ?? subscription?.id,
          rawPayloadJson:
            event.rawPayloadJson ??
            {
              id: event.providerEventId,
              type: event.providerEventType,
              reconstructed: true,
            },
        },
      });
    }
  }

  return events.length;
}

async function backfillUsageRollups(
  dryRun: boolean,
  organizationId?: string,
): Promise<number> {
  const groups = await prisma.usageEvent.groupBy({
    by: ["organizationId", "metric", "periodStart"],
    where: organizationId ? { organizationId } : {},
    _sum: { quantity: true },
    _max: {
      periodEnd: true,
      occurredAt: true,
    },
  });

  if (!dryRun) {
    for (const group of groups) {
      await prisma.usageRollup.upsert({
        where: {
          organizationId_metric_periodStart: {
            organizationId: group.organizationId,
            metric: group.metric,
            periodStart: group.periodStart,
          },
        },
        create: {
          organizationId: group.organizationId,
          metric: group.metric,
          periodStart: group.periodStart,
          periodEnd: group._max.periodEnd ?? group.periodStart,
          quantity: group._sum.quantity ?? 0,
          lastEventAt: group._max.occurredAt,
        },
        update: {
          periodEnd: group._max.periodEnd ?? group.periodStart,
          quantity: group._sum.quantity ?? 0,
          lastEventAt: group._max.occurredAt,
        },
      });
    }
  }

  return groups.length;
}

async function main() {
  const dryRun = !process.argv.includes("--write");
  const organizationId = readArg("organizationId");
  structuredLog("info", "backfill.phase6.started", { dryRun, organizationId });

  const summary: BackfillSummary = {
    dryRun,
    organizationId,
    conversationProjections: await backfillConversationProjections(dryRun, organizationId),
    messageDeliveries: await backfillMessageDeliveries(dryRun, organizationId),
    billingEvents: await backfillBillingEvents(dryRun, organizationId),
    usageRollups: await backfillUsageRollups(dryRun, organizationId),
  };

  structuredLog("info", "backfill.phase6.completed", summary);
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    structuredLog("error", "backfill.phase6.failed", {
      errorName: error instanceof Error ? error.name : "Error",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
