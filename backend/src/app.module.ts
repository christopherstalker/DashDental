import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import appConfig from './config/app.config';
import authConfig from './config/auth.config';
import billingConfig from './config/billing.config';
import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { OrganizationGuard } from './common/guards/organization.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PrismaModule } from './infra/prisma/prisma.module';
import { AuditModule } from './modules/audit/audit.module';
import { AdminModule } from './modules/admin/admin.module';
import { AiModule } from './modules/ai/ai.module';
import { AuthModule } from './modules/auth/auth.module';
import { AutomationsModule } from './modules/automations/automations.module';
import { BillingModule } from './modules/billing/billing.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { InboxModule } from './modules/inbox/inbox.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { LeadsModule } from './modules/leads/leads.module';
import { MembershipsModule } from './modules/memberships/memberships.module';
import { ObservabilityModule } from './modules/observability/observability.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { ProjectionsModule } from './modules/projections/projections.module';
import { UsageModule } from './modules/usage/usage.module';
import { UsersModule } from './modules/users/users.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, authConfig, billingConfig],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    ObservabilityModule,
    AuthModule,
    OrganizationsModule,
    UsersModule,
    MembershipsModule,
    LeadsModule,
    InboxModule,
    ProjectionsModule,
    AutomationsModule,
    IntegrationsModule,
    WebhooksModule,
    AiModule,
    BillingModule,
    UsageModule,
    ComplianceModule,
    AuditModule,
    AdminModule,
    JobsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: OrganizationGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
