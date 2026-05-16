import {
  AT_RISK_MINUTES,
  SLA_WARNING_MINUTES,
  deriveLeadStatus,
  getFirstHumanReply,
  getMessagesForConversation,
  minutesBetween,
} from "@/domain/business-rules";
import type {
  AppState,
  LeadStatus,
  MessageDirection,
  Provider,
} from "@/domain/types";
import { isPrismaStorageEnabled } from "./data-store";

export interface InboxProjectionFilters {
  organizationId: string;
  assignedTo?: string;
  status?: string;
}

export interface InboxConversationProjection {
  organizationId: string;
  conversationId: string;
  leadId: string;
  contactId?: string;
  channel: Provider;
  providerThreadId: string;
  status: string;
  leadStage: LeadStatus;
  responseState: "closed" | "overdue" | "responded" | "waiting" | "warning";
  assignedTo?: string;
  patientName: string;
  patientPhone?: string;
  lastMessageText: string;
  lastMessagePreview: string;
  lastMessageDirection?: MessageDirection;
  lastMessageAt: string;
  unreadCount: number;
  firstInboundAt: string;
  firstHumanResponseAt?: string;
  slaDeadlineAt?: string;
  atRisk: boolean;
  estimatedValue: number;
  rebuiltAt: string;
}

function addMinutesIso(value: string, minutes: number): string {
  return new Date(Date.parse(value) + minutes * 60_000).toISOString();
}

function trimPreview(value: string): string {
  const normalized = value.trim();
  return normalized.length > 160 ? `${normalized.slice(0, 157)}...` : normalized;
}

function deriveResponseState(input: {
  leadStage: LeadStatus;
  firstInboundAt: string;
  firstHumanResponseAt?: string;
  nowIso: string;
}): InboxConversationProjection["responseState"] {
  if (input.leadStage === "booked" || input.leadStage === "lost") {
    return "closed";
  }

  if (input.firstHumanResponseAt) {
    return "responded";
  }

  const waitingMinutes = minutesBetween(input.firstInboundAt, input.nowIso);
  if (waitingMinutes >= AT_RISK_MINUTES) {
    return "overdue";
  }

  if (waitingMinutes >= SLA_WARNING_MINUTES) {
    return "warning";
  }

  return "waiting";
}

function unreadInboundCount(messages: AppState["messages"]): number {
  const unreadProviderMessageIds = new Set<string>();

  for (const message of messages) {
    if (message.direction !== "inbound" || message.readAt) {
      continue;
    }

    unreadProviderMessageIds.add(message.providerMessageId || message.id);
  }

  return unreadProviderMessageIds.size;
}

export function buildConversationProjectionFromState(
  state: AppState,
  conversationId: string,
  nowIso = new Date().toISOString(),
): InboxConversationProjection | undefined {
  const conversation = state.conversations.find((item) => item.id === conversationId);
  if (!conversation) {
    return undefined;
  }

  const lead = state.leads.find((item) => item.id === conversation.leadId);
  if (!lead) {
    return undefined;
  }

  const messages = getMessagesForConversation(state.messages, conversation.id);
  const lastMessage = messages.at(-1);
  const firstInbound = messages.find((message) => message.direction === "inbound");
  const firstHumanReply = getFirstHumanReply(messages);
  const firstInboundAt = firstInbound?.sentAt ?? lead.firstMessageAt;
  const firstHumanResponseAt = lead.firstHumanResponseAt ?? firstHumanReply?.sentAt;
  const leadStage = deriveLeadStatus(
    {
      ...lead,
      firstHumanResponseAt,
    },
    nowIso,
  );
  const responseState = deriveResponseState({
    leadStage,
    firstInboundAt,
    firstHumanResponseAt,
    nowIso,
  });
  const slaDeadlineAt =
    firstHumanResponseAt || leadStage === "booked" || leadStage === "lost"
      ? undefined
      : addMinutesIso(firstInboundAt, AT_RISK_MINUTES);
  const atRisk =
    responseState === "warning" ||
    responseState === "overdue" ||
    leadStage === "unanswered" ||
    leadStage === "at_risk";
  const lastMessageText = lastMessage?.text ?? "";

  return {
    organizationId: conversation.organizationId,
    conversationId: conversation.id,
    leadId: lead.id,
    channel: conversation.provider,
    providerThreadId: conversation.providerThreadId,
    status: conversation.status,
    leadStage,
    responseState,
    assignedTo: lead.assignedTo,
    patientName: lead.name || "Patient",
    patientPhone: lead.phone,
    lastMessageText,
    lastMessagePreview: trimPreview(lastMessageText),
    lastMessageDirection: lastMessage?.direction,
    lastMessageAt: lastMessage?.sentAt ?? conversation.lastMessageAt,
    unreadCount: unreadInboundCount(messages),
    firstInboundAt,
    firstHumanResponseAt,
    slaDeadlineAt,
    atRisk,
    estimatedValue: lead.estimatedValue,
    rebuiltAt: nowIso,
  };
}

