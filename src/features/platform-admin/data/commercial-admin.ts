import {
  getPlanCatalog,
  getSubscriptionAccessStatus,
  getSubscriptionDaysRemaining,
} from "@/domain/business-rules";
import type { AppState, Organization, Subscription } from "@/domain/types";
import { readAppState } from "@/server/data-store";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface PlatformCommercialClinicRow {
  id: string;
  name: string;
  status: string;
  timezone: string;
  currency: string;
  plan: Subscription["plan"];
  subscriptionStatus: Subscription["status"] | "expired" | "not_configured";
  currentPeriodEnd: string | null;
  daysRemaining: number;
  monthlyPrice: number;
  usedSeats: number;
  maxSeats: number;
  activeIntegrations: number;
  degradedIntegrations: number;
  openConversations: number;
  leads7d: number;
  messages7d: number;
  recoverableRevenue: number;
  lastActivityAt: string | null;
  latestBillingAuditAction: string | null;
  latestBillingAuditAt: string | null;
  latestBillingReference: string | null;
}

export interface PlatformCommercialOverview {
  generatedAt: string;
  stats: {
    clinics: number;
    activeSubscriptions: number;
    trialingSubscriptions: number;
    lockedSubscriptions: number;
    mrr: number;
    usedSeats: number;
    maxSeats: number;
  };
  clinics: PlatformCommercialClinicRow[];
}

function newestIso(values: Array<string | undefined | null>): string | null {
  const newest = values
    .filter((value): value is string => Boolean(value))
    .toSorted((left, right) => Date.parse(right) - Date.parse(left))
    .at(0);

  return newest ?? null;
}

function getFallbackSubscription(organization: Organization): Subscription {
  const nowIso = new Date().toISOString();

  return {
    id: `sub-${organization.id}-fallback`,
    organizationId: organization.id,
    provider: "manual",
    plan: "starter",
    status: "past_due",
    currentPeriodStart: nowIso,
    currentPeriodEnd: nowIso,
    externalCustomerId: "",
    externalSubscriptionId: "",
  };
}

function buildClinicRow(
  state: AppState,
  organization: Organization,
  nowIso: string,
): PlatformCommercialClinicRow {
  const cutoff = new Date(Date.parse(nowIso) - 7 * DAY_MS).getTime();
  const subscription =
    state.subscriptions.find((item) => item.organizationId === organization.id) ??
    getFallbackSubscription(organization);
  const usage = state.usageLimits.find((item) => item.organizationId === organization.id);
  const leads = state.leads.filter((lead) => lead.organizationId === organization.id);
  const conversations = state.conversations.filter(
    (conversation) => conversation.organizationId === organization.id,
  );
  const conversationIds = new Set(conversations.map((conversation) => conversation.id));
  const messages = state.messages.filter((message) => conversationIds.has(message.conversationId));
  const integrations = state.integrations.filter(
    (integration) => integration.organizationId === organization.id,
  );
  const members = state.memberships.filter(
    (membership) =>
      membership.organizationId === organization.id &&
      (membership.status === "active" || membership.status === "invited"),
  );
  const activeIntegrations = integrations.filter((integration) => integration.status === "active");
  const degradedIntegrations = integrations.filter(
    (integration) => integration.status === "degraded" || integration.status === "disconnected",
  );
  const atRiskLeads = leads.filter((lead) =>
    ["new", "unanswered", "at_risk"].includes(lead.status),
  );
  const status = getSubscriptionAccessStatus(subscription, nowIso);
  const catalog = getPlanCatalog(subscription.plan);
  const latestBillingAudit = state.auditLogs
    .filter(
      (log) =>
        log.organizationId === organization.id &&
        (log.action.startsWith("subscription.") ||
          log.action === "billing.subscription_changed"),
    )
    .toSorted((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .at(0);
  const latestReference =
    typeof latestBillingAudit?.metadataJson.externalReference === "string"
      ? latestBillingAudit.metadataJson.externalReference
      : typeof latestBillingAudit?.metadataJson.sourceProviderEventId === "string"
        ? latestBillingAudit.metadataJson.sourceProviderEventId
        : null;

  return {
    id: organization.id,
    name: organization.name,
    status: organization.status,
    timezone: organization.timezone,
    currency: organization.currency,
    plan: subscription.plan,
    subscriptionStatus: status,
    currentPeriodEnd: subscription.currentPeriodEnd,
    daysRemaining: getSubscriptionDaysRemaining(subscription, nowIso),
    monthlyPrice: catalog.monthlyPrice,
    usedSeats: members.length,
    maxSeats: usage?.maxUsers ?? 0,
    activeIntegrations: activeIntegrations.length,
    degradedIntegrations: degradedIntegrations.length,
    openConversations: conversations.filter((conversation) => conversation.status === "open").length,
    leads7d: leads.filter((lead) => Date.parse(lead.createdAt) >= cutoff).length,
    messages7d: messages.filter((message) => Date.parse(message.sentAt) >= cutoff).length,
    recoverableRevenue: atRiskLeads.reduce((sum, lead) => sum + lead.estimatedValue, 0),
    latestBillingAuditAction: latestBillingAudit?.action ?? null,
    latestBillingAuditAt: latestBillingAudit?.createdAt ?? null,
    latestBillingReference: latestReference,
    lastActivityAt: newestIso([
      ...leads.map((lead) => lead.updatedAt),
      ...conversations.map((conversation) => conversation.lastMessageAt),
      ...messages.map((message) => message.sentAt),
      ...integrations.map((integration) => integration.lastSyncAt),
    ]),
  };
}

export async function getPlatformCommercialOverviewData(): Promise<PlatformCommercialOverview> {
  const state = await readAppState();
  const nowIso = new Date().toISOString();
  const clinics = state.organizations
    .map((organization) => buildClinicRow(state, organization, nowIso))
    .toSorted((left, right) => {
      const leftActivity = left.lastActivityAt ? Date.parse(left.lastActivityAt) : 0;
      const rightActivity = right.lastActivityAt ? Date.parse(right.lastActivityAt) : 0;

      return rightActivity - leftActivity || left.name.localeCompare(right.name);
    });
  const activeRows = clinics.filter((clinic) => clinic.subscriptionStatus === "active");
  const trialRows = clinics.filter((clinic) => clinic.subscriptionStatus === "trialing");
  const lockedRows = clinics.filter(
    (clinic) =>
      clinic.subscriptionStatus === "expired" ||
      clinic.subscriptionStatus === "past_due" ||
      clinic.subscriptionStatus === "canceled" ||
      clinic.subscriptionStatus === "not_configured",
  );

  return {
    generatedAt: nowIso,
    stats: {
      clinics: clinics.length,
      activeSubscriptions: activeRows.length,
      trialingSubscriptions: trialRows.length,
      lockedSubscriptions: lockedRows.length,
      mrr: activeRows.reduce((sum, clinic) => sum + clinic.monthlyPrice, 0),
      usedSeats: clinics.reduce((sum, clinic) => sum + clinic.usedSeats, 0),
      maxSeats: clinics.reduce((sum, clinic) => sum + clinic.maxSeats, 0),
    },
    clinics,
  };
}
