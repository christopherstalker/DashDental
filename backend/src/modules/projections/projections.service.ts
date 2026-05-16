import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, type LeadStatus } from '@prisma/client';
import { PrismaService } from '@app/infra/prisma/prisma.service';

const AT_RISK_MINUTES = 15;
const SLA_WARNING_MINUTES = 5;
const REALTIME_SNAPSHOT_KEY = 'realtime';

function addMinutes(value: Date, minutes: number): Date {
  return new Date(value.getTime() + minutes * 60_000);
}

function minutesBetween(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));
}

function trimPreview(value: string): string {
  const normalized = value.trim();
  return normalized.length > 160 ? `${normalized.slice(0, 157)}...` : normalized;
}

function deriveResponseState(input: {
  leadStatus: string;
  firstInboundAt: Date;
  firstHumanResponseAt: Date | null;
  now: Date;
}): string {
  if (input.leadStatus === 'booked' || input.leadStatus === 'lost') {
    return 'closed';
  }

  if (input.firstHumanResponseAt) {
    return 'responded';
  }

  const waitingMinutes = minutesBetween(input.firstInboundAt, input.now);
  if (waitingMinutes >= AT_RISK_MINUTES) {
    return 'overdue';
  }

  if (waitingMinutes >= SLA_WARNING_MINUTES) {
    return 'warning';
  }

  return 'waiting';
}

function deriveLeadStatus(
  lead: { status: LeadStatus; firstMessageAt: Date; firstHumanResponseAt: Date | null },
  now: Date,
): LeadStatus {
  if (lead.status === 'booked' || lead.status === 'lost') {
    return lead.status;
  }

  if (lead.firstHumanResponseAt) {
    return 'in_conversation';
  }

  const waitingMinutes = minutesBetween(lead.firstMessageAt, now);
  if (waitingMinutes >= AT_RISK_MINUTES) {
    return 'at_risk';
  }

  if (waitingMinutes >= SLA_WARNING_MINUTES) {
    return 'unanswered';
  }

  return 'new';
}