export function listConversationProjectionsFromState(
  state: AppState,
  organizationId: string,
  nowIso = new Date().toISOString(),
): InboxConversationProjection[] {
  return state.conversations
    .filter((conversation) => conversation.organizationId === organizationId)
    .map((conversation) =>
      buildConversationProjectionFromState(state, conversation.id, nowIso),
    )
    .filter((projection): projection is InboxConversationProjection => Boolean(projection))
    .toSorted(
      (left, right) =>
        Date.parse(right.lastMessageAt) - Date.parse(left.lastMessageAt) ||
        right.conversationId.localeCompare(left.conversationId),
    );
}

export function buildInboxProjectionWhere(input: InboxProjectionFilters) {
  return {
    organizationId: input.organizationId,
    ...(input.assignedTo ? { assignedTo: input.assignedTo } : {}),
    ...(input.status ? { status: input.status } : {}),
  };
}

function serializeProjectionRow(row: {
  organizationId: string;
  conversationId: string;
  leadId: string;
  contactId: string | null;
  provider: Provider;
  providerThreadId: string;
  status: string;
  leadStatus: LeadStatus;
  responseState: string;
  assignedTo: string | null;
  patientName: string;
  patientPhone: string | null;
  lastMessageText: string;
  lastMessagePreview: string;
  lastMessageDirection: MessageDirection | null;
  lastMessageAt: Date;
  unreadInboundCount: number;
  firstInboundAt: Date;
  firstHumanResponseAt: Date | null;
  slaDeadlineAt: Date | null;
  atRisk: boolean;
  estimatedValue: number;
  rebuiltAt: Date;
}): InboxConversationProjection {
  return {
    organizationId: row.organizationId,
    conversationId: row.conversationId,
    leadId: row.leadId,
    contactId: row.contactId ?? undefined,
    channel: row.provider,
    providerThreadId: row.providerThreadId,
    status: row.status,
    leadStage: row.leadStatus,
    responseState: row.responseState as InboxConversationProjection["responseState"],
    assignedTo: row.assignedTo ?? undefined,
    patientName: row.patientName,
    patientPhone: row.patientPhone ?? undefined,
    lastMessageText: row.lastMessageText,
    lastMessagePreview: row.lastMessagePreview || trimPreview(row.lastMessageText),
    lastMessageDirection: row.lastMessageDirection ?? undefined,
    lastMessageAt: row.lastMessageAt.toISOString(),
    unreadCount: row.unreadInboundCount,
    firstInboundAt: row.firstInboundAt.toISOString(),
    firstHumanResponseAt: row.firstHumanResponseAt?.toISOString(),
    slaDeadlineAt: row.slaDeadlineAt?.toISOString(),
    atRisk: row.atRisk,
    estimatedValue: row.estimatedValue,
    rebuiltAt: row.rebuiltAt.toISOString(),
  };
}

