import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Roles } from '@app/common/decorators/roles.decorator';
import { IntegrationsService } from './integrations.service';

@Controller('organizations/:organizationId/integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Roles('admin')
  @Get()
  listIntegrations(@Param('organizationId') organizationId: string) {
    return this.integrationsService.listOrganizationIntegrations(organizationId);
  }

  @Roles('admin')
  @Post('clinic-db/config')
  saveClinicDbConfig(
    @Param('organizationId') organizationId: string,
    @Body() body: { actorUserId: string; connectionString: string; ssl: boolean },
  ) {
    return this.integrationsService.saveClinicDbCredentials({
      organizationId,
      actorUserId: body.actorUserId,
      connectionString: body.connectionString,
      ssl: body.ssl,
    });
  }

  @Roles('admin')
  @Post('clinic-db/sync')
  syncClinicDb(
    @Param('organizationId') organizationId: string,
    @Body() body: { limit?: number },
  ) {
    return this.integrationsService.runClinicDbSync({
      organizationId,
      limit: body.limit,
    });
  }
}
