import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { QueueNames } from '@app/infra/queue/queue.names';

@Processor(QueueNames.clinicDbSync)
export class ClinicDbProcessor extends WorkerHost {
  private readonly logger = new Logger(ClinicDbProcessor.name);

  async process(job: Job): Promise<{ jobId: string | undefined; state: string }> {
    this.logger.debug(`Running clinic DB sync job ${job.id}.`);

    return {
      jobId: job.id?.toString(),
      state: 'sync-scheduled',
    };
  }
}