export async function refreshConversationProjection(conversationId: string) {
  if (!isPrismaStorageEnabled()) {
    return undefined;
  }

  const { prisma } = await import("./prisma");
  const now = new Date();
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      lead: true,
      contact: true,
    },
  });

  if (!conversation) {
    return undefined;
  }

  const [messages, firstHumanReply] = await Promise.all([
    prisma.message.findMany({
      where: { conversationId },
      orderBy: [{ sentAt: "asc" }, { createdAt: "asc" }],
    }),
    prisma.message.findFirst({
      where: {
        conversationId,
        direction: "outbound",
        senderType: "manager",
      },
      orderBy: [{ sentAt: "asc" }, { createdAt: "asc" }],
    }),
  ]);
  const lastMessage = messages.at(-1);
  const firstInbound = messages.find((message) => message.direction === "inbound");
  const firstInboundAt = firstInbound?.sentAt ?? conversation.lead.firstMessageAt;
  const firstHumanResponseAt =
    conversation.lead.firstHumanResponseAt ?? firstHumanReply?.sentAt ?? null;
  const leadStage = deriveLeadStatus(
    {
      id: conversation.lead.id,
      organizationId: conversation.lead.organizationId,
      name: conversation.lead.name,
      phone: conversation.lead.phone ?? undefined,
      email: conversation.lead.email ?? undefined,
      source: conversation.lead.source,
      status: conversation.lead.status,
      assignedTo: conversation.lead.assignedTo ?? undefined,
      providerContactId: conversation.lead.providerContactId,
      firstMessageAt: conversation.lead.firstMessageAt.toISOString(),
      firstHumanResponseAt: firstHumanResponseAt?.toISOString(),
      bookedAt: conversation.lead.bookedAt?.toISOString(),
      lostReason: (conversation.lead.lostReason as never) ?? undefined,
      estimatedValue: conversation.lead.estimatedValue,
      createdAt: conversation.lead.createdAt.toISOString(),
      updatedAt: conversation.lead.updatedAt.toISOString(),
    },
    now.toISOString(),
  );
  const responseState = deriveResponseState({
    leadStage,
    firstInboundAt: firstInboundAt.toISOString(),
    firstHumanResponseAt: firstHumanResponseAt?.toISOString(),
    nowIso: now.toISOString(),
  });
  const slaDeadlineAt =
    firstHumanResponseAt || leadStage === "booked" || leadStage === "lost"
      ? null
      : new Date(firstInboundAt.getTime() + AT_RISK_MINUTES * 60_000);
  const atRisk =
    responseState === "warning" ||
    responseState === "overdue" ||
    leadStage === "unanswered" ||
    leadStage === "at_risk";
  const lastMessageText = lastMessage?.text ?? "";
  const unreadProviderMessageIds = new Set(
    messages
      .filter((message) => message.direction === "inbound" && !message.readAt)
      .map((message) => message.providerMessageId || message.id),
  );

  return prisma.conversationProjection.upsert({
    where: { conversationId },
    create: {
      organizationId: conversation.organizationId,
      conversationId: conversation.id,
      leadId: conversation.leadId,
      contactId: conversation.contactId,
      provider: conversation.provider,
      providerThreadId: conversation.providerThreadId,
      status: conversation.status,
      leadStatus: leadStage,
      responseState,
      assignedTo: conversation.lead.assignedTo,
      patientName: conversation.contact?.displayName || conversation.lead.name || "Patient",
      patientPhone: conversation.contact?.phoneE164 ?? conversation.lead.phone,
      lastMessageText,
      lastMessagePreview: trimPreview(lastMessageText),
      lastMessageDirection: lastMessage?.direction,
      lastMessageAt: lastMessage?.sentAt ?? conversation.lastMessageAt,
      unreadInboundCount: unreadProviderMessageIds.size,
      firstInboundAt,
      firstHumanResponseAt,
      slaDeadlineAt,
      slaBreachedAt: responseState === "overdue" ? slaDeadlineAt : null,
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
      leadStatus: leadStage,
      responseState,
      assignedTo: conversation.lead.assignedTo,
      patientName: conversation.contact?.displayName || conversation.lead.name || "Patient",
      patientPhone: conversation.contact?.phoneE164 ?? conversation.lead.phone,
      lastMessageText,
      lastMessagePreview: trimPreview(lastMessageText),
      lastMessageDirection: lastMessage?.direction,
      lastMessageAt: lastMessage?.sentAt ?? conversation.lastMessageAt,
      unreadInboundCount: unreadProviderMessageIds.size,
      firstInboundAt,
      firstHumanResponseAt,
      slaDeadlineAt,
      slaBreachedAt: responseState === "overdue" ? slaDeadlineAt : null,
      atRisk,
      estimatedValue: conversation.lead.estimatedValue,
      rebuiltAt: now,
    },
  });
}

export async function refreshLeadConversationProjections(leadId: string) {
  if (!isPrismaStorageEnabled()) {
    return [];
  }

  const { prisma } = await import("./prisma");
  const conversations = await prisma.conversation.findMany({
    where: { leadId },
    select: { id: true },
  });

  const refreshed = [];
  for (const conversation of conversations) {
    refreshed.push(await refreshConversationProjection(conversation.id));
  }

  return refreshed;
}

export async function refreshOrganizationConversationProjections(
  organizationId: string,
) {
  if (!isPrismaStorageEnabled()) {
    return [];
  }

  const { prisma } = await import("./prisma");
  const conversations = await prisma.conversation.findMany({
    where: { organizationId },
    select: { id: true },
    orderBy: { lastMessageAt: "desc" },
  });

  const refreshed = [];
  for (const conversation of conversations) {
    refreshed.push(await refreshConversationProjection(conversation.id));
  }

  return refreshed;
}

export async function listInboxConversationProjections(input: {
  organizationId: string;
  assignedTo?: string;
  limit?: number;
  state?: AppState;
  status?: string;
}) {
  const limit = Math.min(100, Math.max(1, Math.trunc(input.limit ?? 50)));

  if (isPrismaStorageEnabled()) {
    const { prisma } = await import("./prisma");
    const where = buildInboxProjectionWhere(input);
    let rows = await prisma.conversationProjection.findMany({
      where,
      orderBy: [{ lastMessageAt: "desc" }, { conversationId: "desc" }],
      take: limit,
    });

    if (rows.length === 0) {
      const conversationCount = await prisma.conversation.count({
        where: { organizationId: input.organizationId },
      });
      if (conversationCount > 0) {
        await refreshOrganizationConversationProjections(input.organizationId);
        rows = await prisma.conversationProjection.findMany({
          where,
          orderBy: [{ lastMessageAt: "desc" }, { conversationId: "desc" }],
          take: limit,
        });
      }
    }

    return rows.map(serializeProjectionRow);
  }

  const state = input.state ?? (await (await import("./data-store")).readAppState());

  return listConversationProjectionsFromState(
    state,
    input.organizationId,
  )
    .filter((projection) => (input.status ? projection.status === input.status : true))
    .filter((projection) =>
      input.assignedTo ? projection.assignedTo === input.assignedTo : true,
    )
    .slice(0, limit);
}