@Injectable()
export class ProjectionsService {
  private readonly logger = new Logger(ProjectionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async refreshConversationProjection(conversationId: string) {
    const now = new Date();
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        lead: true,
        contact: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation was not found for projection refresh.');
    }

    const [lastMessage, firstHumanReply, unreadInboundCount] = await Promise.all([
      this.prisma.message.findFirst({
        where: { conversationId },
        orderBy: [{ sentAt: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.message.findFirst({
        where: {
          conversationId,
          direction: 'outbound',
          senderType: 'manager',
        },
        orderBy: [{ sentAt: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.message.count({
        where: {
          conversationId,
          direction: 'inbound',
          readAt: null,
        },
      }),
    ]);

    const firstInboundAt = conversation.lead.firstMessageAt;
    const firstHumanResponseAt =
      conversation.lead.firstHumanResponseAt ?? firstHumanReply?.sentAt ?? null;
    const leadStatus = deriveLeadStatus(
      {
        status: conversation.lead.status,
        firstMessageAt: conversation.lead.firstMessageAt,
        firstHumanResponseAt,
      },
      now,
    );
    const responseState = deriveResponseState({
      leadStatus,
      firstInboundAt,
      firstHumanResponseAt,
      now,
    });
    const slaDeadlineAt =
      firstHumanResponseAt || leadStatus === 'booked' || leadStatus === 'lost'
        ? null
        : addMinutes(firstInboundAt, AT_RISK_MINUTES);
    const slaBreachedAt =
      responseState === 'overdue' && slaDeadlineAt && now > slaDeadlineAt
        ? slaDeadlineAt
        : null;
    const lastMessageAt = lastMessage?.sentAt ?? conversation.lastMessageAt;
    const lastMessageText = lastMessage?.text ?? '';
    const atRisk =
      responseState === 'warning' ||
      responseState === 'overdue' ||
      leadStatus === 'unanswered' ||
      leadStatus === 'at_risk';

    return this.prisma.conversationProjection.upsert({
      where: { conversationId },
      create: {
        organizationId: conversation.organizationId,
        conversationId: conversation.id,
        leadId: conversation.leadId,
        contactId: conversation.contactId,
        provider: conversation.provider,
        providerThreadId: conversation.providerThreadId,
        status: conversation.status,
        leadStatus,
        responseState,
        assignedTo: conversation.lead.assignedTo,
        patientName:
          conversation.contact?.displayName || conversation.lead.name || 'Patient',
        patientPhone: conversation.contact?.phoneE164 ?? conversation.lead.phone,
        lastMessageText,
        lastMessagePreview: trimPreview(lastMessageText),
        lastMessageDirection: lastMessage?.direction,
        lastMessageAt,
        unreadInboundCount,
        firstInboundAt,
        firstHumanResponseAt,
        slaDeadlineAt,
        slaBreachedAt,
        atRisk,
        estimatedValue: conversation.lead.estimatedValue,
        rebuiltAt: now,
      },
      update: {
        organizationId: conversation.organizationId,
        leadId: conversation.leadId,
        contactId: conversation.contactId,
        provider: conversation.provider,
        providerThreadId: conversation.providerThreadId,
        status: conversation.status,
        leadStatus,
        responseState,
        assignedTo: conversation.lead.assignedTo,
        patientName:
          conversation.contact?.displayName || conversation.lead.name || 'Patient',
        patientPhone: conversation.contact?.phoneE164 ?? conversation.lead.phone,
        lastMessageText,
        lastMessagePreview: trimPreview(lastMessageText),
        lastMessageDirection: lastMessage?.direction,
        lastMessageAt,
        unreadInboundCount,
        firstInboundAt,
        firstHumanResponseAt,
        slaDeadlineAt,
        slaBreachedAt,
        atRisk,
        estimatedValue: conversation.lead.estimatedValue,
        rebuiltAt: now,
      },
    });
  }

  async refreshOrganizationRealtimeMetrics(organizationId: string) {
    const now = new Date();
    const [organization, leads, projectionBuckets, unreadAggregation] =
      await Promise.all([
        this.prisma.organization.findUniqueOrThrow({
          where: { id: organizationId },
          select: { averagePatientValue: true },
        }),
        this.prisma.lead.findMany({
          where: { organizationId },
          select: {
            status: true,
            firstMessageAt: true,
            firstHumanResponseAt: true,
            lostReason: true,
          },
        }),
        this.prisma.conversationProjection.groupBy({
          by: ['status'],
          where: { organizationId },
          _count: { _all: true },
        }),
        this.prisma.conversationProjection.aggregate({
          where: { organizationId },
          _sum: { unreadInboundCount: true },
          _count: { _all: true },
        }),
      ]);

    const statusCounts = {
      new: 0,
      unanswered: 0,
      at_risk: 0,
      in_conversation: 0,
      booked: 0,
      lost: 0,
    };
    const responseTimes: number[] = [];

    for (const lead of leads) {
      const status = deriveLeadStatus(lead, now) as keyof typeof statusCounts;
      statusCounts[status] += 1;

      if (lead.firstHumanResponseAt) {
        responseTimes.push(minutesBetween(lead.firstMessageAt, lead.firstHumanResponseAt));
      }
    }

    const openConversations = projectionBuckets
      .filter((bucket) => bucket.status === 'open')
      .reduce((sum, bucket) => sum + bucket._count._all, 0);
    const unreadInboundMessages = unreadAggregation._sum.unreadInboundCount ?? 0;
    const unreadConversations = await this.prisma.conversationProjection.count({
      where: {
        organizationId,
        unreadInboundCount: { gt: 0 },
      },
    });
    const lostByNoResponse = leads.filter(
      (lead) => lead.status === 'lost' && lead.lostReason === 'no_response',
    ).length;
    const totalLeads = leads.length;
    const averageResponseMinutes = responseTimes.length
      ? Math.round(responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length)
      : 0;

    return this.prisma.organizationMetricSnapshot.upsert({
      where: {
        organizationId_snapshotKey: {
          organizationId,
          snapshotKey: REALTIME_SNAPSHOT_KEY,
        },
      },
      create: {
        organizationId,
        snapshotKey: REALTIME_SNAPSHOT_KEY,
        totalLeads,
        newLeads: statusCounts.new,
        unansweredLeads: statusCounts.unanswered,
        atRiskLeads: statusCounts.at_risk,
        inConversationLeads: statusCounts.in_conversation,
        bookedLeads: statusCounts.booked,
        lostLeads: statusCounts.lost,
        openConversations,
        unreadConversations,
        unreadInboundMessages,
        lostRevenue: lostByNoResponse * organization.averagePatientValue,
        averageResponseMinutes,
        conversionRate: totalLeads ? Math.round((statusCounts.booked / totalLeads) * 100) : 0,
        rebuiltAt: now,
      },
      update: {
        totalLeads,
        newLeads: statusCounts.new,
        unansweredLeads: statusCounts.unanswered,
        atRiskLeads: statusCounts.at_risk,
        inConversationLeads: statusCounts.in_conversation,
        bookedLeads: statusCounts.booked,
        lostLeads: statusCounts.lost,
        openConversations,
        unreadConversations,
        unreadInboundMessages,
        lostRevenue: lostByNoResponse * organization.averagePatientValue,
        averageResponseMinutes,
        conversionRate: totalLeads ? Math.round((statusCounts.booked / totalLeads) * 100) : 0,
        rebuiltAt: now,
      },
    });
  }

  async rebuildOrganizationProjections(organizationId: string) {
    const startedAt = new Date();
    const conversations = await this.prisma.conversation.findMany({
      where: { organizationId },
      select: { id: true },
      orderBy: { lastMessageAt: 'desc' },
    });

    let refreshedConversations = 0;
    for (const conversation of conversations) {
      await this.refreshConversationProjection(conversation.id);
      refreshedConversations += 1;
    }

    await this.refreshOrganizationRealtimeMetrics(organizationId);
    const completedAt = new Date();

    return {
      organizationId,
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      durationMs: completedAt.getTime() - startedAt.getTime(),
      conversations: refreshedConversations,
      snapshots: 1,
    };
  }

  async rebuildAllProjections(limit = 100) {
    const organizations = await this.prisma.organization.findMany({
      select: { id: true },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
    const results = [];

    for (const organization of organizations) {
      results.push(await this.rebuildOrganizationProjections(organization.id));
    }

    return {
      rebuiltOrganizations: results.length,
      results,
    };
  }

  async getProjectionHealthSnapshot() {
    const [conversationCount, projectionCount, snapshotCount, missingRows, staleRows] =
      await Promise.all([
        this.prisma.conversation.count(),
        this.prisma.conversationProjection.count(),
        this.prisma.organizationMetricSnapshot.count({
          where: { snapshotKey: REALTIME_SNAPSHOT_KEY },
        }),
        this.prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
          SELECT COUNT(*)::int AS count
          FROM "Conversation" c
          LEFT JOIN "ConversationProjection" p ON p."conversationId" = c."id"
          WHERE p."id" IS NULL
        `),
        this.prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
          SELECT COUNT(*)::int AS count
          FROM "Conversation" c
          JOIN "ConversationProjection" p ON p."conversationId" = c."id"
          WHERE p."rebuiltAt" < c."updatedAt"
        `),
      ]);

    return {
      checkedAt: new Date().toISOString(),
      conversations: conversationCount,
      conversationProjections: projectionCount,
      metricSnapshots: snapshotCount,
      missingConversationProjections: missingRows[0]?.count ?? 0,
      staleConversationProjections: staleRows[0]?.count ?? 0,
    };
  }
}
