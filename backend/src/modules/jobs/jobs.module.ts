import { Module } from '@nestjs/common';
import { QueueModule } from '@app/infra/queue/queue.module';
import { BillingModule } from '@app/modules/billing/billing.module';
import { ComplianceModule } from '@app/modules/compliance/compliance.module';
import { IntegrationsModule } from '@app/modules/integrations/integrations.module';
import { WebhooksModule } from '@app/modules/webhooks/webhooks.module';
import { AiProcessor } from './processors/ai.processor';
import { BillingProcessor } from './processors/billing.processor';
import { ClinicDbProcessor } from './processors/clinic-db.processor';
import { DataLifecycleScheduler } from './data-lifecycle.scheduler';
import { OutboxProcessor } from './processors/outbox.processor';
import { RecoveryScheduler } from './recovery.scheduler';
import { ReconciliationScheduler } from './reconciliation.scheduler';
import { SlaProcessor } from './processors/sla.processor';
import { WebhookProcessor } from './processors/webhook.processor';

@Module({
  imports: [
    QueueModule,
    WebhooksModule,
    BillingModule,
    ComplianceModule,
    IntegrationsModule,
  ],
  providers: [
    WebhookProcessor,
    OutboxProcessor,
    RecoveryScheduler,
    ReconciliationScheduler,
    DataLifecycleScheduler,
    SlaProcessor,
    ClinicDbProcessor,
    AiProcessor,
    BillingProcessor,
  ],
})
export class JobsModule {}
