import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { Roles } from '@app/common/decorators/roles.decorator';
import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import { LeadsService } from './leads.service';

@Controller('organizations/:organizationId/leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Roles('manager')
  @Get()
  getPipeline(@Param('organizationId') organizationId: string) {
    return this.leadsService.getLeadPipeline(organizationId);
  }

  @Roles('manager')
  @Patch(':leadId/status')
  updateStatus(
    @Param('organizationId') organizationId: string,
    @Param('leadId') leadId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { status: string },
  ) {
    return this.leadsService.updateLeadStatus({
      organizationId,
      leadId,
      status: body.status,
      actorUserId: user.userId,
    });
  }
}
