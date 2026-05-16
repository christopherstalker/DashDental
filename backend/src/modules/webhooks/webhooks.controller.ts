import * as crypto from 'node:crypto';
import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '@app/common/decorators/public.decorator';
import { Roles } from '@app/common/decorators/roles.decorator';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Public()
  @Post('stripe')
  stripe(
    @Req() request: Request & { rawBody?: Buffer },
    @Body() payload: Record<string, unknown>,
    @Headers('stripe-signature') signature?: string,
    @Headers('x-correlation-id') correlationId?: string,
  ) {
    return this.webhooksService.acceptWebhook({
      provider: 'stripe',
      payload,
      providerEventId: String(payload.id ?? crypto.randomUUID()),
      rawBody: request.rawBody?.toString('utf8'),
      signatureHeader: signature,
      correlationId,
    });
  }

  @Public()
  @Post('telegram')
  telegram(
    @Body() payload: Record<string, unknown>,
    @Headers('x-telegram-bot-api-secret-token') providerAccountKey?: string,
    @Headers('x-correlation-id') correlationId?: string,
  ) {
    return this.webhooksService.acceptWebhook({
      provider: 'telegram',
      payload,
      providerEventId: String(payload.update_id ?? crypto.randomUUID()),
      providerAccountKey,
      correlationId,
    });
  }

  @Public()
  @Post('meta')
  meta(
    @Req() request: Request & { rawBody?: Buffer },
    @Body() payload: Record<string, unknown>,
    @Headers('x-hub-signature-256') signature?: string,
    @Headers('x-correlation-id') correlationId?: string,
  ) {
    return this.webhooksService.acceptWebhook({
      provider: 'meta',
      payload,
      providerEventId: String(payload.id ?? crypto.randomUUID()),
      rawBody: request.rawBody?.toString('utf8'),
      signatureHeader: signature,
      correlationId,
    });
  }

  @Public()
  @Post('web-form')
  webForm(
    @Body() payload: Record<string, unknown>,
    @Headers('x-correlation-id') correlationId?: string,
  ) {
    return this.webhooksService.acceptWebhook({
      provider: 'web_form',
      payload,
      providerEventId: String(payload.eventId ?? crypto.randomUUID()),
      signatureStatus: 'skipped',
      correlationId,
    });
  }

  @Roles('super_admin')
  @Get('receipts/:id')
  getReceipt(@Param('id') receiptId: string) {
    return this.webhooksService.getReceipt(receiptId);
  }

  @Roles('super_admin')
  @Post('receipts/:id/replay')
  replayReceipt(@Param('id') receiptId: string) {
    return this.webhooksService.replayReceipt(receiptId);
  }
}
