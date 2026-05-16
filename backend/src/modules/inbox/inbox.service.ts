import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma/prisma.service';
import { ProjectionsService } from '@app/modules/projections/projections.service';

function clampLimit(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return 30;
  }

  return Math.min(100, Math.max(1, Math.trunc(value ?? 30)));
}

@Injectable()
export class InboxService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectionsService: ProjectionsService,
  ) {}

  async listConversations(input: {
    organizationId: string;
    limit?: number;
    cursor?: string;
    status?: string;
    assignedTo?: string;
  }) {
    const limit = clampLimit(input.limit);
    const rows = await this.prisma.conversationProjection.findMany({
      where: {
        organizationId: input.organizationId,
        ...(input.status ? { status: input.status } : {}),
        ...(input.assignedTo ? { assignedTo: input.assignedTo } : {}),
      },
      orderBy: [{ lastMessageAt: 'desc' }, { conversationId: 'desc' }],
      ...(input.cursor
        ? {
            cursor: { conversationId: input.cursor },
            skip: 1,
          }
        : {}),
      take: limit + 1,
    });
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit);

    return {
      items,
      pageInfo: {
        hasMore,
        nextCursor: hasMore ? items.at(-1)?.conversationId ?? null : null,
      },
    };
  }

  async getConversationMessages(organizationId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        organizationId,
      },
      select: {
        id: true,
        provider: true,
        providerThreadId: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation was not found.');
    }

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: [{ sentAt: 'asc' }, { createdAt: 'asc' }],
    });

    return {
      conversation,
      messages,
    };
  }

  async sendManagerReply(input: {
    organizationId: string;
    conversationId: string;
    actorUserId: string;
    text: string;
  }) {
    const text = input.text.trim();
    if (!text) {
      throw new BadRequestException('Message text is required.');
    }

    const now = new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.findFirst({
        where: {
          id: input.conversationId,
          organizationId: input.organizationId,
        },
        include: {
          lead: true,
        },
      });

      if (!conversation) {
        throw new NotFoundException('Conversation was not found.');
      }

      const message = await tx.message.create({
        data: {
          conversationId: conversation.id,
          direction: 'outbound',
          senderType: 'manager',
          providerMessageId: `local-${randomUUID()}`,
          text,
          sentAt: now,
        },
      });
      await tx.messageDelivery.create({
        data: {
          organizationId: input.organizationId,
          conversationId: conversation.id,
          messageId: message.id,
          provider: conversation.provider,
          localMessageId: message.providerMessageId,
          status: 'pending',
        },
      });

      await tx.conversation.update({
        where: { id: conversation.id },
        data: {
          status: 'open',
          lastMessageAt: now,
        },
      });

      if (!conversation.lead.firstHumanResponseAt) {
        await tx.lead.update({
          where: { id: conversation.leadId },
          data: {
            firstHumanResponseAt: now,
            status:
              conversation.lead.status === 'booked' || conversation.lead.status === 'lost'
                ? conversation.lead.status
                : 'in_conversation',
          },
        });
      }

      return {
        conversationId: conversation.id,
        message,
      };
    });

    await this.prisma.message.updateMany({
      where: {
        conversationId: input.conversationId,
        direction: 'inbound',
        readAt: null,
      },
      data: {
        readAt: now,
      },
    });
    await this.projectionsService.refreshConversationProjection(input.conversationId);
    await this.projectionsService.refreshOrganizationRealtimeMetrics(input.organizationId);

    return result;
  }
}
