import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type {
  AiInsight,
  AppState,
  AuditLog,
  AutomationRule,
  BillingEvent,
  BusinessHours,
  Conversation,
  DataAccessContract,
  Integration,
  IntegrationEvent,
  Lead,
  LeadStatusHistory,
  Membership,
  Message,
  Organization,
  Subscription,
  TeamNote,
  UsageEvent,
  UsageLimits,
  User,
} from "@/domain/types";
import { prisma } from "./prisma";
import { getRuntimeSeedState } from "./runtime-state";

function toDate(value?: string): Date | undefined {
  return value ? new Date(value) : undefined;
}

function toIso(value: Date | null | undefined): string | undefined {
  return value ? value.toISOString() : undefined;
}

function jsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function jsonArrayOrObject(value: unknown) {
  return value as Prisma.InputJsonValue;
}

type AppStateCollectionName =
  | "users"
  | "organizations"
  | "memberships"
  | "leads"
  | "leadStatusHistory"
  | "conversations"
  | "messages"
  | "teamNotes"
  | "integrations"
  | "dataAccessContracts"
  | "subscriptions"
  | "automationRules"
  | "aiInsights"
  | "usageLimits"
  | "usageEvents"
  | "auditLogs"
  | "integrationEvents"
  | "billingEvents";

type PersistedAppEntity = { id: string };

type PrismaModelName =
  | "user"
  | "organization"
  | "membership"
  | "lead"
  | "leadStatusHistory"
  | "conversation"
  | "message"
  | "teamNote"
  | "integration"
  | "dataAccessContract"
  | "subscription"
  | "automationRule"
  | "aiInsight"
  | "usageLimit"
  | "usageEvent"
  | "auditLog"
  | "integrationEvent"
  | "billingEvent";

type PrismaWriteDelegate = {
  upsert(args: unknown): Promise<unknown>;
  deleteMany(args: unknown): Promise<unknown>;
};

type PrismaWriteClient = Record<PrismaModelName, PrismaWriteDelegate>;

type PrismaEntitySpec<T extends PersistedAppEntity> = {
  collection: AppStateCollectionName;
  model: PrismaModelName;
  toPrismaData(entity: T): Record<string, unknown>;
};

function createEntitySpec<T extends PersistedAppEntity>(
  collection: AppStateCollectionName,
  model: PrismaModelName,
  toPrismaData: (entity: T) => Record<string, unknown>,
): PrismaEntitySpec<PersistedAppEntity> {
  return {
    collection,
    model,
    toPrismaData: (entity) => toPrismaData(entity as T),
  };
}

function serializeUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar || null,
    status: user.status,
    lastLoginAt: toDate(user.lastLoginAt) ?? null,
  };
}

function serializeOrganization(organization: Organization) {
  return {
    id: organization.id,
    name: organization.name,
    timezone: organization.timezone,
    currency: organization.currency,
    averagePatientValue: organization.averagePatientValue,
    businessHours: jsonArrayOrObject(organization.businessHours),
    status: organization.status,
  };
}

function serializeMembership(membership: Membership) {
  return {
    id: membership.id,
    userId: membership.userId,
    organizationId: membership.organizationId,
    role: membership.role,
    status: membership.status,
    invitedBy: membership.invitedBy ?? null,
  };
}

function serializeLead(lead: Lead) {
  return {
    id: lead.id,
    organizationId: lead.organizationId,
    name: lead.name,
    phone: lead.phone ?? null,
    email: lead.email ?? null,
    source: lead.source,
    status: lead.status,
    assignedTo: lead.assignedTo ?? null,
    providerContactId: lead.providerContactId,
    firstMessageAt: new Date(lead.firstMessageAt),
    firstHumanResponseAt: toDate(lead.firstHumanResponseAt) ?? null,
    bookedAt: toDate(lead.bookedAt) ?? null,
    lostReason: lead.lostReason ?? null,
    estimatedValue: lead.estimatedValue,
    createdAt: new Date(lead.createdAt),
    updatedAt: new Date(lead.updatedAt),
  };
}

function serializeLeadStatusHistory(history: LeadStatusHistory) {
  return {
    id: history.id,
    leadId: history.leadId,
    fromStatus: history.fromStatus,
    toStatus: history.toStatus,
    changedBy: history.changedBy,
    reason: history.reason ?? null,
    createdAt: new Date(history.createdAt),
  };
}

