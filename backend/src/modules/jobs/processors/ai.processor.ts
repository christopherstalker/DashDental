import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { QueueNames } from '@app/infra/queue/queue.names';

@Processor(QueueNames.aiSummary)
export class AiProcessor extends WorkerHost {
  private readonly logger = new Logger(AiProcessor.name);

  async process(job: Job): Promise<{ jobId: string | undefined; state: string }> {
    this.logger.debug(`Generating AI summary for job ${job.id}.`);

    return {
      jobId: job.id?.toString(),
      state: 'summary-generated',
    };
  }
}
