import { cache } from "react";
import { cookies } from "next/headers";
import {
  calculateDashboardOverview,
  getPlanCatalog,
  getSubscriptionAccessStatus,
  getSubscriptionDaysRemaining,
  isSubscriptionAccessActive,
} from "@/domain/business-rules";
import { createEmptyAppState } from "@/domain/empty-app-state";
import { isDemoOrganizationId } from "@/domain/seed-data";
import type {
  AppState,
  DashboardOverview,
  Organization,
  Role,
  Subscription,
} from "@/domain/types";
import { stateForContext } from "@/server/api-helpers";
import { readAppState } from "@/server/data-store";
import {
  decodeSession,
  resolveSessionContext,
  SESSION_COOKIE_NAME,
  toClientSession,
  type ClientSession,
} from "@/server/session";

const fallbackOverview: DashboardOverview = {
  newLeads: 0,
  unanswered: 0,
  atRisk: 0,
  booked: 0,
  lost: 0,
  lostRevenue: 0,
  averageResponseMinutes: 0,
  totalLeads: 0,
  conversionRate: 0,
};

const fallbackOrganization: Organization = {
  id: "",
  name: "Clinic workspace",
  timezone: "UTC",
  currency: "USD",
  averagePatientValue: 500,
  businessHours: {
    start: "09:00",
    end: "18:00",
    weekdays: [1, 2, 3, 4, 5],
  },
  status: "trial",
};

export interface WorkspaceShellBootstrap {
  state: AppState;
  session: ClientSession | null;
  organization: Organization;
  subscription: Subscription | null;
  billing: {
    currentPeriodEnd?: string;
    daysRemaining: number;
    hasWorkspaceAccess: boolean;
    paymentRequired: boolean;
    planLabel: string;
    status: Subscription["status"] | "expired" | "not_configured";
  };
  overview: DashboardOverview;
  summary: {
    connectedIntegrations: number;
    openConversations: number;
    onboardingCompleted: number;
    onboardingTotal: number;
  };
}

export const getWorkspaceShellBootstrap = cache(
  async (requiredRole: Role = "manager"): Promise<WorkspaceShellBootstrap> => {
    const state = await readAppState();
    const cookieStore = await cookies();
    const sessionPayload = decodeSession(
      cookieStore.get(SESSION_COOKIE_NAME)?.value,
    );

    let session: ClientSession | null = null;
    let scopedState = createEmptyAppState();
    let organization = fallbackOrganization;
    let subscription: Subscription | null = null;

    if (sessionPayload) {
      try {
        const context = resolveSessionContext(state, sessionPayload, requiredRole);
        session = toClientSession(context);
        scopedState = stateForContext(state, context);
        organization = scopedState.organizations[0] ?? fallbackOrganization;
        subscription =
          scopedState.subscriptions.find((item) => item.organizationId === organization.id) ??
          null;
      } catch {
        scopedState = createEmptyAppState();
      }
    }

    const nowIso = new Date().toISOString();
    const overview =
      organization.id && scopedState.organizations.length
        ? calculateDashboardOverview(scopedState, organization.id, nowIso)
        : fallbackOverview;

    const connectedIntegrations = scopedState.integrations.filter(
      (integration) => integration.status === "active",
    ).length;
    const openConversations = scopedState.conversations.filter(
      (conversation) => conversation.status === "open",
    ).length;
    const subscriptionAccessActive = isSubscriptionAccessActive(subscription, nowIso);
    const hasWorkspaceAccess =
      isDemoOrganizationId(organization.id) || subscriptionAccessActive;
    const paymentRequired = Boolean(session) && !hasWorkspaceAccess;
    const billingStatus = getSubscriptionAccessStatus(subscription, nowIso);
    const onboardingTotal = 6;
    const onboardingCompleted = [
      Boolean(session),
      scopedState.integrations.some(
        (integration) => integration.provider === "telegram" && integration.status === "active",
      ),
      scopedState.integrations.some(
        (integration) => integration.provider === "web_form" && integration.status === "active",
      ),
      scopedState.integrations.some(
        (integration) =>
          integration.provider === "clinic_database" &&
          Boolean(integration.encryptedCredentials),
      ),
      scopedState.dataAccessContracts.some((contract) => contract.status === "approved"),
      hasWorkspaceAccess,
    ].filter(Boolean).length;

    return {
      state: scopedState,
      session,
      organization,
      subscription,
      billing: {
        currentPeriodEnd: subscription?.currentPeriodEnd,
        daysRemaining: getSubscriptionDaysRemaining(subscription, nowIso),
        hasWorkspaceAccess,
        paymentRequired,
        planLabel: subscription ? getPlanCatalog(subscription.plan).label : "No plan",
        status: billingStatus,
      },
      overview,
      summary: {
        connectedIntegrations,
        openConversations,
        onboardingCompleted,
        onboardingTotal,
      },
    };
  },
);