function serializeConversation(conversation: Conversation) {
  return {
    id: conversation.id,
    organizationId: conversation.organizationId,
    leadId: conversation.leadId,
    provider: conversation.provider,
    providerThreadId: conversation.providerThreadId,
    status: conversation.status,
    lastMessageAt: new Date(conversation.lastMessageAt),
    aiSummary: conversation.aiSummary ?? null,
  };
}

function serializeMessage(message: Message) {
  return {
    id: message.id,
    conversationId: message.conversationId,
    direction: message.direction,
    senderType: message.senderType,
    providerMessageId: message.providerMessageId,
    text: message.text,
    payloadJson: message.payloadJson
      ? jsonArrayOrObject(message.payloadJson)
      : Prisma.JsonNull,
    sentAt: new Date(message.sentAt),
    deliveredAt: toDate(message.deliveredAt) ?? null,
    readAt: toDate(message.readAt) ?? null,
  };
}

function serializeTeamNote(note: TeamNote) {
  return {
    id: note.id,
    organizationId: note.organizationId,
    conversationId: note.conversationId ?? null,
    leadId: note.leadId ?? null,
    authorUserId: note.authorUserId,
    authorMembershipId: note.authorMembershipId,
    body: note.body,
    createdAt: new Date(note.createdAt),
    updatedAt: new Date(note.updatedAt),
  };
}

function serializeIntegration(integration: Integration) {
  return {
    id: integration.id,
    organizationId: integration.organizationId,
    provider: integration.provider,
    status: integration.status,
    externalAccountId: integration.externalAccountId ?? "",
    encryptedCredentials: integration.encryptedCredentials,
    webhookSecret: integration.webhookSecret,
    lastSyncAt: toDate(integration.lastSyncAt) ?? null,
    errorState: integration.errorState ?? null,
    healthScore: integration.healthScore,
  };
}

function serializeDataAccessContract(contract: DataAccessContract) {
  return {
    id: contract.id,
    organizationId: contract.organizationId,
    provider: contract.provider,
    status: contract.status,
    purpose: contract.purpose,
    tablesJson: jsonArrayOrObject(contract.tables),
    fieldsJson: jsonArrayOrObject(contract.fields),
    piiCategoriesJson: jsonArrayOrObject(contract.piiCategories),
    retentionDays: contract.retentionDays,
    readOnly: contract.readOnly,
    approvedByName: contract.approvedByName ?? null,
    approvedByEmail: contract.approvedByEmail ?? null,
    approvedAt: toDate(contract.approvedAt) ?? null,
    revokedAt: toDate(contract.revokedAt) ?? null,
    createdBy: contract.createdBy,
    createdAt: new Date(contract.createdAt),
    updatedAt: new Date(contract.updatedAt),
  };
}

function serializeSubscription(subscription: Subscription) {
  return {
    id: subscription.id,
    organizationId: subscription.organizationId,
    provider: subscription.provider,
    plan: subscription.plan,
    status: subscription.status,
    currentPeriodStart: new Date(subscription.currentPeriodStart),
    currentPeriodEnd: new Date(subscription.currentPeriodEnd),
    externalCustomerId: subscription.externalCustomerId,
    externalSubscriptionId: subscription.externalSubscriptionId,
  };
}

function serializeAutomationRule(rule: AutomationRule) {
  return {
    id: rule.id,
    organizationId: rule.organizationId,
    trigger: rule.trigger,
    conditionsJson: jsonArrayOrObject(rule.conditionsJson),
    template: rule.template,
    active: rule.active,
    createdBy: rule.createdBy,
  };
}

function serializeAiInsight(insight: AiInsight) {
  return {
    id: insight.id,
    organizationId: insight.organizationId,
    leadId: insight.leadId ?? null,
    conversationId: insight.conversationId ?? null,
    type: insight.type,
    resultJson: jsonArrayOrObject(insight.resultJson),
    model: insight.model,
    promptVersion: insight.promptVersion,
    confidence: insight.confidence,
    costEstimate: insight.costEstimate,
    createdAt: new Date(insight.createdAt),
  };
}

function serializeUsageLimit(usage: UsageLimits) {
  return {
    id: usage.id,
    organizationId: usage.organizationId,
    maxUsers: usage.maxUsers,
    maxIntegrations: usage.maxIntegrations,
    monthlyMessages: usage.monthlyMessages,
    monthlyAiRuns: usage.monthlyAiRuns,
    periodUsageJson: jsonArrayOrObject(usage.periodUsageJson),
  };
}

