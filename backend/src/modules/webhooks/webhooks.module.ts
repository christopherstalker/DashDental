import { Module } from '@nestjs/common';
import { QueueModule } from '@app/infra/queue/queue.module';
import { BillingModule } from '@app/modules/billing/billing.module';
import { ProjectionsModule } from '@app/modules/projections/projections.module';
import { WebhooksController } from './webhooks.controller';
import { WebhookRecoveryService } from './webhook-recovery.service';
import { WebhookMaterializationService } from './webhook-materialization.service';
import { WebhooksService } from './webhooks.service';

@Module({
  imports: [QueueModule, BillingModule, ProjectionsModule],
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhookMaterializationService, WebhookRecoveryService],
  exports: [WebhooksService, WebhookRecoveryService],
})
export class WebhooksModule {}
