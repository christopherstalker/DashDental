import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { Roles } from '@app/common/decorators/roles.decorator';
import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import { AdminService } from './admin.service';

function readRequestIp(
  request: {
    ip?: string;
    headers?: Record<string, string | string[] | undefined>;
  },
): string | undefined {
  const forwardedFor = request.headers?.['x-forwarded-for'];
  if (Array.isArray(forwardedFor)) {
    return forwardedFor[0];
  }

  return typeof forwardedFor === 'string' && forwardedFor.trim()
    ? forwardedFor
    : request.ip;
}

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Roles('super_admin')
  @Get('overview')
  overview() {
    return this.adminService.getPlatformOverview();
  }

  @Roles('super_admin')
  @Post('runtime/recover')
  runRecoverySweep(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: { ip?: string; headers?: Record<string, string | string[] | undefined> },
  ) {
    return this.adminService.runRecoverySweep({
      userId: user.userId,
      ip: readRequestIp(request),
    });
  }

  @Roles('super_admin')
  @Post('runtime/reconcile')
  runReconciliationSweep(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: { ip?: string; headers?: Record<string, string | string[] | undefined> },
  ) {
    return this.adminService.runReconciliationSweep({
      userId: user.userId,
      ip: readRequestIp(request),
    });
  }

  @Roles('super_admin')
  @Post('runtime/projections/rebuild')
  rebuildProjections(
    @Body() payload: { organizationId?: string } | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: { ip?: string; headers?: Record<string, string | string[] | undefined> },
  ) {
    return this.adminService.rebuildProjections(
      {
        organizationId: payload?.organizationId,
      },
      {
        userId: user.userId,
        ip: readRequestIp(request),
      },
    );
  }

  @Roles('super_admin')
  @Post('runtime/data-lifecycle/sweep')
  runDataLifecycleSweep(
    @Body() payload: { organizationId?: string; dryRun?: boolean } | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: { ip?: string; headers?: Record<string, string | string[] | undefined> },
  ) {
    return this.adminService.runDataLifecycleSweep(
      {
        organizationId: payload?.organizationId,
        dryRun: payload?.dryRun ?? true,
      },
      {
        userId: user.userId,
        ip: readRequestIp(request),
      },
    );
  }

  @Roles('super_admin')
  @Get('runtime/drills')
  failureDrillCatalog() {
    return this.adminService.getFailureDrillCatalog();
  }

  @Roles('super_admin')
  @Post('runtime/drills/:scenario/run')
  runFailureDrill(
    @Param('scenario') scenario: string,
    @Body() payload: { organizationId?: string } | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: { ip?: string; headers?: Record<string, string | string[] | undefined> },
  ) {
    return this.adminService.runFailureDrill(
      scenario,
      {
        organizationId: payload?.organizationId,
      },
      {
        userId: user.userId,
        ip: readRequestIp(request),
      },
    );
  }

  @Roles('super_admin')
  @Get('organizations/:organizationId/debug')
  organizationDebug(
    @Param('organizationId') organizationId: string,
    @Query('limit') limit?: string,
    @Query('receiptId') receiptId?: string,
  ) {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;
    return this.adminService.getTenantDebugView(organizationId, {
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
      receiptId,
    });
  }

  @Roles('super_admin')
  @Post('receipts/:receiptId/replay')
  replayReceipt(
    @Param('receiptId') receiptId: string,
    @Body() payload?: { force?: boolean },
    @CurrentUser() user?: AuthenticatedUser,
    @Req() request?: { ip?: string; headers?: Record<string, string | string[] | undefined> },
  ) {
    return this.adminService.replayReceipt(receiptId, Boolean(payload?.force), user
      ? {
          userId: user.userId,
          ip: request ? readRequestIp(request) : undefined,
        }
      : undefined);
  }

  @Roles('super_admin')
  @Post('outbox/:outboxEventId/replay')
  replayOutbox(
    @Param('outboxEventId') outboxEventId: string,
    @Body() payload?: { force?: boolean },
    @CurrentUser() user?: AuthenticatedUser,
    @Req() request?: { ip?: string; headers?: Record<string, string | string[] | undefined> },
  ) {
    return this.adminService.replayOutboxEvent(outboxEventId, Boolean(payload?.force), user
      ? {
          userId: user.userId,
          ip: request ? readRequestIp(request) : undefined,
        }
      : undefined);
  }
}
