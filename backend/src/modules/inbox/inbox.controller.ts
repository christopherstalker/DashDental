import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { Roles } from '@app/common/decorators/roles.decorator';
import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import { InboxService } from './inbox.service';

@Controller('organizations/:organizationId/conversations')
export class InboxController {
  constructor(private readonly inboxService: InboxService) {}

  @Roles('manager')
  @Get()
  listConversations(
    @Param('organizationId') organizationId: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('status') status?: string,
    @Query('assignedTo') assignedTo?: string,
  ) {
    return this.inboxService.listConversations({
      organizationId,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
      cursor,
      status,
      assignedTo,
    });
  }

  @Roles('manager')
  @Get(':conversationId/messages')
  getMessages(
    @Param('organizationId') organizationId: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.inboxService.getConversationMessages(organizationId, conversationId);
  }

  @Roles('manager')
  @Post(':conversationId/messages')
  sendReply(
    @Param('organizationId') organizationId: string,
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { text: string },
  ) {
    return this.inboxService.sendManagerReply({
      organizationId,
      conversationId,
      actorUserId: user.userId,
      text: body.text,
    });
  }
}