function serializeUsageEvent(event: UsageEvent) {
  return {
    id: event.id,
    organizationId: event.organizationId,
    idempotencyKey: event.idempotencyKey,
    metric: event.metric,
    quantity: event.quantity,
    sourceEntityType: event.sourceEntityType,
    sourceEntityId: event.sourceEntityId,
    periodStart: new Date(event.periodStart),
    periodEnd: toDate(event.periodEnd) ?? null,
    occurredAt: new Date(event.occurredAt),
    metadataJson: event.metadataJson
      ? jsonArrayOrObject(event.metadataJson)
      : Prisma.JsonNull,
    createdAt: new Date(event.createdAt),
  };
}

function serializeAuditLog(log: AuditLog) {
  return {
    id: log.id,
    organizationId: log.organizationId ?? null,
    actorUserId: log.actorUserId,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    metadataJson: jsonArrayOrObject(log.metadataJson),
    ip: log.ip,
    createdAt: new Date(log.createdAt),
  };
}

function serializeBillingEvent(event: BillingEvent) {
  return {
    id: event.id,
    organizationId: event.organizationId ?? null,
    subscriptionId: event.subscriptionId ?? null,
    outboxEventId: event.outboxEventId ?? event.id,
    provider: event.provider,
    providerEventId: event.providerEventId,
    providerEventType: event.providerEventType,
    providerObjectId: event.providerObjectId ?? null,
    externalCustomerId: event.externalCustomerId ?? null,
    externalSubscriptionId: event.externalSubscriptionId ?? null,
    status: event.status,
    decision: event.decision ?? null,
    eventCreatedAt: new Date(event.eventCreatedAt),
    rawPayloadJson: event.rawPayloadJson
      ? jsonArrayOrObject(event.rawPayloadJson)
      : Prisma.JsonNull,
    processedAt: toDate(event.processedAt) ?? null,
    retryCount: event.retryCount,
    resultJson: event.resultJson ? jsonArrayOrObject(event.resultJson) : Prisma.JsonNull,
    errorCode: event.errorCode ?? null,
    errorMessage: event.errorMessage ?? null,
    lastErrorCode: event.lastErrorCode ?? null,
    lastErrorMessage: event.lastErrorMessage ?? null,
    createdAt: new Date(event.createdAt),
    updatedAt: new Date(event.updatedAt),
  };
}

function serializeIntegrationEvent(event: IntegrationEvent) {
  return {
    id: event.id,
    organizationId: event.organizationId,
    provider: event.provider,
    providerEventId: event.providerEventId,
    status: event.status,
    payloadJson: jsonArrayOrObject(event.payloadJson),
    retryCount: event.retryCount,
    errorMessage: event.errorMessage ?? null,
    createdAt: new Date(event.createdAt),
    processedAt: toDate(event.processedAt) ?? null,
  };
}

const orderedUpsertSpecs = [
  createEntitySpec<User>("users", "user", serializeUser),
  createEntitySpec<Organization>("organizations", "organization", serializeOrganization),
  createEntitySpec<Membership>("memberships", "membership", serializeMembership),
  createEntitySpec<Integration>("integrations", "integration", serializeIntegration),
  createEntitySpec<DataAccessContract>(
    "dataAccessContracts",
    "dataAccessContract",
    serializeDataAccessContract,
  ),
  createEntitySpec<Subscription>("subscriptions", "subscription", serializeSubscription),
  createEntitySpec<UsageLimits>("usageLimits", "usageLimit", serializeUsageLimit),
  createEntitySpec<UsageEvent>("usageEvents", "usageEvent", serializeUsageEvent),
  createEntitySpec<AutomationRule>(
    "automationRules",
    "automationRule",
    serializeAutomationRule,
  ),
  createEntitySpec<Lead>("leads", "lead", serializeLead),
  createEntitySpec<LeadStatusHistory>(
    "leadStatusHistory",
    "leadStatusHistory",
    serializeLeadStatusHistory,
  ),
  createEntitySpec<Conversation>("conversations", "conversation", serializeConversation),
  createEntitySpec<Message>("messages", "message", serializeMessage),
  createEntitySpec<TeamNote>("teamNotes", "teamNote", serializeTeamNote),
  createEntitySpec<AiInsight>("aiInsights", "aiInsight", serializeAiInsight),
  createEntitySpec<AuditLog>("auditLogs", "auditLog", serializeAuditLog),
  createEntitySpec<BillingEvent>("billingEvents", "billingEvent", serializeBillingEvent),
  createEntitySpec<IntegrationEvent>(
    "integrationEvents",
    "integrationEvent",
    serializeIntegrationEvent,
  ),
];

const orderedDeleteSpecs = [...orderedUpsertSpecs].reverse();

