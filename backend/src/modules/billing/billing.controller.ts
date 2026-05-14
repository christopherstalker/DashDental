import { Body, Controller, Param, Post } from '@nestjs/common';
import { Roles } from '@app/common/decorators/roles.decorator';
import { BillingService } from './billing.service';

@Controller('organizations/:organizationId/billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Roles('owner')
  @Post('checkout')
  checkout(
    @Param('organizationId') organizationId: string,
    @Body() body: { plan: string },
  ) {
    return this.billingService.openCheckout(organizationId, body.plan);
  }

  @Roles('owner')
  @Post('portal')
  portal(@Param('organizationId') organizationId: string) {
    return this.billingService.openPortal(organizationId);
  }
}
