import { Controller, Get, Param, Post } from '@nestjs/common';
import { Roles } from '@app/common/decorators/roles.decorator';
import { OrganizationsService } from './organizations.service';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Roles('owner', 'super_admin')
  @Post()
  createWorkspace() {
    return this.organizationsService.provisionClinicWorkspace();
  }

  @Roles('manager')
  @Get(':organizationId')
  getOne(@Param('organizationId') organizationId: string) {
    return this.organizationsService.getTenantSettings(organizationId);
  }
}