function collectionByName(
  state: AppState,
  collection: AppStateCollectionName,
): PersistedAppEntity[] {
  return state[collection] as PersistedAppEntity[];
}

function entityChanged<T extends PersistedAppEntity>(
  previousById: Map<string, T>,
  entity: T,
): boolean {
  const previous = previousById.get(entity.id);
  return !previous || JSON.stringify(previous) !== JSON.stringify(entity);
}

async function deleteRemovedEntities<T extends PersistedAppEntity>(
  delegate: PrismaWriteDelegate,
  previousEntities: T[],
  nextEntities: T[],
) {
  const nextIds = new Set(nextEntities.map((entity) => entity.id));
  const removedIds = previousEntities
    .filter((entity) => !nextIds.has(entity.id))
    .map((entity) => entity.id);

  if (removedIds.length > 0) {
    await delegate.deleteMany({ where: { id: { in: removedIds } } });
  }
}

async function upsertChangedEntities<T extends PersistedAppEntity>(
  delegate: PrismaWriteDelegate,
  previousEntities: T[],
  nextEntities: T[],
  toPrismaData: (entity: T) => Record<string, unknown>,
) {
  const previousById = new Map(previousEntities.map((entity) => [entity.id, entity]));

  for (const entity of nextEntities) {
    if (!entityChanged(previousById, entity)) {
      continue;
    }

    const data = toPrismaData(entity);
    await delegate.upsert({
      where: { id: entity.id },
      create: data,
      update: data,
    });
  }
}

