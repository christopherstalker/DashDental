import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { QueueNames } from '@app/infra/queue/queue.names';

@Processor(QueueNames.slaSweep)
export class SlaProcessor extends WorkerHost {
  private readonly logger = new Logger(SlaProcessor.name);

  async process(job: Job): Promise<{ jobId: string | undefined; state: string }> {
    this.logger.debug(`Processing SLA sweep job ${job.id}.`);

    return {
      jobId: job.id?.toString(),
      state: 'sweep-completed',
    };
  }
}
