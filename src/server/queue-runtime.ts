import { Queue } from "bullmq";
import { ApiError } from "./api-error";
import { isProductionRuntime } from "./feature-flags";
import { structuredLog } from "./observability";

const queueNames = {
  webhookProcess: "webhook.process",
  outboxDispatch: "outbox.dispatch",
  pmsSync: "pms.sync",
} as const;

const jobNames = {
  processWebhook: "process-webhook",
  dispatchOutbox: "dispatch-outbox",
  pollPmsSync: "poll-pms-sync",
} as const;

type QueueName = keyof typeof queueNames;

const queues: Partial<Record<QueueName, Queue>> = {};

function getRedisUrl(): string | undefined {
  return process.env.REDIS_URL?.trim();
}

export function assertQueueRuntimeConfigured() {
  if (isProductionRuntime() && !getRedisUrl()) {
    throw new ApiError(
      503,
      "REDIS_URL is required for production queue processing.",
      "queue_runtime_not_configured",
    );
  }
}

function getQueue(name: QueueName): Queue | undefined {
  const redisUrl = getRedisUrl();
  if (!redisUrl) {
    assertQueueRuntimeConfigured();
    return undefined;
  }

  queues[name] ??= new Queue(queueNames[name], {
    connection: { url: redisUrl },
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    },
  });

  return queues[name];
}

export async function enqueueWebhookReceiptProcessing(receiptId: string) {
  const queue = getQueue("webhookProcess");
  if (!queue) {
    structuredLog("warn", "queue.enqueue.skipped", {
      queue: queueNames.webhookProcess,
      jobName: jobNames.processWebhook,
      receiptId,
      reason: "queue_not_configured",
    });
    return { queued: false, reason: "queue_not_configured" };
  }

  await queue.add(
    jobNames.processWebhook,
    { receiptId },
    { jobId: `receipt-${receiptId}` },
  );

  structuredLog("info", "queue.enqueue.succeeded", {
    queue: queueNames.webhookProcess,
    jobName: jobNames.processWebhook,
    receiptId,
  });

  return { queued: true };
}

export async function enqueueOutboxDispatch(outboxEventId: string) {
  const queue = getQueue("outboxDispatch");
  if (!queue) {
    structuredLog("warn", "queue.enqueue.skipped", {
      queue: queueNames.outboxDispatch,
      jobName: jobNames.dispatchOutbox,
      outboxEventId,
      reason: "queue_not_configured",
    });
    return { queued: false, reason: "queue_not_configured" };
  }

  await queue.add(
    jobNames.dispatchOutbox,
    { outboxEventId },
    { jobId: `outbox-${outboxEventId}` },
  );

  structuredLog("info", "queue.enqueue.succeeded", {
    queue: queueNames.outboxDispatch,
    jobName: jobNames.dispatchOutbox,
    outboxEventId,
  });

  return { queued: true };
}

export async function enqueuePmsSyncPoll(connectionId: string) {
  const queue = getQueue("pmsSync");
  if (!queue) {
    structuredLog("warn", "queue.enqueue.skipped", {
      queue: queueNames.pmsSync,
      jobName: jobNames.pollPmsSync,
      connectionId,
      reason: "queue_not_configured",
    });
    return { queued: false, reason: "queue_not_configured" };
  }

  await queue.add(
    jobNames.pollPmsSync,
    { connectionId },
    {
      jobId: `pms-sync-${connectionId}`,
      repeat: { every: 5 * 60 * 1000 },
    },
  );

  structuredLog("info", "queue.enqueue.succeeded", {
    queue: queueNames.pmsSync,
    jobName: jobNames.pollPmsSync,
    connectionId,
    repeatMs: 5 * 60 * 1000,
  });

  return { queued: true };
}