export async function readAppStateFromPrisma(client: PrismaClient = prisma): Promise<AppState> {
  const [
    users,
    organizations,
    memberships,
    leads,
    leadStatusHistory,
    conversations,
    messages,
    teamNotes,
    integrations,
    dataAccessContracts,
    subscriptions,
    automationRules,
    aiInsights,
    usageLimits,
    usageEvents,
    auditLogs,
    integrationEvents,
    billingEvents,
  ] = await Promise.all([
    client.user.findMany({ orderBy: { createdAt: "asc" } }),
    client.organization.findMany({ orderBy: { createdAt: "asc" } }),
    client.membership.findMany({ orderBy: { createdAt: "asc" } }),
    client.lead.findMany({ orderBy: { createdAt: "desc" } }),
    client.leadStatusHistory.findMany({ orderBy: { createdAt: "desc" } }),
    client.conversation.findMany({ orderBy: { lastMessageAt: "desc" } }),
    client.message.findMany({ orderBy: { sentAt: "asc" } }),
    client.teamNote.findMany({ orderBy: { createdAt: "desc" } }),
    client.integration.findMany({ orderBy: { createdAt: "asc" } }),
    client.dataAccessContract.findMany({ orderBy: { createdAt: "asc" } }),
    client.subscription.findMany({ orderBy: { createdAt: "asc" } }),
    client.automationRule.findMany({ orderBy: { createdAt: "asc" } }),
    client.aiInsight.findMany({ orderBy: { createdAt: "desc" } }),
    client.usageLimit.findMany({ orderBy: { createdAt: "asc" } }),
    client.usageEvent.findMany({ orderBy: { occurredAt: "desc" } }),
    client.auditLog.findMany({ orderBy: { createdAt: "desc" } }),
    client.integrationEvent.findMany({ orderBy: { createdAt: "desc" } }),
    client.billingEvent.findMany({ orderBy: { eventCreatedAt: "desc" } }),
  ]);

  return {
    users: users.map(
      (user): User => ({
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar ?? "",
        status: user.status as User["status"],
        lastLoginAt: toIso(user.lastLoginAt) ?? "",
      }),
    ),
    organizations: organizations.map(
      (organization): Organization => ({
        id: organization.id,
        name: organization.name,
        timezone: organization.timezone,
        currency: organization.currency as Organization["currency"],
        averagePatientValue: organization.averagePatientValue,
        businessHours: organization.businessHours as unknown as BusinessHours,
        status: organization.status,
      }),
    ),
    memberships: memberships.map(
      (membership): Membership => ({
        id: membership.id,
        userId: membership.userId,
        organizationId: membership.organizationId,
        role: membership.role,
        status: membership.status as Membership["status"],
        invitedBy: membership.invitedBy ?? undefined,
      }),
    ),
    leads: leads.map(
      (lead): Lead => ({
        id: lead.id,
        organizationId: lead.organizationId,
        name: lead.name,
        phone: lead.phone ?? undefined,
        email: lead.email ?? undefined,
        source: lead.source,
        status: lead.status,
        assignedTo: lead.assignedTo ?? undefined,
        providerContactId: lead.providerContactId,
        firstMessageAt: lead.firstMessageAt.toISOString(),
        firstHumanResponseAt: toIso(lead.firstHumanResponseAt),
        bookedAt: toIso(lead.bookedAt),
        lostReason: (lead.lostReason as Lead["lostReason"]) ?? undefined,
        estimatedValue: lead.estimatedValue,
        createdAt: lead.createdAt.toISOString(),
        updatedAt: lead.updatedAt.toISOString(),
      }),
    ),
    leadStatusHistory: leadStatusHistory.map(
      (history): LeadStatusHistory => ({
        id: history.id,
        leadId: history.leadId,
        fromStatus: history.fromStatus,
        toStatus: history.toStatus,
        changedBy: history.changedBy,
        reason: history.reason ?? undefined,
        createdAt: history.createdAt.toISOString(),
      }),
    ),
    conversations: conversations.map(
      (conversation): Conversation => ({
        id: conversation.id,
        organizationId: conversation.organizationId,
        leadId: conversation.leadId,
        provider: conversation.provider,
        providerThreadId: conversation.providerThreadId,
        status: conversation.status as Conversation["status"],
        lastMessageAt: conversation.lastMessageAt.toISOString(),
        aiSummary: conversation.aiSummary ?? undefined,
      }),
    ),
    messages: messages.map(
      (message): Message => ({
        id: message.id,
        conversationId: message.conversationId,
        direction: message.direction,
        senderType: message.senderType,
        providerMessageId: message.providerMessageId,
        text: message.text,
        payloadJson: message.payloadJson ? jsonObject(message.payloadJson) : undefined,
        sentAt: message.sentAt.toISOString(),
        deliveredAt: toIso(message.deliveredAt),
        readAt: toIso(message.readAt),
      }),
    ),
    teamNotes: teamNotes.map(
      (note): TeamNote => ({
        id: note.id,
        organizationId: note.organizationId,
        conversationId: note.conversationId ?? undefined,
        leadId: note.leadId ?? undefined,
        authorUserId: note.authorUserId,
        authorMembershipId: note.authorMembershipId,
        body: note.body,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
      }),
    ),
    integrations: integrations.map(
      (integration): Integration => ({
        id: integration.id,
        organizationId: integration.organizationId,
        provider: integration.provider,
        status: integration.status,
        externalAccountId: integration.externalAccountId || undefined,
        encryptedCredentials: integration.encryptedCredentials,
        webhookSecret: integration.webhookSecret,
        lastSyncAt: toIso(integration.lastSyncAt),
        errorState: integration.errorState ?? undefined,
        healthScore: integration.healthScore,
      }),
    ),
    dataAccessContracts: dataAccessContracts.map(
      (contract): DataAccessContract => ({
        id: contract.id,
        organizationId: contract.organizationId,
        provider: contract.provider,
        status: contract.status as DataAccessContract["status"],
        purpose: contract.purpose,
        tables: Array.isArray(contract.tablesJson)
          ? contract.tablesJson.filter((item): item is string => typeof item === "string")
          : [],
        fields: Array.isArray(contract.fieldsJson)
          ? contract.fieldsJson.filter((item): item is string => typeof item === "string")
          : [],
        piiCategories: Array.isArray(contract.piiCategoriesJson)
          ? contract.piiCategoriesJson.filter((item): item is string => typeof item === "string")
          : [],
        retentionDays: contract.retentionDays,
        readOnly: contract.readOnly,
        approvedByName: contract.approvedByName ?? undefined,
        approvedByEmail: contract.approvedByEmail ?? undefined,
        approvedAt: toIso(contract.approvedAt),
        revokedAt: toIso(contract.revokedAt),
        createdBy: contract.createdBy,
        createdAt: contract.createdAt.toISOString(),
        updatedAt: contract.updatedAt.toISOString(),
      }),
    ),
    subscriptions: subscriptions.map(
      (subscription): Subscription => ({
        id: subscription.id,
        organizationId: subscription.organizationId,
        provider: subscription.provider as Subscription["provider"],
        plan: subscription.plan,
        status: subscription.status as Subscription["status"],
        currentPeriodStart: subscription.currentPeriodStart.toISOString(),
        currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
        externalCustomerId: subscription.externalCustomerId,
        externalSubscriptionId: subscription.externalSubscriptionId,
      }),
    ),
    automationRules: automationRules.map(
      (rule): AutomationRule => ({
        id: rule.id,
        organizationId: rule.organizationId,
        trigger: rule.trigger as AutomationRule["trigger"],
        conditionsJson: jsonObject(rule.conditionsJson),
        template: rule.template,
        active: rule.active,
        createdBy: rule.createdBy,
      }),
    ),
    aiInsights: aiInsights.map(
      (insight): AiInsight => ({
        id: insight.id,
        organizationId: insight.organizationId,
        leadId: insight.leadId ?? undefined,
        conversationId: insight.conversationId ?? undefined,
        type: insight.type as AiInsight["type"],
        resultJson: jsonObject(insight.resultJson) as AiInsight["resultJson"],
        model: insight.model,
        promptVersion: insight.promptVersion,
        confidence: insight.confidence,
        costEstimate: insight.costEstimate,
        createdAt: insight.createdAt.toISOString(),
      }),
    ),
    usageLimits: usageLimits.map(
      (usage): UsageLimits => ({
        id: usage.id,
        organizationId: usage.organizationId,
        maxUsers: usage.maxUsers,
        maxIntegrations: usage.maxIntegrations,
        monthlyMessages: usage.monthlyMessages,
        monthlyAiRuns: usage.monthlyAiRuns,
        periodUsageJson: jsonObject(usage.periodUsageJson) as UsageLimits["periodUsageJson"],
      }),
    ),
    usageEvents: usageEvents.map(
      (event): UsageEvent => ({
        id: event.id,
        organizationId: event.organizationId,
        idempotencyKey: event.idempotencyKey,
        metric: event.metric,
        quantity: event.quantity,
        sourceEntityType: event.sourceEntityType,
        sourceEntityId: event.sourceEntityId,
        periodStart: event.periodStart.toISOString(),
        periodEnd: toIso(event.periodEnd),
        occurredAt: event.occurredAt.toISOString(),
        metadataJson: event.metadataJson ? jsonObject(event.metadataJson) : undefined,
        createdAt: event.createdAt.toISOString(),
      }),
    ),
    auditLogs: auditLogs.map(
      (log): AuditLog => ({
        id: log.id,
        organizationId: log.organizationId ?? undefined,
        actorUserId: log.actorUserId,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        metadataJson: jsonObject(log.metadataJson),
        ip: log.ip,
        createdAt: log.createdAt.toISOString(),
      }),
    ),
    integrationEvents: integrationEvents.map(
      (event): IntegrationEvent => ({
        id: event.id,
        organizationId: event.organizationId,
        provider: event.provider,
        providerEventId: event.providerEventId,
        status: event.status as IntegrationEvent["status"],
        payloadJson: jsonObject(event.payloadJson),
        retryCount: event.retryCount,
        errorMessage: event.errorMessage ?? undefined,
        createdAt: event.createdAt.toISOString(),
        processedAt: toIso(event.processedAt),
      }),
    ),
    billingEvents: billingEvents.map(
      (event): BillingEvent => ({
        id: event.id,
        organizationId: event.organizationId ?? undefined,
        subscriptionId: event.subscriptionId ?? undefined,
        outboxEventId: event.outboxEventId,
        provider: event.provider as BillingEvent["provider"],
        providerEventId: event.providerEventId,
        providerEventType: event.providerEventType,
        providerObjectId: event.providerObjectId ?? undefined,
        externalCustomerId: event.externalCustomerId ?? undefined,
        externalSubscriptionId: event.externalSubscriptionId ?? undefined,
        status: event.status,
        decision: event.decision ?? undefined,
        eventCreatedAt: event.eventCreatedAt.toISOString(),
        rawPayloadJson: event.rawPayloadJson ? jsonObject(event.rawPayloadJson) : undefined,
        processedAt: toIso(event.processedAt),
        retryCount: event.retryCount,
        resultJson: event.resultJson ? jsonObject(event.resultJson) : undefined,
        errorCode: event.errorCode ?? undefined,
        errorMessage: event.errorMessage ?? undefined,
        lastErrorCode: event.lastErrorCode ?? undefined,
        lastErrorMessage: event.lastErrorMessage ?? undefined,
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt.toISOString(),
      }),
    ),
  };
}

