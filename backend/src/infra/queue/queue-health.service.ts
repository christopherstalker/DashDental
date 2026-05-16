import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { QueueNames } from './queue.names';

interface QueueRegistration {
  name: string;
  queue: Queue;
  critical: boolean;
}

@Injectable()
export class QueueHealthService {
  constructor(
    @InjectQueue(QueueNames.webhookProcess)
    private readonly webhookProcessQueue: Queue,
    @InjectQueue(QueueNames.outboxDispatch)
    private readonly outboxDispatchQueue: Queue,
    @InjectQueue(QueueNames.billingWebhook)
    private readonly billingWebhookQueue: Queue,
    @InjectQueue(QueueNames.aiSummary)
    private readonly aiSummaryQueue: Queue,
  ) {}

  async getQueueHealthSnapshot() {
    const checkedAt = new Date().toISOString();
    const registrations: QueueRegistration[] = [
      {
        name: QueueNames.webhookProcess,
        queue: this.webhookProcessQueue,
        critical: true,
      },
      {
        name: QueueNames.outboxDispatch,
        queue: this.outboxDispatchQueue,
        critical: true,
      },
      {
        name: QueueNames.billingWebhook,
        queue: this.billingWebhookQueue,
        critical: true,
      },
      {
        name: QueueNames.aiSummary,
        queue: this.aiSummaryQueue,
        critical: false,
      },
    ];

    const queues = await Promise.all(
      registrations.map(async ({ name, queue, critical }) => {
        const [counts, isPaused] = await Promise.all([
          queue.getJobCounts(
            'waiting',
            'active',
            'delayed',
            'failed',
            'completed',
            'paused',
            'prioritized',
          ),
          queue.isPaused(),
        ]);
        const backlog =
          (counts.waiting ?? 0) +
          (counts.active ?? 0) +
          (counts.delayed ?? 0) +
          (counts.prioritized ?? 0);

        return {
          name,
          critical,
          paused: isPaused,
          waiting: counts.waiting ?? 0,
          active: counts.active ?? 0,
          delayed: counts.delayed ?? 0,
          prioritized: counts.prioritized ?? 0,
          failed: counts.failed ?? 0,
          completed: counts.completed ?? 0,
          pausedJobs: counts.paused ?? 0,
          backlog,
        };
      }),
    );

    const criticalQueues = queues.filter((queue) => queue.critical);

    return {
      checkedAt,
      queues,
      totals: {
        backlog: queues.reduce((total, queue) => total + queue.backlog, 0),
        failed: queues.reduce((total, queue) => total + queue.failed, 0),
        paused: queues.filter((queue) => queue.paused).length,
        criticalBacklog: criticalQueues.reduce(
          (total, queue) => total + queue.backlog,
          0,
        ),
        criticalFailed: criticalQueues.reduce(
          (total, queue) => total + queue.failed,
          0,
        ),
      },
    };
  }
}
