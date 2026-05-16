import { Module } from '@nestjs/common';
import { EncryptionService } from '@app/infra/crypto/encryption.service';
import { ClinicDbAdapter } from './adapters/clinic-db.adapter';
import { IntegrationReconciliationService } from './integration-reconciliation.service';
import { TelegramAdapter } from './adapters/telegram.adapter';
import { WebFormAdapter } from './adapters/web-form.adapter';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';

@Module({
  controllers: [IntegrationsController],
  providers: [
    IntegrationsService,
    IntegrationReconciliationService,
    EncryptionService,
    TelegramAdapter,
    WebFormAdapter,
    ClinicDbAdapter,
  ],
  exports: [IntegrationsService, IntegrationReconciliationService],
})
export class IntegrationsModule {}