export async function writeAppStateToPrisma(
  state: AppState,
  client: PrismaClient = prisma,
): Promise<AppState> {
  await client.$transaction(async (tx) => {
    await tx.auditLog.deleteMany();
    await tx.billingEvent.deleteMany();
    await tx.aiInsight.deleteMany();
    await tx.usageEvent.deleteMany();
    await tx.usageRollup.deleteMany();
    await tx.teamNote.deleteMany();
    await tx.message.deleteMany();
    await tx.integrationEvent.deleteMany();
    await tx.leadStatusHistory.deleteMany();
    await tx.conversation.deleteMany();
    await tx.lead.deleteMany();
    await tx.automationRule.deleteMany();
    await tx.dataAccessContract.deleteMany();
    await tx.integration.deleteMany();
    await tx.subscription.deleteMany();
    await tx.usageLimit.deleteMany();
    await tx.membership.deleteMany();
    await tx.organization.deleteMany();
    await tx.user.deleteMany();

    await tx.user.createMany({
      data: state.users.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        status: user.status,
        lastLoginAt: toDate(user.lastLoginAt),
      })),
    });
    await tx.organization.createMany({
      data: state.organizations.map((organization) => ({
        id: organization.id,
        name: organization.name,
        timezone: organization.timezone,
        currency: organization.currency,
        averagePatientValue: organization.averagePatientValue,
        businessHours: jsonArrayOrObject(organization.businessHours),
        status: organization.status,
      })),
    });
    await tx.membership.createMany({
      data: state.memberships.map((membership) => ({
        id: membership.id,
        userId: membership.userId,
        organizationId: membership.organizationId,
        role: membership.role,
        status: membership.status,
        invitedBy: membership.invitedBy,
      })),
    });
    await tx.lead.createMany({
      data: state.leads.map((lead) => ({
        id: lead.id,
        organizationId: lead.organizationId,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        source: lead.source,
        status: lead.status,
        assignedTo: lead.assignedTo,
        providerContactId: lead.providerContactId,
        firstMessageAt: new Date(lead.firstMessageAt),
        firstHumanResponseAt: toDate(lead.firstHumanResponseAt),
        bookedAt: toDate(lead.bookedAt),
        lostReason: lead.lostReason,
        estimatedValue: lead.estimatedValue,
        createdAt: new Date(lead.createdAt),
        updatedAt: new Date(lead.updatedAt),
      })),
    });
    await tx.leadStatusHistory.createMany({
      data: state.leadStatusHistory.map((history) => ({
        id: history.id,
        leadId: history.leadId,
        fromStatus: history.fromStatus,
        toStatus: history.toStatus,
        changedBy: history.changedBy,
        reason: history.reason,
        createdAt: new Date(history.createdAt),
      })),
    });
    await tx.conversation.createMany({
      data: state.conversations.map((conversation) => ({
        id: conversation.id,
        organizationId: conversation.organizationId,
        leadId: conversation.leadId,
        provider: conversation.provider,
        providerThreadId: conversation.providerThreadId,
        status: conversation.status,
        lastMessageAt: new Date(conversation.lastMessageAt),
        aiSummary: conversation.aiSummary,
      })),
    });
    await tx.message.createMany({
      data: state.messages.map((message) => ({
        id: message.id,
        conversationId: message.conversationId,
        direction: message.direction,
        senderType: message.senderType,
        providerMessageId: message.providerMessageId,
        text: message.text,
        payloadJson: message.payloadJson
          ? jsonArrayOrObject(message.payloadJson)
          : Prisma.JsonNull,
        sentAt: new Date(message.sentAt),
        deliveredAt: toDate(message.deliveredAt),
        readAt: toDate(message.readAt),
      })),
    });
    await tx.teamNote.createMany({
      data: state.teamNotes.map((note) => ({
        id: note.id,
        organizationId: note.organizationId,
        conversationId: note.conversationId,
        leadId: note.leadId,
        authorUserId: note.authorUserId,
        authorMembershipId: note.authorMembershipId,
        body: note.body,
        createdAt: new Date(note.createdAt),
        updatedAt: new Date(note.updatedAt),
      })),
    });
    await tx.integration.createMany({
      data: state.integrations.map((integration) => ({
        id: integration.id,
        organizationId: integration.organizationId,
        provider: integration.provider,
        status: integration.status,
        externalAccountId: integration.externalAccountId ?? '',
        encryptedCredentials: integration.encryptedCredentials,
        webhookSecret: integration.webhookSecret,
        lastSyncAt: toDate(integration.lastSyncAt),
        errorState: integration.errorState,
        healthScore: integration.healthScore,
      })),
    });
    await tx.dataAccessContract.createMany({
      data: (state.dataAccessContracts ?? []).map((contract) => ({
        id: contract.id,
        organizationId: contract.organizationId,
        provider: contract.provider,
        status: contract.status,
        purpose: contract.purpose,
        tablesJson: jsonArrayOrObject(contract.tables),
        fieldsJson: jsonArrayOrObject(contract.fields),
        piiCategoriesJson: jsonArrayOrObject(contract.piiCategories),
        retentionDays: contract.retentionDays,
        readOnly: contract.readOnly,
        approvedByName: contract.approvedByName,
        approvedByEmail: contract.approvedByEmail,
        approvedAt: toDate(contract.approvedAt),
        revokedAt: toDate(contract.revokedAt),
        createdBy: contract.createdBy,
        createdAt: new Date(contract.createdAt),
        updatedAt: new Date(contract.updatedAt),
      })),
    });
    await tx.subscription.createMany({
      data: state.subscriptions.map((subscription) => ({
        id: subscription.id,
        organizationId: subscription.organizationId,
        provider: subscription.provider,
        plan: subscription.plan,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.currentPeriodStart),
        currentPeriodEnd: new Date(subscription.currentPeriodEnd),
        externalCustomerId: subscription.externalCustomerId,
        externalSubscriptionId: subscription.externalSubscriptionId,
      })),
    });
    await tx.automationRule.createMany({
      data: state.automationRules.map((rule) => ({
        id: rule.id,
        organizationId: rule.organizationId,
        trigger: rule.trigger,
        conditionsJson: jsonArrayOrObject(rule.conditionsJson),
        template: rule.template,
        active: rule.active,
        createdBy: rule.createdBy,
      })),
    });
    await tx.aiInsight.createMany({
      data: state.aiInsights.map((insight) => ({
        id: insight.id,
        organizationId: insight.organizationId,
        leadId: insight.leadId,
        conversationId: insight.conversationId,
        type: insight.type,
        resultJson: jsonArrayOrObject(insight.resultJson),
        model: insight.model,
        promptVersion: insight.promptVersion,
        confidence: insight.confidence,
        costEstimate: insight.costEstimate,
        createdAt: new Date(insight.createdAt),
      })),
    });
    await tx.usageLimit.createMany({
      data: state.usageLimits.map((usage) => ({
        id: usage.id,
        organizationId: usage.organizationId,
        maxUsers: usage.maxUsers,
        maxIntegrations: usage.maxIntegrations,
        monthlyMessages: usage.monthlyMessages,
        monthlyAiRuns: usage.monthlyAiRuns,
        periodUsageJson: jsonArrayOrObject(usage.periodUsageJson),
      })),
    });
    await tx.usageEvent.createMany({
      data: state.usageEvents.map((event) => serializeUsageEvent(event)),
    });
    await tx.auditLog.createMany({
      data: state.auditLogs.map((log) => ({
        id: log.id,
        organizationId: log.organizationId,
        actorUserId: log.actorUserId,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        metadataJson: jsonArrayOrObject(log.metadataJson),
        ip: log.ip,
        createdAt: new Date(log.createdAt),
      })),
    });
    await tx.billingEvent.createMany({
      data: state.billingEvents.map((event) => serializeBillingEvent(event)),
    });
    await tx.integrationEvent.createMany({
      data: state.integrationEvents.map((event) => ({
        id: event.id,
        organizationId: event.organizationId,
        provider: event.provider,
        providerEventId: event.providerEventId,
        status: event.status,
        payloadJson: jsonArrayOrObject(event.payloadJson),
        retryCount: event.retryCount,
        errorMessage: event.errorMessage,
        createdAt: new Date(event.createdAt),
        processedAt: toDate(event.processedAt),
      })),
    });
  });

  return readAppStateFromPrisma(client);
}

export async function writeAppStateDeltaToPrisma(
  previousState: AppState,
  nextState: AppState,
  client: PrismaClient = prisma,
): Promise<AppState> {
  await client.$transaction(async (transactionClient) => {
    const tx = transactionClient as unknown as PrismaWriteClient;

    for (const spec of orderedDeleteSpecs) {
      await deleteRemovedEntities(
        tx[spec.model],
        collectionByName(previousState, spec.collection),
        collectionByName(nextState, spec.collection),
      );
    }

    for (const spec of orderedUpsertSpecs) {
      await upsertChangedEntities(
        tx[spec.model],
        collectionByName(previousState, spec.collection),
        collectionByName(nextState, spec.collection),
        spec.toPrismaData,
      );
    }
  });

  return nextState;
}

export async function ensurePrismaSeeded(client: PrismaClient = prisma): Promise<void> {
  const userCount = await client.user.count();
  if (userCount === 0) {
    await writeAppStateToPrisma(getRuntimeSeedState(), client);
  }
}

export async function resetPrismaState(client: PrismaClient = prisma): Promise<AppState> {
  return writeAppStateToPrisma(getRuntimeSeedState(), client);
}
