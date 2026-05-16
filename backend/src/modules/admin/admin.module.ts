import { Module } from '@nestjs/common';
import { BillingModule } from '@app/modules/billing/billing.module';
import { ComplianceModule } from '@app/modules/compliance/compliance.module';
import { IntegrationsModule } from '@app/modules/integrations/integrations.module';
import { ProjectionsModule } from '@app/modules/projections/projections.module';
import { WebhooksModule } from '@app/modules/webhooks/webhooks.module';
import { AdminFailureDrillsService } from './admin-failure-drills.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    WebhooksModule,
    IntegrationsModule,
    ProjectionsModule,
    BillingModule,
    ComplianceModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminFailureDrillsService],
})
export class AdminModule {}
