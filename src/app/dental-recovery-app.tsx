"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  Bell,
  Bot,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  FileWarning,
  Gauge,
  Inbox,
  Moon,
  Plug,
  Radar,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  Timer,
  ToggleLeft,
  ToggleRight,
  TrendingDown,
  UserPlus,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  calculateDashboardOverview,
  deriveLeadStatus,
  formatCurrency,
  formatLeadStatus,
  getPlanCatalog,
  formatProvider,
  getLeadResponseMinutes,
  getLeadRiskLevel,
  getMessagesForConversation,
  getPlanLimits,
  minutesBetween,
} from "@/domain/business-rules";
import type {
  AiInsight,
  AppState,
  AuditLog,
  AutomationRule,
  Conversation,
  DataAccessContract,
  Integration,
  IntegrationStatus,
  Lead,
  LeadStatus,
  LeadStatusHistory,
  Message,
  Organization,
  Role,
  Subscription,
  UsageLimits,
  User,
} from "@/domain/types";
import type { OAuthPublicConfig } from "@/server/oauth";
import type { ClientSession, LoginProfile } from "@/server/session";

type ViewKey =
  | "dashboard"
  | "setup"
  | "queue"
  | "alerts"
  | "leads"
  | "inbox"
  | "automations"
  | "integrations"
  | "ai"
  | "reports"
  | "billing"
  | "compliance"
  | "admin";

type DashboardRange = "today" | "7d" | "all";
type ThemeMode = "light" | "dark";
type MessagingProvider = "telegram" | "whatsapp" | "instagram";

type DashboardDrill =
  | "recovery"
  | "unanswered"
  | "at_risk"
  | "booked"
  | "lost"
  | "all";

interface DentalRecoveryAppProps {
  allowDemoActions: boolean;
  allowDevLogin: boolean;
  initialState: AppState;
  initialSession: ClientSession | null;
  initialAuthError?: string;
  loginProfiles: LoginProfile[];
  oauthLogin: OAuthPublicConfig;
  stripeBillingConfigured: boolean;
}

interface NavItem {
  key: ViewKey;
  label: string;
  icon: LucideIcon;
  requiredRole: Role;
}

const navItems: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: Gauge, requiredRole: "manager" },
  { key: "setup", label: "Setup", icon: Target, requiredRole: "admin" },
  { key: "queue", label: "Work queue", icon: Timer, requiredRole: "manager" },
  { key: "alerts", label: "Alerts", icon: Bell, requiredRole: "manager" },
  { key: "leads", label: "Leads", icon: Users, requiredRole: "manager" },
  { key: "inbox", label: "Inbox", icon: Inbox, requiredRole: "manager" },
  { key: "automations", label: "Automations", icon: Zap, requiredRole: "admin" },
  { key: "integrations", label: "Integrations", icon: Plug, requiredRole: "admin" },
  { key: "ai", label: "AI insights", icon: Sparkles, requiredRole: "manager" },
  { key: "reports", label: "Reports", icon: TrendingDown, requiredRole: "owner" },
  { key: "billing", label: "Billing", icon: CreditCard, requiredRole: "owner" },
  { key: "compliance", label: "Compliance", icon: FileWarning, requiredRole: "admin" },
  { key: "admin", label: "Platform", icon: ShieldCheck, requiredRole: "super_admin" },
];

const roleLabels: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  super_admin: "Super Admin",
};

const authErrorMessages: Record<string, string> = {
  oauth_not_configured: "OAuth provider is not configured yet.",
  oauth_provider_error: "OAuth provider rejected the login request.",
  oauth_state_invalid: "OAuth session expired. Please try again.",
  oauth_login_failed: "OAuth login failed. Check provider settings and invited user email.",
};

const fallbackOrganization: Organization = {
  id: "",
  name: "Dental Recovery",
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

const fallbackUser: User = {
  id: "",
  email: "",
  name: "Workspace user",
  avatar: "DR",
  status: "active",
  lastLoginAt: "",
};

const fallbackSubscription: Subscription = {
  id: "",
  organizationId: "",
  provider: "stripe",
  plan: "starter",
  status: "trialing",
  currentPeriodStart: "",
  currentPeriodEnd: "",
  externalCustomerId: "",
  externalSubscriptionId: "",
};

const fallbackUsage: UsageLimits = {
  id: "",
  organizationId: "",
  maxUsers: 10,
  maxIntegrations: 5,
  monthlyMessages: 10000,
  monthlyAiRuns: 600,
  periodUsageJson: {
    users: 0,
    integrations: 0,
    messages: 0,
    aiRuns: 0,
  },
};

interface CredentialsLoginInput {
  email: string;
  password: string;
}

interface RegisterClinicInput {
  clinicName: string;
  ownerName: string;
  email: string;
  password: string;
  timezone: string;
  currency: Organization["currency"];
}

const statusFilters: { label: string; value: LeadStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "New", value: "new" },
  { label: "Unanswered", value: "unanswered" },
  { label: "At risk", value: "at_risk" },
  { label: "Booked", value: "booked" },
  { label: "Lost", value: "lost" },
];

const dashboardRanges: { label: string; value: DashboardRange }[] = [
  { label: "Today", value: "today" },
  { label: "7 days", value: "7d" },
  { label: "All", value: "all" },
];

const dashboardDrills: Record<DashboardDrill, string> = {
  recovery: "Recovery queue",
  unanswered: "Unanswered leads",
  at_risk: "At-risk leads",
  booked: "Booked leads",
  lost: "Lost leads",
  all: "All leads",
};

const suggestedReplies = [
  "Yes, we can help. I can offer today at 16:40 or tomorrow at 10:20. Which works better?",
  "The first consultation includes an exam and treatment estimate. May I reserve a slot for you?",
  "Please share your phone number and the best time to call. We will prioritize this request.",
];

type AlertSeverity = "critical" | "warning" | "info";

interface OperationalAlert {
  id: string;
  title: string;
  detail: string;
  severity: AlertSeverity;
  leadId?: string;
  actionLabel?: string;
}

interface WorkQueueItem {
  id: string;
  lead: Lead;
  task: string;
  detail: string;
  priority: "critical" | "high" | "normal";
}

interface TimelineItem {
  id: string;
  timeIso: string;
  title: string;
  detail: string;
  tone: "neutral" | "warning" | "success" | "danger";
}

interface MessagingSetupGuide {
  provider: MessagingProvider;
  callbackUrl: string;
  verifyToken: string;
  docsUrl: string;
  portalLabel: string;
  requiredCredentials: string[];
  steps: string[];
}

export default function DentalRecoveryApp({
  allowDemoActions,
  allowDevLogin,
  initialAuthError,
  initialSession,
  initialState,
  loginProfiles,
  oauthLogin,
  stripeBillingConfigured,
}: DentalRecoveryAppProps) {
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [session, setSession] = useState<ClientSession | null>(initialSession);
  const [activeView, setActiveView] = useState<ViewKey>("dashboard");
  const [leadFilter, setLeadFilter] = useState<LeadStatus | "all">("all");
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [replyText, setReplyText] = useState("");
  const [assistantOpen, setAssistantOpen] = useState(true);
  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [assistantMessages, setAssistantMessages] = useState<
    Array<{ id: string; role: "assistant" | "user"; text: string }>
  >([
    {
      id: "assistant-welcome",
      role: "assistant",
      text: "I can turn the current lead into a reply, a risk summary, or an owner brief. Ask about the selected conversation or use the quick actions below.",
    },
  ]);
  const [currentTimeIso, setCurrentTimeIso] = useState(() => new Date().toISOString());
  const [notice, setNotice] = useState(
    initialSession
      ? "Secure session loaded. Connect clinic channels in Integrations to start live traffic."
      : "Sign in or create a clinic workspace to continue.",
  );
  const [loginError, setLoginError] = useState(
    initialAuthError ? (authErrorMessages[initialAuthError] ?? "Authentication failed.") : "",
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [usersState, setUsersState] = useState<User[]>(() => initialState.users);
  const [organizationsState, setOrganizationsState] = useState<Organization[]>(
    () => initialState.organizations,
  );
  const [leads, setLeads] = useState<Lead[]>(() => initialState.leads);
  const [leadStatusHistory, setLeadStatusHistory] = useState<LeadStatusHistory[]>(
    () => initialState.leadStatusHistory,
  );
  const [conversations, setConversations] = useState<Conversation[]>(
    () => initialState.conversations,
  );
  const [messages, setMessages] = useState<Message[]>(() => initialState.messages);
  const [integrations, setIntegrations] = useState<Integration[]>(
    () => initialState.integrations,
  );
  const [dataAccessContracts, setDataAccessContracts] = useState<DataAccessContract[]>(
    () => initialState.dataAccessContracts ?? [],
  );
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>(
    () => initialState.automationRules,
  );
  const [aiInsights, setAiInsights] = useState<AiInsight[]>(() => initialState.aiInsights);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(
    () => initialState.subscriptions,
  );
  const [usageLimits, setUsageLimits] = useState<UsageLimits[]>(
    () => initialState.usageLimits,
  );
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => initialState.auditLogs);
  const [integrationEvents, setIntegrationEvents] = useState<AppState["integrationEvents"]>(
    () => initialState.integrationEvents,
  );
  const organizationId = session?.organizationId ?? organizationsState[0]?.id ?? "";
  const organization =
    organizationsState.find((org) => org.id === organizationId) ?? fallbackOrganization;
  const currentUser = session
    ? ({
        ...fallbackUser,
        ...session.user,
      } as User)
    : usersState[0] ?? fallbackUser;
  const activeRole = session?.role ?? "owner";

  const apiHeaders = useCallback((): HeadersInit => {
    return {
      "Content-Type": "application/json",
    };
  }, []);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("dental-recovery-theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      window.setTimeout(() => setTheme(storedTheme), 0);
      return;
    }

    if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
      window.setTimeout(() => setTheme("dark"), 0);
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("dental-recovery-theme", theme);
  }, [theme]);

  useEffect(() => {
    let cancelled = false;

    async function loadPersistentState() {
      try {
        const response = await fetch("/api/v1/state", {
          cache: "no-store",
          headers: apiHeaders(),
        });
        if (!response.ok) {
          throw new Error("State API did not respond");
        }
        const nextState = (await response.json()) as AppState;
        if (!cancelled) {
          setUsersState(nextState.users);
          setOrganizationsState(nextState.organizations);
          setLeads(nextState.leads);
          setLeadStatusHistory(nextState.leadStatusHistory);
          setConversations(nextState.conversations);
          setMessages(nextState.messages);
          setIntegrations(nextState.integrations);
          setDataAccessContracts(nextState.dataAccessContracts ?? []);
          setAutomationRules(nextState.automationRules);
          setAiInsights(nextState.aiInsights);
          setSubscriptions(nextState.subscriptions);
          setUsageLimits(nextState.usageLimits);
          setAuditLogs(nextState.auditLogs);
          setIntegrationEvents(nextState.integrationEvents);
          setSelectedLeadId((current) =>
            nextState.leads.some((lead) => lead.id === current)
              ? current
              : nextState.leads[0]?.id ?? "",
          );
          setNotice("Persisted workspace loaded.");
        }
      } catch {
        if (!cancelled) {
          setNotice("Persistent workspace state is unavailable right now.");
        }
      }
    }

    if (session) {
      void loadPersistentState();
    }

    return () => {
      cancelled = true;
    };
  }, [apiHeaders, session]);

  function applyServerState(nextState: AppState) {
    setUsersState(nextState.users);
    setOrganizationsState(nextState.organizations);
    setLeads(nextState.leads);
    setLeadStatusHistory(nextState.leadStatusHistory);
    setConversations(nextState.conversations);
    setMessages(nextState.messages);
    setIntegrations(nextState.integrations);
    setDataAccessContracts(nextState.dataAccessContracts ?? []);
    setAutomationRules(nextState.automationRules);
    setAiInsights(nextState.aiInsights);
    setSubscriptions(nextState.subscriptions);
    setUsageLimits(nextState.usageLimits);
    setAuditLogs(nextState.auditLogs);
    setIntegrationEvents(nextState.integrationEvents);

    if (!nextState.leads.some((lead) => lead.id === selectedLeadId)) {
      setSelectedLeadId(nextState.leads[0]?.id ?? "");
    }
  }

  function extractState(payload: unknown): AppState | undefined {
    if (!payload || typeof payload !== "object") {
      return undefined;
    }

    const objectPayload = payload as { state?: AppState; leads?: Lead[] };
    if (objectPayload.state) {
      return objectPayload.state;
    }

    if (objectPayload.leads) {
      return objectPayload as AppState;
    }

    return undefined;
  }

  async function mutateViaApi(
    path: string,
    body: Record<string, unknown>,
    successNotice: string,
  ): Promise<AppState | undefined> {
    setIsSyncing(true);
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify(body),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        state?: AppState;
        leads?: Lead[];
      };

      if (!response.ok) {
        throw new Error(payload.error ?? `Request failed: ${response.status}`);
      }

      const nextState = extractState(payload);
      if (nextState) {
        applyServerState(nextState);
      }
      setNotice(successNotice);
      return nextState;
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Could not persist the action. Check the API route and try again.",
      );
      return undefined;
    } finally {
      setIsSyncing(false);
    }
  }

  async function completeSessionStart(
    response: Response,
    fallbackError: string,
  ) {
    const payload = (await response.json()) as {
      session?: ClientSession;
      state?: AppState;
      error?: string;
    };

    if (!response.ok || !payload.session || !payload.state) {
      setLoginError(payload.error ?? fallbackError);
      return;
    }

    setSession(payload.session);
    applyServerState(payload.state);
    setActiveView("dashboard");
    setNotice(`Signed in as ${payload.session.user.name}.`);
  }

  async function signInWithProfile(profile: LoginProfile) {
    setIsSyncing(true);
    setLoginError("");
    try {
      const response = await fetch("/api/v1/auth/session", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({
          userId: profile.userId,
          organizationId: profile.organizationId,
        }),
      });
      await completeSessionStart(response, "Could not start session.");
    } catch {
      setLoginError("Could not start session. Check the auth API.");
    } finally {
      setIsSyncing(false);
    }
  }

  async function signInWithPassword(credentials: CredentialsLoginInput) {
    setIsSyncing(true);
    setLoginError("");
    try {
      const response = await fetch("/api/v1/auth/session", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify(credentials),
      });
      await completeSessionStart(response, "Email or password is invalid.");
    } catch {
      setLoginError("Could not start session. Check the auth API.");
    } finally {
      setIsSyncing(false);
    }
  }

  async function registerClinicWorkspace(input: RegisterClinicInput) {
    setIsSyncing(true);
    setLoginError("");
    try {
      const response = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify(input),
      });
      await completeSessionStart(response, "Could not create the clinic workspace.");
    } catch {
      setLoginError("Could not create the clinic workspace.");
    } finally {
      setIsSyncing(false);
    }
  }

  function signInWithOAuth() {
    if (!oauthLogin.enabled) {
      setLoginError("OAuth provider is not configured yet.");
      return;
    }

    window.location.assign("/api/v1/auth/oauth/start");
  }

  async function signOut() {
    setIsSyncing(true);
    try {
      await fetch("/api/v1/auth/session", {
        method: "DELETE",
      });
      window.location.reload();
    } finally {
      setIsSyncing(false);
    }
  }

  const leadById = useMemo(
    () => new Map(leads.map((lead) => [lead.id, lead])),
    [leads],
  );
  const userById = useMemo(
    () => new Map(usersState.map((user) => [user.id, user])),
    [usersState],
  );
  const conversationByLeadId = useMemo(
    () => new Map(conversations.map((conversation) => [conversation.leadId, conversation])),
    [conversations],
  );

  const selectedLead = leadById.get(selectedLeadId) ?? leads[0];
  const selectedConversation = selectedLead
    ? conversationByLeadId.get(selectedLead.id)
    : undefined;
  const selectedMessages = selectedConversation
    ? getMessagesForConversation(messages, selectedConversation.id)
    : [];
  const activeSubscription =
    subscriptions.find((subscription) => subscription.organizationId === organization.id) ??
    fallbackSubscription;
  const activeUsage =
    usageLimits.find((usage) => usage.organizationId === organization.id) ?? fallbackUsage;
  const clinicDbIntegration = integrations.find(
    (integration) =>
      integration.organizationId === organization.id &&
      integration.provider === "clinic_database",
  );
  const clinicDbContract = dataAccessContracts.find(
    (contract) =>
      contract.organizationId === organization.id &&
      contract.provider === "clinic_database",
  );
  const clinicDbApproved = clinicDbContract?.status === "approved";
  const clinicDbConfigured = Boolean(clinicDbIntegration?.encryptedCredentials);

  const scopedLeads = useMemo(
    () =>
      leads
        .filter((lead) => lead.organizationId === organization.id)
        .map((lead) => ({ ...lead, status: deriveLeadStatus(lead, currentTimeIso) }))
        .toSorted(
          (left, right) =>
            new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
        ),
    [currentTimeIso, leads, organization.id],
  );

  const visibleLeads = useMemo(() => {
    if (leadFilter === "all") {
      return scopedLeads;
    }

    return scopedLeads.filter((lead) => lead.status === leadFilter);
  }, [leadFilter, scopedLeads]);
  const workQueue = useMemo(
    () => buildWorkQueue(scopedLeads, currentTimeIso),
    [currentTimeIso, scopedLeads],
  );
  const operationalAlerts = useMemo(
    () =>
      buildOperationalAlerts(
        scopedLeads,
        integrations,
        dataAccessContracts,
        integrationEvents,
        activeUsage,
        currentTimeIso,
      ),
    [activeUsage, currentTimeIso, dataAccessContracts, integrationEvents, integrations, scopedLeads],
  );
  const setupSteps = useMemo(
    () =>
      buildSetupSteps({
        organization,
        users: usersState,
        integrations,
        dataAccessContracts,
        subscription: activeSubscription,
        usage: activeUsage,
      }),
    [activeSubscription, activeUsage, dataAccessContracts, integrations, organization, usersState],
  );
  const latestConversationInsight = useMemo(
    () =>
      aiInsights.find(
        (insight) =>
          insight.conversationId === selectedConversation?.id &&
          insight.organizationId === organization.id,
      ),
    [aiInsights, organization.id, selectedConversation?.id],
  );
  const ownerReport = useMemo(
    () => buildOwnerReport(scopedLeads, messages, organization),
    [messages, organization, scopedLeads],
  );
  const assistantReplyOptions = useMemo(
    () =>
      buildAssistantReplyOptions({
        latestInsight: latestConversationInsight,
        selectedLead,
      }),
    [latestConversationInsight, selectedLead],
  );

  function openLead(leadId: string) {
    setSelectedLeadId(leadId);
    setActiveView("inbox");
  }

  async function saveMessagingIntegration(
    provider: MessagingProvider,
    payload: Record<string, unknown>,
  ) {
    const nextState = await mutateViaApi(
      "/api/v1/integrations/messaging/config",
      {
        organizationId: organization.id,
        provider,
        ...payload,
      },
      `${formatProvider(provider)} API verified and saved.`,
    );

    if (nextState) {
      setActiveView("integrations");
    }
  }

  async function changeLeadStatus(leadId: string, status: LeadStatus, reason?: string) {
    const previousLead = leadById.get(leadId);
    if (!previousLead) {
      return;
    }
    await mutateViaApi(
      `/api/v1/leads/${leadId}/status`,
      {
        status,
        reason,
        actorUserId: currentUser.id,
        nowIso: currentTimeIso,
      },
      `${previousLead.name} moved to ${formatLeadStatus(status)}.`,
    );
  }

  async function sendManagerReply(textOverride?: string) {
    if (!selectedConversation || !selectedLead) {
      return;
    }

    const text = (textOverride ?? replyText).trim();
    if (!text) {
      return;
    }

    const nextState = await mutateViaApi(
      `/api/v1/conversations/${selectedConversation.id}/messages`,
      {
        text,
        actorUserId: currentUser.id,
        nowIso: currentTimeIso,
      },
      `Reply sent to ${selectedLead.name}.`,
    );
    if (nextState) {
      setReplyText("");
    }
  }

  async function simulateInbound() {
    const previousIds = new Set(leads.map((lead) => lead.id));
    const nextState = await mutateViaApi(
      "/api/v1/demo/inbound",
      {
        organizationId: organization.id,
        actorUserId: currentUser.id,
        nowIso: currentTimeIso,
      },
      "Inbound webhook persisted. Lead, conversation, message and auto reply are stored.",
    );
    const newLead = nextState?.leads.find((lead) => !previousIds.has(lead.id));
    if (newLead) {
      setSelectedLeadId(newLead.id);
      setActiveView("inbox");
    }
  }

  async function toggleAutomation(ruleId: string) {
    await mutateViaApi(
      `/api/v1/automation-rules/${ruleId}/toggle`,
      {
        actorUserId: currentUser.id,
      },
      "Automation rule updated and persisted.",
    );
  }

  async function setIntegrationStatus(integrationId: string, status: IntegrationStatus) {
    await mutateViaApi(
      `/api/v1/integrations/${integrationId}/status`,
      {
        status,
        actorUserId: currentUser.id,
      },
      `Integration set to ${status}.`,
    );
  }

  async function updateClinicDbContract(action: "approve" | "revoke") {
    await mutateViaApi(
      "/api/v1/integrations/clinic-db/contract",
      {
        organizationId: organization.id,
        provider: "clinic_database",
        action,
        actorUserId: currentUser.id,
        approvedByName: currentUser.name,
        approvedByEmail: currentUser.email,
        nowIso: currentTimeIso,
      },
      action === "approve"
        ? "Data access contract approved. Clinic DB sync can read allowed tables."
        : "Data access contract revoked. Clinic DB sync is blocked.",
    );
  }

  async function saveClinicDbConnection(connectionString: string, ssl: boolean) {
    const nextState = await mutateViaApi(
      "/api/v1/integrations/clinic-db/config",
      {
        organizationId: organization.id,
        connectionString,
        ssl,
      },
      "Clinic DB connection saved. Run sync to validate access.",
    );

    if (nextState) {
      setActiveView("integrations");
    }
  }

  async function syncClinicDatabase() {
    if (!clinicDbApproved) {
      setNotice("Approve the Clinic DB data access contract before the first sync.");
      return;
    }

    if (!clinicDbConfigured) {
      setNotice("Save a read-only Clinic DB PostgreSQL URL in Integrations before syncing.");
      return;
    }

    setIsSyncing(true);
    try {
      const response = await fetch("/api/v1/integrations/clinic-db/sync", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({
          organizationId: organization.id,
          actorUserId: currentUser.id,
          nowIso: currentTimeIso,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        imported?: number;
        updated?: number;
        skipped?: number;
        state?: AppState;
      };

      if (payload.state) {
        applyServerState(payload.state);
      }

      if (!response.ok) {
        setNotice(payload.error ?? "Clinic database sync is not configured.");
        return;
      }

      setNotice(
        `Clinic DB sync completed: ${payload.imported ?? 0} imported, ${
          payload.updated ?? 0
        } updated, ${payload.skipped ?? 0} skipped.`,
      );
    } catch {
      setNotice("Clinic database sync failed. Check the connector settings and logs.");
    } finally {
      setIsSyncing(false);
    }
  }

  async function generateAiSummary() {
    if (!selectedConversation || !selectedLead || !activeUsage) {
      return;
    }

    if (activeUsage.periodUsageJson.aiRuns >= activeUsage.monthlyAiRuns) {
      setNotice("AI limit reached for the current subscription period.");
      return;
    }

    await mutateViaApi(
      `/api/v1/ai/conversations/${selectedConversation.id}/summary`,
      {
        actorUserId: currentUser.id,
        nowIso: currentTimeIso,
      },
      `AI summary generated for ${selectedLead.name}.`,
    );
  }

  function useAssistantReply(text: string) {
    setReplyText(text);
    setSelectedLeadId(selectedLead?.id ?? "");
    setActiveView("inbox");
    setAssistantOpen(true);
    setNotice("AI drafted a reply. Review it in Inbox and send when ready.");
  }

  function askAssistant(promptOverride?: string) {
    const prompt = (promptOverride ?? assistantPrompt).trim();
    if (!prompt) {
      return;
    }

    const answer = buildAssistantAnswer({
      latestInsight: latestConversationInsight,
      nowIso: currentTimeIso,
      ownerReport,
      prompt,
      selectedLead,
    });

    setAssistantMessages((current) => [
      ...current,
      {
        id: `assistant-user-${Date.now()}`,
        role: "user",
        text: prompt,
      },
      {
        id: `assistant-answer-${Date.now()}`,
        role: "assistant",
        text: answer,
      },
    ]);
    setAssistantPrompt("");
    setAssistantOpen(true);
  }

  async function changePlan(plan: Subscription["plan"]) {
    setIsSyncing(true);
    try {
      const response = await fetch("/api/v1/billing/checkout-session", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({
          organizationId: organization.id,
          plan,
        }),
      });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        setNotice(payload.error ?? "Stripe Checkout is not configured.");
        return;
      }

      window.location.assign(payload.url);
    } catch {
      setNotice("Could not open Stripe Checkout.");
    } finally {
      setIsSyncing(false);
    }
  }

  async function openBillingPortal() {
    setIsSyncing(true);
    try {
      const response = await fetch("/api/v1/billing/customer-portal", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({
          organizationId: organization.id,
        }),
      });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        setNotice(payload.error ?? "Stripe Customer Portal is not available yet.");
        return;
      }

      window.location.assign(payload.url);
    } catch {
      setNotice("Could not open Stripe Customer Portal.");
    } finally {
      setIsSyncing(false);
    }
  }

  function advanceSlaClock() {
    setCurrentTimeIso((current) =>
      new Date(new Date(current).getTime() + 5 * 60000).toISOString(),
    );
    setNotice("Dashboard clock advanced by 5 minutes. Run SLA sweep to persist status changes.");
  }

  async function runSlaSweep() {
    const payload = await mutateViaApi(
      "/api/v1/sla/sweep",
      {
        organizationId: organization.id,
        nowIso: currentTimeIso,
      },
      "SLA sweep completed and persisted.",
    );

    if (payload) {
      setNotice("SLA sweep completed and persisted.");
    }
  }

  if (!session) {
    return (
      <LoginScreen
        error={loginError}
        allowDevLogin={allowDevLogin}
        isSyncing={isSyncing}
        oauthLogin={oauthLogin}
        onCredentialsSignIn={signInWithPassword}
        onRegisterClinic={registerClinicWorkspace}
        onToggleTheme={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
        onOAuthSignIn={signInWithOAuth}
        onSignIn={signInWithProfile}
        profiles={loginProfiles}
        theme={theme}
      />
    );
  }

  return (
    <main className="app-shell" data-theme={theme}>
      <AppSidebar
        activeView={activeView}
        integrations={integrations}
        onViewChange={setActiveView}
        role={activeRole}
      />
      <section className="workspace">
        <TopBar
          activeRole={activeRole}
          currentUser={currentUser}
          isSyncing={isSyncing}
          notice={notice}
          onToggleTheme={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
          onLogout={signOut}
          onSimulateInbound={allowDemoActions ? simulateInbound : undefined}
          organization={organization}
          theme={theme}
        />

        {activeView === "setup" ? (
          <SetupView
            dataAccessContracts={dataAccessContracts}
            integrations={integrations}
            isSyncing={isSyncing}
            onApproveContract={() => updateClinicDbContract("approve")}
            onNavigate={setActiveView}
            onSyncClinicDatabase={syncClinicDatabase}
            organization={organization}
            setupSteps={setupSteps}
            subscription={activeSubscription}
            usage={activeUsage}
          />
        ) : null}

        {activeView === "dashboard" ? (
          <DashboardView
            allowDemoActions={allowDemoActions}
            alerts={operationalAlerts}
            leads={scopedLeads}
            messages={messages}
            nowIso={currentTimeIso}
            onAdvanceTime={advanceSlaClock}
            onBook={(leadId) => changeLeadStatus(leadId, "booked", "Booked from dashboard")}
            onEscalate={(leadId) => changeLeadStatus(leadId, "at_risk", "Escalated from dashboard")}
            onLose={(leadId) => changeLeadStatus(leadId, "lost", "Marked lost from dashboard")}
            onRunSlaSweep={runSlaSweep}
            onSelectLead={openLead}
            organization={organization}
            userById={userById}
            workQueue={workQueue}
          />
        ) : null}

        {activeView === "queue" ? (
          <WorkQueueView
            items={workQueue}
            nowIso={currentTimeIso}
            onBook={(leadId) => changeLeadStatus(leadId, "booked", "Booked from work queue")}
            onEscalate={(leadId) => changeLeadStatus(leadId, "at_risk", "Escalated from work queue")}
            onLose={(leadId) => changeLeadStatus(leadId, "lost", "Marked lost from work queue")}
            onOpen={openLead}
            organization={organization}
          />
        ) : null}

        {activeView === "alerts" ? (
          <AlertsView
            alerts={operationalAlerts}
            onNavigate={setActiveView}
            onOpenLead={openLead}
          />
        ) : null}

        {activeView === "leads" ? (
          <LeadsView
            filter={leadFilter}
            leads={visibleLeads}
            onBook={(leadId) => changeLeadStatus(leadId, "booked", "Booked by manager")}
            onFilterChange={setLeadFilter}
            onLose={(leadId) => changeLeadStatus(leadId, "lost", "No response")}
            onOpen={openLead}
            organization={organization}
            userById={userById}
          />
        ) : null}

        {activeView === "inbox" ? (
          <InboxView
            auditLogs={auditLogs}
            conversations={conversations}
            leads={scopedLeads}
            leadStatusHistory={leadStatusHistory}
            messages={messages}
            nowIso={currentTimeIso}
            onBook={(leadId) => changeLeadStatus(leadId, "booked", "Booked from inbox")}
            onLose={(leadId) => changeLeadStatus(leadId, "lost", "Marked lost from inbox")}
            onReply={sendManagerReply}
            onSelectLead={setSelectedLeadId}
            organization={organization}
            replyText={replyText}
            selectedConversation={selectedConversation}
            selectedLead={selectedLead}
            selectedMessages={selectedMessages}
            setReplyText={setReplyText}
            userById={userById}
          />
        ) : null}

        {activeView === "automations" ? (
          <AutomationsView rules={automationRules} onToggle={toggleAutomation} />
        ) : null}

        {activeView === "integrations" ? (
          <IntegrationsView
            dataAccessContracts={dataAccessContracts}
            events={integrationEvents}
            isSyncing={isSyncing}
            integrations={integrations}
            onApproveClinicContract={() => updateClinicDbContract("approve")}
            onRevokeClinicContract={() => updateClinicDbContract("revoke")}
            onSaveClinicDbConnection={saveClinicDbConnection}
            onSaveMessagingIntegration={saveMessagingIntegration}
            onSetStatus={setIntegrationStatus}
            onSyncClinicDatabase={syncClinicDatabase}
          />
        ) : null}

        {activeView === "ai" ? (
          <AiView
            aiInsights={aiInsights}
            leads={scopedLeads}
            messages={messages}
            onGenerate={generateAiSummary}
            organization={organization}
            selectedConversation={selectedConversation}
            selectedLead={selectedLead}
            usage={activeUsage}
          />
        ) : null}

        {activeView === "reports" ? (
          <ReportsView
            aiInsights={aiInsights}
            leads={scopedLeads}
            messages={messages}
            nowIso={currentTimeIso}
            organization={organization}
            userById={userById}
          />
        ) : null}

        {activeView === "billing" ? (
          <BillingView
            integrations={integrations}
            onManageBilling={openBillingPortal}
            onPlanChange={changePlan}
            organization={organization}
            subscription={activeSubscription}
            stripeBillingConfigured={stripeBillingConfigured}
            usage={activeUsage}
          />
        ) : null}

        {activeView === "compliance" ? (
          <ComplianceView
            auditLogs={auditLogs}
            dataAccessContracts={dataAccessContracts}
            events={integrationEvents}
            onApproveClinicContract={() => updateClinicDbContract("approve")}
            onRevokeClinicContract={() => updateClinicDbContract("revoke")}
            organization={organization}
          />
        ) : null}

        {activeView === "admin" ? (
          <AdminView
            activeRole={activeRole}
            auditLogs={auditLogs}
            dataAccessContracts={dataAccessContracts}
            events={integrationEvents}
            integrations={integrations}
            organizations={organizationsState}
            subscriptions={subscriptions}
            usageLimits={usageLimits}
          />
        ) : null}

        <AiAssistantDock
          aiUsage={activeUsage}
          assistantMessages={assistantMessages}
          assistantOpen={assistantOpen}
          assistantPrompt={assistantPrompt}
          latestInsight={latestConversationInsight}
          onAskAssistant={askAssistant}
          onChangePrompt={setAssistantPrompt}
          onGenerate={generateAiSummary}
          onOpenInsights={() => setActiveView("ai")}
          onToggle={() => setAssistantOpen((current) => !current)}
          onUseReply={useAssistantReply}
          ownerReport={ownerReport}
          replyOptions={assistantReplyOptions}
          selectedConversation={selectedConversation}
          selectedLead={selectedLead}
        />
      </section>
    </main>
  );
}

function LoginScreen({
  allowDevLogin,
  error,
  isSyncing,
  oauthLogin,
  onCredentialsSignIn,
  onRegisterClinic,
  onToggleTheme,
  onOAuthSignIn,
  onSignIn,
  profiles,
  theme,
}: {
  allowDevLogin: boolean;
  error: string;
  isSyncing: boolean;
  oauthLogin: OAuthPublicConfig;
  onCredentialsSignIn: (input: CredentialsLoginInput) => void;
  onRegisterClinic: (input: RegisterClinicInput) => void;
  onToggleTheme: () => void;
  onOAuthSignIn: () => void;
  onSignIn: (profile: LoginProfile) => void;
  profiles: LoginProfile[];
  theme: ThemeMode;
}) {
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [currency, setCurrency] = useState<Organization["currency"]>("USD");
  const [timezone, setTimezone] = useState(() =>
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  );

  function submitCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onCredentialsSignIn({
      email: email.trim(),
      password,
    });
  }

  function submitRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onRegisterClinic({
      clinicName: clinicName.trim(),
      ownerName: ownerName.trim(),
      email: email.trim(),
      password,
      timezone: timezone.trim() || "UTC",
      currency,
    });
  }

  return (
    <main className="login-shell" data-theme={theme}>
      <section className="login-panel">
        <div className="brand-lockup">
          <div className="brand-mark">
            <Radar size={22} strokeWidth={2.4} />
          </div>
          <div>
            <p className="brand-name">Dental Recovery</p>
            <p className="brand-subtitle">Secure workspace</p>
          </div>
          <button
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            className="icon-button"
            onClick={onToggleTheme}
            title={theme === "dark" ? "Light theme" : "Dark theme"}
            type="button"
          >
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>

        <div className="login-copy">
          <p className="eyebrow">Session required</p>
          <h1>{mode === "signin" ? "Sign in to Dental Recovery" : "Create your clinic workspace"}</h1>
          <p className="login-subcopy">
            {mode === "signin"
              ? "Each clinic works inside its own protected organization boundary."
              : "Create a dedicated workspace so your clinic sees only its own patients, leads, and sync history."}
          </p>
        </div>

        <button
          className="primary-button login-oauth-button"
          disabled={isSyncing || !oauthLogin.enabled}
          onClick={onOAuthSignIn}
          type="button"
        >
          <ShieldCheck size={17} />
          {oauthLogin.enabled ? `Continue with ${oauthLogin.label}` : "OAuth not configured"}
        </button>

        <div className="login-mode-toggle" role="tablist" aria-label="Authentication mode">
          <button
            aria-pressed={mode === "signin"}
            className={`secondary-button ${mode === "signin" ? "active" : ""}`}
            onClick={() => setMode("signin")}
            type="button"
          >
            Sign in
          </button>
          <button
            aria-pressed={mode === "register"}
            className={`secondary-button ${mode === "register" ? "active" : ""}`}
            onClick={() => setMode("register")}
            type="button"
          >
            Create clinic
          </button>
        </div>

        {mode === "signin" ? (
          <form className="login-form" onSubmit={submitCredentials}>
            <label className="login-field">
              <span>Email</span>
              <input
                autoComplete="email"
                disabled={isSyncing}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="owner@clinic.com"
                type="email"
                value={email}
              />
            </label>
            <label className="login-field">
              <span>Password</span>
              <input
                autoComplete="current-password"
                disabled={isSyncing}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Your password"
                type="password"
                value={password}
              />
            </label>
            <button className="primary-button wide" disabled={isSyncing} type="submit">
              <ShieldCheck size={16} />
              {isSyncing ? "Signing in..." : "Sign in with password"}
            </button>
          </form>
        ) : (
          <form className="login-form login-form-grid" onSubmit={submitRegistration}>
            <label className="login-field">
              <span>Clinic name</span>
              <input
                disabled={isSyncing}
                onChange={(event) => setClinicName(event.target.value)}
                placeholder="Bright Smile Dental"
                value={clinicName}
              />
            </label>
            <label className="login-field">
              <span>Owner name</span>
              <input
                autoComplete="name"
                disabled={isSyncing}
                onChange={(event) => setOwnerName(event.target.value)}
                placeholder="Dr. Maya Chen"
                value={ownerName}
              />
            </label>
            <label className="login-field">
              <span>Owner email</span>
              <input
                autoComplete="email"
                disabled={isSyncing}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="owner@clinic.com"
                type="email"
                value={email}
              />
            </label>
            <label className="login-field">
              <span>Password</span>
              <input
                autoComplete="new-password"
                disabled={isSyncing}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 10 characters"
                type="password"
                value={password}
              />
            </label>
            <label className="login-field">
              <span>Timezone</span>
              <input
                disabled={isSyncing}
                onChange={(event) => setTimezone(event.target.value)}
                placeholder="Europe/Kiev"
                value={timezone}
              />
            </label>
            <label className="login-field">
              <span>Currency</span>
              <select
                disabled={isSyncing}
                onChange={(event) => setCurrency(event.target.value as Organization["currency"])}
                value={currency}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="UAH">UAH</option>
              </select>
            </label>
            <button className="primary-button wide" disabled={isSyncing} type="submit">
              <UserPlus size={16} />
              {isSyncing ? "Creating workspace..." : "Create clinic workspace"}
            </button>
          </form>
        )}

        {allowDevLogin ? (
          <>
            <div className="login-divider">
              <span>Development access</span>
            </div>

            <div className="login-profile-grid">
              {profiles.map((profile) => (
                <button
                  className="login-profile-card"
                  disabled={isSyncing}
                  key={`${profile.userId}-${profile.organizationId}`}
                  onClick={() => onSignIn(profile)}
                  type="button"
                >
                  <span className="avatar">{profile.avatar}</span>
                  <span>
                    <strong>{profile.name}</strong>
                    <small>{profile.organizationName}</small>
                  </span>
                  <em>{roleLabels[profile.role]}</em>
                </button>
              ))}
            </div>
          </>
        ) : null}

        {error ? <p className="login-error">{error}</p> : null}
      </section>
    </main>
  );
}

function AppSidebar({
  activeView,
  integrations,
  onViewChange,
  role,
}: {
  activeView: ViewKey;
  integrations: Integration[];
  onViewChange: (view: ViewKey) => void;
  role: Role;
}) {
  const activeSources = integrations.filter((integration) => integration.status === "active");
  const activeSourceLabel =
    activeSources.length === 0
      ? "No live sources yet"
      : activeSources
          .slice(0, 2)
          .map((integration) => formatProvider(integration.provider))
          .join(" + ");
  const activeSourceDetail =
    activeSources.length === 0
      ? "Connect Clinic DB, web form, or messaging channels in Integrations."
      : `${activeSources.length} active source${
          activeSources.length === 1 ? "" : "s"
        } connected.`;

  return (
    <aside className="sidebar">
      <div className="brand-lockup">
        <div className="brand-mark">
          <Radar size={21} strokeWidth={2.4} />
        </div>
        <div>
          <p className="brand-name">Dental Recovery</p>
          <p className="brand-subtitle">Revenue control</p>
        </div>
      </div>

      <nav className="nav-list" aria-label="Primary">
        {navItems
          .filter((item) => item.requiredRole !== "super_admin" || role === "super_admin")
          .map((item) => {
          const Icon = item.icon;
          const locked = item.requiredRole === "super_admin" && role !== "super_admin";
          return (
            <button
              className={`nav-item ${activeView === item.key ? "active" : ""}`}
              disabled={locked}
              key={item.key}
              onClick={() => onViewChange(item.key)}
              title={locked ? "Super Admin only" : item.label}
              type="button"
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-status">
        <p className="eyebrow">Data sources</p>
        <strong>{activeSourceLabel}</strong>
        <span>{activeSourceDetail}</span>
      </div>
    </aside>
  );
}

function TopBar({
  activeRole,
  currentUser,
  isSyncing,
  notice,
  onLogout,
  onSimulateInbound,
  onToggleTheme,
  organization,
  theme,
}: {
  activeRole: Role;
  currentUser: User;
  isSyncing: boolean;
  notice: string;
  onLogout: () => void;
  onSimulateInbound?: () => void;
  onToggleTheme: () => void;
  organization: Organization;
  theme: ThemeMode;
}) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">{organization.name}</p>
        <h1>Missed Revenue Radar</h1>
      </div>
      <div className="topbar-actions">
        <div className="notice">
          <Bell size={15} />
          <span>{isSyncing ? "Syncing persistent state..." : notice}</span>
        </div>
        <div className="role-switcher session-pill">
          <span>{roleLabels[activeRole]}</span>
          <strong>{currentUser.name}</strong>
        </div>
        {onSimulateInbound ? (
          <button className="secondary-button" onClick={onSimulateInbound} type="button">
            <UserPlus size={17} />
            Simulate lead
          </button>
        ) : null}
        <button className="icon-button" onClick={onToggleTheme} title="Toggle theme" type="button">
          {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
        </button>
        <button className="secondary-button" onClick={onLogout} type="button">
          <RefreshCw size={16} />
          Switch account
        </button>
        <div className="avatar" title={currentUser.email}>
          {currentUser.avatar}
        </div>
      </div>
    </header>
  );
}

function SetupView({
  dataAccessContracts,
  integrations,
  isSyncing,
  onApproveContract,
  onNavigate,
  onSyncClinicDatabase,
  organization,
  setupSteps,
  subscription,
  usage,
}: {
  dataAccessContracts: DataAccessContract[];
  integrations: Integration[];
  isSyncing: boolean;
  onApproveContract: () => void;
  onNavigate: (view: ViewKey) => void;
  onSyncClinicDatabase: () => void;
  organization: Organization;
  setupSteps: ReturnType<typeof buildSetupSteps>;
  subscription: Subscription;
  usage: UsageLimits;
}) {
  const completed = setupSteps.filter((step) => step.status === "complete").length;
  const clinicDb = integrations.find((integration) => integration.provider === "clinic_database");
  const contract = dataAccessContracts.find((item) => item.provider === "clinic_database");
  const clinicDbApproved = contract?.status === "approved";
  const clinicDbConfigured = Boolean(clinicDb?.encryptedCredentials);
  const clinicDbReadyForSync = clinicDbApproved && clinicDbConfigured;
  const progress = Math.round((completed / setupSteps.length) * 100);

  return (
    <section className="view-grid setup-grid">
      <section className="radar-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Onboarding</p>
            <h2>Clinic setup</h2>
          </div>
          <span className="count-pill">{progress}%</span>
        </div>
        <div className="setup-summary">
          <InfoLine label="Clinic" value={organization.name} />
          <InfoLine label="Timezone" value={organization.timezone} />
          <InfoLine label="Average patient value" value={formatCurrency(organization.averagePatientValue, organization)} />
          <InfoLine label="Plan" value={`${subscription.plan} / ${subscription.status}`} />
        </div>
        <div className="usage-track setup-progress">
          <span style={{ width: `${progress}%` }} />
        </div>
      </section>

      <section className="wide-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Launch checklist</p>
            <h2>Required setup steps</h2>
          </div>
          <span className="soft-label">{completed} of {setupSteps.length} complete</span>
        </div>
        <div className="setup-step-list">
          {setupSteps.map((step, index) => (
            <div className={`setup-step ${step.status}`} key={step.id}>
              <div className="step-index">{index + 1}</div>
              <div>
                <strong>{step.title}</strong>
                <p>{step.detail}</p>
              </div>
              <StatusDot status={step.status === "complete" ? "active" : "pending"} />
              {step.view ? (
                <button className="secondary-button" onClick={() => onNavigate(step.view)} type="button">
                  Open
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="queue-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Clinic DB</p>
            <h2>Connection readiness</h2>
          </div>
          <ContractStatusBadge status={contract?.status ?? "draft"} />
        </div>
        <div className="connection-checks">
          <ConnectionCheck label="Read-only contract" ok={contract?.status === "approved"} />
          <ConnectionCheck label="Allowed view listed" ok={Boolean(contract?.tables.includes("dental_recovery_leads"))} />
          <ConnectionCheck label="Connection saved" ok={Boolean(clinicDb?.encryptedCredentials)} />
          <ConnectionCheck label="Healthy sync state" ok={clinicDb?.status === "active"} />
          <ConnectionCheck label="Usage under plan" ok={usage.periodUsageJson.integrations <= usage.maxIntegrations} />
        </div>
        <div className="contract-actions">
          <button className="secondary-button" onClick={onApproveContract} type="button">
            <CheckCircle2 size={16} />
            Approve contract
          </button>
          <button
            className="primary-button"
            disabled={isSyncing || !clinicDbReadyForSync}
            onClick={onSyncClinicDatabase}
            title={
              clinicDbReadyForSync
                ? "Run Clinic DB sync"
                : clinicDbApproved
                  ? "Save the clinic database connection first"
                  : "Approve the data access contract first"
            }
            type="button"
          >
            <RefreshCw size={16} />
            {isSyncing
              ? "Syncing"
              : clinicDbReadyForSync
                ? "Sync now"
                : clinicDbApproved
                  ? "Save connection"
                  : "Approve first"}
          </button>
        </div>
      </section>
    </section>
  );
}

function WorkQueueView({
  items,
  nowIso,
  onBook,
  onEscalate,
  onLose,
  onOpen,
  organization,
}: {
  items: WorkQueueItem[];
  nowIso: string;
  onBook: (leadId: string) => void;
  onEscalate: (leadId: string) => void;
  onLose: (leadId: string) => void;
  onOpen: (leadId: string) => void;
  organization: Organization;
}) {
  const expectedRecovery = items.reduce((sum, item) => sum + item.lead.estimatedValue, 0);

  return (
    <section className="view-grid queue-workspace-grid">
      <section className="radar-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Reception</p>
            <h2>Work queue</h2>
          </div>
          <span className="count-pill">{items.length}</span>
        </div>
        <div className="radar-total aligned-left">
          <span>Recoverable value</span>
          <strong>{formatCurrency(expectedRecovery, organization)}</strong>
        </div>
      </section>

      <section className="wide-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Next actions</p>
            <h2>Patients to handle now</h2>
          </div>
        </div>
        <div className="task-list">
          {items.map((item) => (
            <div className={`task-row ${item.priority}`} key={item.id}>
              <div>
                <strong>{item.task}</strong>
                <p>{item.detail}</p>
                <span>
                  {item.lead.name} - {formatProvider(item.lead.source)} - waiting{" "}
                  {minutesBetween(item.lead.firstMessageAt, nowIso)} min
                </span>
              </div>
              <StatusBadge status={item.lead.status} />
              <div className="row-actions">
                <button className="secondary-button" onClick={() => onOpen(item.lead.id)} type="button">
                  Open
                </button>
                <button className="icon-button" onClick={() => onEscalate(item.lead.id)} title="Escalate" type="button">
                  <ArrowUpRight size={16} />
                </button>
                <button className="icon-button" onClick={() => onBook(item.lead.id)} title="Booked" type="button">
                  <CheckCircle2 size={16} />
                </button>
                <button className="icon-button danger" onClick={() => onLose(item.lead.id)} title="Lost" type="button">
                  <TrendingDown size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

function AlertsView({
  alerts,
  onNavigate,
  onOpenLead,
}: {
  alerts: OperationalAlert[];
  onNavigate: (view: ViewKey) => void;
  onOpenLead: (leadId: string) => void;
}) {
  return (
    <section className="view-grid alerts-grid">
      <section className="wide-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Alert center</p>
            <h2>Operational alerts</h2>
          </div>
          <span className="count-pill">{alerts.length}</span>
        </div>
        <div className="alert-list">
          {alerts.map((alert) => (
            <div className={`alert-row ${alert.severity}`} key={alert.id}>
              <div>
                <strong>{alert.title}</strong>
                <p>{alert.detail}</p>
              </div>
              <button
                className="secondary-button"
                onClick={() => {
                  if (alert.leadId) {
                    onOpenLead(alert.leadId);
                    return;
                  }
                  onNavigate(alert.id.includes("contract") || alert.id.includes("sync") ? "integrations" : "dashboard");
                }}
                type="button"
              >
                {alert.actionLabel ?? "Open"}
              </button>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

function ConnectionCheck({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className={`connection-check ${ok ? "ok" : "warn"}`}>
      {ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
      <span>{label}</span>
    </div>
  );
}

function DashboardView({
  allowDemoActions,
  alerts,
  leads,
  messages,
  nowIso,
  onAdvanceTime,
  onBook,
  onEscalate,
  onLose,
  onRunSlaSweep,
  onSelectLead,
  organization,
  userById,
  workQueue,
}: {
  allowDemoActions: boolean;
  alerts: OperationalAlert[];
  leads: Lead[];
  messages: Message[];
  nowIso: string;
  onAdvanceTime: () => void;
  onBook: (leadId: string) => void;
  onEscalate: (leadId: string) => void;
  onLose: (leadId: string) => void;
  onRunSlaSweep: () => void;
  onSelectLead: (leadId: string) => void;
  organization: Organization;
  userById: Map<string, User>;
  workQueue: WorkQueueItem[];
}) {
  const [range, setRange] = useState<DashboardRange>("today");
  const [activeDrill, setActiveDrill] = useState<DashboardDrill>("recovery");
  const filteredLeads = useMemo(
    () => filterLeadsByRange(leads, range, nowIso),
    [leads, nowIso, range],
  );
  const dashboard = useMemo(
    () =>
      calculateDashboardOverview(
        { leads: filteredLeads, organizations: [organization] },
        organization.id,
        nowIso,
      ),
    [filteredLeads, nowIso, organization],
  );
  const riskQueue = workQueue.map((item) => item.lead).slice(0, 6);
  const maxRadar = Math.max(dashboard.unanswered, dashboard.atRisk, dashboard.lost, 1);
  const rescueableLeads = filteredLeads.filter((lead) =>
    ["new", "unanswered", "at_risk"].includes(lead.status),
  );
  const recoveryOpportunity = rescueableLeads.length * organization.averagePatientValue;
  const drillRows = getDashboardDrillRows(filteredLeads, activeDrill).slice(0, 7);
  const sourceStats = getSourceStats(filteredLeads);
  const trendPoints = getTrendPoints(filteredLeads, nowIso);
  const funnelRows = getFunnelRows(filteredLeads);
  const longestWaiting = rescueableLeads
    .toSorted(
      (left, right) =>
        minutesBetween(right.firstMessageAt, nowIso) -
        minutesBetween(left.firstMessageAt, nowIso),
    )
    .at(0);
  const teamStats = Array.from(userById.values())
    .filter((user) => user.id !== "user-super" && user.status === "active")
    .map((user) => {
      const assignedLeads = filteredLeads.filter((lead) => lead.assignedTo === user.id);
      const booked = assignedLeads.filter((lead) => lead.status === "booked").length;
      const responseTimes = assignedLeads
        .map(getLeadResponseMinutes)
        .filter((value): value is number => value !== null);
      return {
        user,
        assigned: assignedLeads.length,
        booked,
        avgResponse: responseTimes.length
          ? Math.round(responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length)
          : 0,
        conversion: assignedLeads.length ? Math.round((booked / assignedLeads.length) * 100) : 0,
      };
    });

  return (
    <section className="view-grid dashboard-grid">
      <div className="dashboard-command">
        <div>
          <p className="eyebrow">Workspace controls</p>
          <strong>{dashboardDrills[activeDrill]}</strong>
        </div>
        <div className="dashboard-command-actions">
          <div className="segmented-control compact">
            {dashboardRanges.map((item) => (
              <button
                className={range === item.value ? "selected" : ""}
                key={item.value}
                onClick={() => setRange(item.value)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="clock-chip">
            <Clock3 size={15} />
            {formatTime(nowIso)}
          </div>
          {allowDemoActions ? (
            <>
              <button className="secondary-button" onClick={onAdvanceTime} type="button">
                <RefreshCw size={16} />
                +5 min
              </button>
              <button className="primary-button" onClick={onRunSlaSweep} type="button">
                <Zap size={16} />
                Run SLA
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="metrics-row">
        <MetricBlock
          active={activeDrill === "recovery"}
          icon={Target}
          label="Rescue opportunity"
          onClick={() => setActiveDrill("recovery")}
          subtitle={`${rescueableLeads.length} active patients`}
          value={formatCurrency(recoveryOpportunity, organization)}
          tone="warning"
        />
        <MetricBlock
          active={activeDrill === "unanswered"}
          icon={Timer}
          label="Unanswered"
          onClick={() => setActiveDrill("unanswered")}
          subtitle="Human reply required"
          value={dashboard.unanswered}
          tone="warning"
        />
        <MetricBlock
          active={activeDrill === "at_risk"}
          icon={AlertTriangle}
          label="At risk"
          onClick={() => setActiveDrill("at_risk")}
          subtitle="SLA breach"
          value={dashboard.atRisk}
          tone="danger"
        />
        <MetricBlock
          active={activeDrill === "lost"}
          icon={CircleDollarSign}
          label="Lost revenue"
          onClick={() => setActiveDrill("lost")}
          subtitle="No-response losses"
          value={formatCurrency(dashboard.lostRevenue, organization)}
          tone="danger"
        />
      </div>

      <section className="wide-panel alert-strip-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Live alerts</p>
            <h2>What needs attention</h2>
          </div>
          <span className="count-pill">{alerts.length}</span>
        </div>
        <div className="compact-alert-grid">
          {alerts.slice(0, 3).map((alert) => (
            <button
              className={`compact-alert ${alert.severity}`}
              key={alert.id}
              onClick={() => (alert.leadId ? onSelectLead(alert.leadId) : undefined)}
              type="button"
            >
              <strong>{alert.title}</strong>
              <span>{alert.detail}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="radar-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Owner view</p>
            <h2>Missed Revenue Radar</h2>
          </div>
          <div className="radar-total">
            <span>Conversion</span>
            <strong>{dashboard.conversionRate}%</strong>
          </div>
        </div>
        <div className="radar-bars">
          <RadarBar
            color="blue"
            label="Unanswered"
            max={maxRadar}
            value={dashboard.unanswered}
          />
          <RadarBar color="red" label="At risk" max={maxRadar} value={dashboard.atRisk} />
          <RadarBar color="ink" label="Lost" max={maxRadar} value={dashboard.lost} />
        </div>
        <div className="radar-footer">
          <span>Average human response</span>
          <strong>{dashboard.averageResponseMinutes} min</strong>
        </div>
        {longestWaiting ? (
          <div className="priority-strip">
            <FileWarning size={18} />
            <div>
              <strong>{longestWaiting.name} is the longest wait</strong>
              <span>
                {minutesBetween(longestWaiting.firstMessageAt, nowIso)} min without human reply
              </span>
            </div>
            <button
              className="secondary-button"
              onClick={() => onSelectLead(longestWaiting.id)}
              type="button"
            >
              Open
            </button>
          </div>
        ) : null}
      </section>

      <section className="queue-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Action queue</p>
            <h2>Patients waiting now</h2>
          </div>
          <span className="count-pill">{riskQueue.length}</span>
        </div>
        <div className="queue-list">
          {riskQueue.map((lead) => (
            <div className="queue-row" key={lead.id}>
              <button className="queue-main" onClick={() => onSelectLead(lead.id)} type="button">
                <strong>{lead.name}</strong>
                <span>
                  {formatProvider(lead.source)} · waiting{" "}
                  {minutesBetween(lead.firstMessageAt, nowIso)} min
                </span>
              </button>
              <StatusBadge status={lead.status} />
              <div className="queue-actions">
                <button
                  className="icon-button"
                  onClick={() => onEscalate(lead.id)}
                  title="Escalate"
                  type="button"
                >
                  <ArrowUpRight size={16} />
                </button>
                <button
                  className="icon-button"
                  onClick={() => onBook(lead.id)}
                  title="Mark booked"
                  type="button"
                >
                  <CheckCircle2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="wide-panel dashboard-detail-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Drill-down</p>
            <h2>{dashboardDrills[activeDrill]}</h2>
          </div>
          <button className="secondary-button" onClick={() => setActiveDrill("all")} type="button">
            <Users size={16} />
            All leads
          </button>
        </div>
        <div className="dashboard-drill-grid">
          <div className="drill-list">
            {drillRows.map((lead) => (
              <div className="drill-row" key={lead.id}>
                <button
                  className="link-button lead-name"
                  onClick={() => onSelectLead(lead.id)}
                  type="button"
                >
                  <strong>{lead.name}</strong>
                  <span>
                    {formatProvider(lead.source)} - {minutesBetween(lead.firstMessageAt, nowIso)}{" "}
                    min
                  </span>
                </button>
                <StatusBadge status={lead.status} />
                <div className="row-actions">
                  <button
                    className="icon-button"
                    onClick={() => onBook(lead.id)}
                    title="Mark booked"
                    type="button"
                  >
                    <CheckCircle2 size={16} />
                  </button>
                  <button
                    className="icon-button danger"
                    onClick={() => onLose(lead.id)}
                    title="Mark lost"
                    type="button"
                  >
                    <TrendingDown size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="trend-panel">
            <div className="mini-heading">
              <CalendarDays size={17} />
              <strong>Lead intake trend</strong>
            </div>
            <TrendBars points={trendPoints} />
          </div>
        </div>
      </section>

      <section className="split-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Channels</p>
            <h2>Source performance</h2>
          </div>
        </div>
        <div className="channel-list">
          {sourceStats.map((source) => (
            <div className="channel-row" key={source.provider}>
              <SourceBadge provider={source.provider} />
              <div className="channel-metrics">
                <span>{source.count} leads</span>
                <strong>{source.conversion}% booked</strong>
              </div>
              <div className="health-meter">
                <span style={{ width: `${Math.max(8, source.conversion)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="split-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Pipeline</p>
            <h2>Conversion funnel</h2>
          </div>
        </div>
        <div className="funnel-list">
          {funnelRows.map((row) => (
            <div className="funnel-row" key={row.status}>
              <span>{formatLeadStatus(row.status)}</span>
              <div className="bar-track ink">
                <span style={{ width: `${Math.max(8, row.percent)}%` }} />
              </div>
              <strong>{row.count}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="wide-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Operations</p>
            <h2>Team response performance</h2>
          </div>
          <span className="soft-label">{messages.length} messages this period</span>
        </div>
        <div className="data-table">
          <div className="table-head table-grid-4">
            <span>User</span>
            <span>Assigned</span>
            <span>Booked</span>
            <span>Avg response / CVR</span>
          </div>
          {teamStats.map((row) => (
            <div className="table-row table-grid-4" key={row.user.id}>
              <span>{row.user.name}</span>
              <span>{row.assigned}</span>
              <span>{row.booked}</span>
              <span>
                {row.avgResponse ? `${row.avgResponse} min` : "No replies"} / {row.conversion}%
              </span>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

function filterLeadsByRange(leads: Lead[], range: DashboardRange, nowIso: string): Lead[] {
  if (range === "all") {
    return leads;
  }

  const now = new Date(nowIso);
  const cutoff = new Date(now);
  cutoff.setUTCDate(now.getUTCDate() - (range === "7d" ? 7 : 0));
  const todayKey = toDateKey(nowIso);

  return leads.filter((lead) => {
    if (range === "today") {
      return toDateKey(lead.createdAt) === todayKey;
    }

    return new Date(lead.createdAt).getTime() >= cutoff.getTime();
  });
}

function getDashboardDrillRows(leads: Lead[], drill: DashboardDrill): Lead[] {
  const filtered = leads.filter((lead) => {
    if (drill === "all") {
      return true;
    }

    if (drill === "recovery") {
      return ["new", "unanswered", "at_risk"].includes(lead.status);
    }

    return lead.status === drill;
  });

  return filtered.toSorted((left, right) => {
    const leftUrgency = ["at_risk", "unanswered", "new"].indexOf(left.status);
    const rightUrgency = ["at_risk", "unanswered", "new"].indexOf(right.status);
    if (leftUrgency !== rightUrgency) {
      return rightUrgency - leftUrgency;
    }

    return new Date(left.firstMessageAt).getTime() - new Date(right.firstMessageAt).getTime();
  });
}

function getSourceStats(leads: Lead[]) {
  const providers = Array.from(new Set(leads.map((lead) => lead.source)));

  return providers.map((provider) => {
    const sourceLeads = leads.filter((lead) => lead.source === provider);
    const booked = sourceLeads.filter((lead) => lead.status === "booked").length;

    return {
      provider,
      count: sourceLeads.length,
      conversion: sourceLeads.length ? Math.round((booked / sourceLeads.length) * 100) : 0,
    };
  });
}

function getTrendPoints(leads: Lead[], nowIso: string) {
  const days = Array.from({ length: 5 }, (_, index) => {
    const date = new Date(nowIso);
    date.setUTCDate(date.getUTCDate() - (4 - index));
    return toDateKey(date.toISOString());
  });
  const max = Math.max(
    1,
    ...days.map((day) => leads.filter((lead) => toDateKey(lead.createdAt) === day).length),
  );

  return days.map((day) => {
    const count = leads.filter((lead) => toDateKey(lead.createdAt) === day).length;
    return {
      day,
      count,
      percent: Math.max(8, Math.round((count / max) * 100)),
    };
  });
}

function getFunnelRows(leads: Lead[]) {
  const statuses: LeadStatus[] = [
    "new",
    "unanswered",
    "at_risk",
    "in_conversation",
    "booked",
    "lost",
  ];
  const max = Math.max(
    1,
    ...statuses.map((status) => leads.filter((lead) => lead.status === status).length),
  );

  return statuses.map((status) => {
    const count = leads.filter((lead) => lead.status === status).length;
    return {
      status,
      count,
      percent: Math.round((count / max) * 100),
    };
  });
}

function getLostReasonStats(leads: Lead[]) {
  const lost = leads.filter((lead) => lead.status === "lost");
  const reasons = Array.from(new Set(lost.map((lead) => lead.lostReason ?? "not_relevant")));
  const max = Math.max(1, ...reasons.map((reason) => lost.filter((lead) => (lead.lostReason ?? "not_relevant") === reason).length));

  return reasons.map((reason) => {
    const count = lost.filter((lead) => (lead.lostReason ?? "not_relevant") === reason).length;
    return {
      reason,
      count,
      percent: Math.round((count / max) * 100),
    };
  });
}

function buildOwnerReport(leads: Lead[], messages: Message[], organization: Organization) {
  const unanswered = leads.filter((lead) => ["new", "unanswered", "at_risk"].includes(lead.status));
  const lostNoResponse = leads.filter(
    (lead) => lead.status === "lost" && lead.lostReason === "no_response",
  );
  const booked = leads.filter((lead) => lead.status === "booked").length;
  const conversion = leads.length ? Math.round((booked / leads.length) * 100) : 0;
  const topSource = getSourceStats(leads).toSorted((left, right) => right.count - left.count).at(0);

  return {
    bullets: [
      `${unanswered.length} active lead${unanswered.length === 1 ? "" : "s"} still need a human follow-up.`,
      `${formatCurrency(lostNoResponse.length * organization.averagePatientValue, organization)} is tied to no-response losses.`,
      `${topSource ? formatProvider(topSource.provider) : "No source"} drives the largest intake volume.`,
      `${conversion}% booked conversion across ${leads.length} tracked leads and ${messages.length} messages.`,
    ],
  };
}

function buildAssistantReplyOptions({
  latestInsight,
  selectedLead,
}: {
  latestInsight?: AiInsight;
  selectedLead?: Lead;
}): string[] {
  const recommendation = latestInsight?.resultJson.recommendation;
  const leadName = selectedLead?.name ?? "the patient";
  const safeReplies = [
    recommendation
      ? `${recommendation} Can I lock a time for ${leadName} now?`
      : `Thanks for reaching out. I can offer two appointment windows today for ${leadName}. Which works best?`,
    `Absolutely. I can help with this and keep it simple. Are mornings or afternoons better for you this week?`,
    `I can check availability right now. Please send the best phone number for confirmation and I will reserve the next suitable slot.`,
  ];

  return Array.from(new Set(safeReplies)).slice(0, 3);
}

function buildAssistantAnswer({
  latestInsight,
  nowIso,
  ownerReport,
  prompt,
  selectedLead,
}: {
  latestInsight?: AiInsight;
  nowIso: string;
  ownerReport: { bullets: string[] };
  prompt: string;
  selectedLead?: Lead;
}): string {
  if (!selectedLead) {
    return "Open a lead in Inbox first. Then I can draft a reply, explain risk, or summarize the case for the owner.";
  }

  const normalizedPrompt = prompt.toLowerCase();
  const waitMinutes = minutesBetween(selectedLead.firstMessageAt, nowIso);
  const riskLabel = getLeadRiskLevel(selectedLead, nowIso);
  const summary =
    latestInsight?.resultJson.summary ??
    `${selectedLead.name} is in ${formatLeadStatus(selectedLead.status).toLowerCase()} and needs a concrete next step.`;
  const recommendation =
    latestInsight?.resultJson.recommendation ??
    "Offer one specific slot, confirm phone number, and move the patient into a booked next step.";

  if (
    normalizedPrompt.includes("reply") ||
    normalizedPrompt.includes("ответ") ||
    normalizedPrompt.includes("message")
  ) {
    return `${summary} Best reply: ${recommendation}`;
  }

  if (normalizedPrompt.includes("risk") || normalizedPrompt.includes("риск")) {
    return `${selectedLead.name} is ${riskLabel} risk after ${waitMinutes} minutes since first inbound. Priority move: answer with one concrete slot and a clear confirmation ask.`;
  }

  if (
    normalizedPrompt.includes("owner") ||
    normalizedPrompt.includes("brief") ||
    normalizedPrompt.includes("summary") ||
    normalizedPrompt.includes("отчет")
  ) {
    return ownerReport.bullets[0] ?? "The clinic needs a tighter follow-up loop on open leads this week.";
  }

  return `${summary} Current recommendation: ${recommendation}`;
}

function TrendBars({
  points,
}: {
  points: { day: string; count: number; percent: number }[];
}) {
  return (
    <div className="trend-bars">
      {points.map((point) => (
        <div className="trend-bar" key={point.day}>
          <div>
            <span style={{ height: `${point.percent}%` }} />
          </div>
          <strong>{point.count}</strong>
          <small>{formatDay(point.day)}</small>
        </div>
      ))}
    </div>
  );
}

function toDateKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function formatDay(day: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
  }).format(new Date(`${day}T00:00:00.000Z`));
}

function buildWorkQueue(leads: Lead[], nowIso: string): WorkQueueItem[] {
  return leads
    .filter((lead) => ["new", "unanswered", "at_risk", "in_conversation"].includes(lead.status))
    .map((lead): WorkQueueItem => {
      const waiting = minutesBetween(lead.firstMessageAt, nowIso);
      const priority =
        lead.status === "at_risk" || waiting >= 30
          ? "critical"
          : lead.status === "unanswered" || waiting >= 10
            ? "high"
            : "normal";
      const task =
        lead.status === "in_conversation"
          ? "Follow up and move to booking"
          : lead.status === "at_risk"
            ? "Recover at-risk patient"
            : "Send first human reply";

      return {
        id: `task-${lead.id}`,
        lead,
        task,
        detail:
          lead.status === "in_conversation"
            ? "Patient has an active conversation but no booked appointment yet."
            : "Auto replies do not close SLA. A human response is required.",
        priority,
      };
    })
    .toSorted((left, right) => {
      const rank = { critical: 3, high: 2, normal: 1 };
      if (rank[left.priority] !== rank[right.priority]) {
        return rank[right.priority] - rank[left.priority];
      }

      return (
        new Date(left.lead.firstMessageAt).getTime() -
        new Date(right.lead.firstMessageAt).getTime()
      );
    });
}

function buildOperationalAlerts(
  leads: Lead[],
  integrations: Integration[],
  contracts: DataAccessContract[],
  events: AppState["integrationEvents"],
  usage: UsageLimits,
  nowIso: string,
): OperationalAlert[] {
  const alerts: OperationalAlert[] = [];
  const oldestRisk = leads
    .filter((lead) => lead.status === "at_risk")
    .toSorted(
      (left, right) =>
        new Date(left.firstMessageAt).getTime() - new Date(right.firstMessageAt).getTime(),
    )
    .at(0);
  const unanswered = leads.filter((lead) => lead.status === "unanswered" || lead.status === "new");
  const failedEvents = events.filter(
    (event) => event.status === "failed" && !isClinicDbSetupRequiredEvent(event),
  );
  const clinicContract = contracts.find((contract) => contract.provider === "clinic_database");
  const clinicDb = integrations.find((integration) => integration.provider === "clinic_database");

  if (oldestRisk) {
    alerts.push({
      id: `risk-${oldestRisk.id}`,
      title: `${oldestRisk.name} is at risk`,
      detail: `${minutesBetween(oldestRisk.firstMessageAt, nowIso)} minutes without a resolved booking path.`,
      severity: "critical",
      leadId: oldestRisk.id,
      actionLabel: "Open lead",
    });
  }

  if (unanswered.length > 0) {
    alerts.push({
      id: "unanswered-leads",
      title: `${unanswered.length} leads need a human reply`,
      detail: "Auto replies are excluded from response time and do not close SLA.",
      severity: unanswered.length > 2 ? "critical" : "warning",
      leadId: unanswered[0]?.id,
      actionLabel: "Open queue",
    });
  }

  if (clinicContract && clinicContract.status !== "approved") {
    alerts.push({
      id: "contract-approval",
      title: "Clinic DB contract is not approved",
      detail: "IT approval is required before table reads and automatic sync can run.",
      severity: "warning",
      actionLabel: "Review contract",
    });
  }

  if (clinicContract?.status === "approved" && !clinicDb?.encryptedCredentials) {
    alerts.push({
      id: "clinic-db-connection-missing",
      title: "Clinic DB connection is not saved",
      detail: "Add a read-only PostgreSQL URL in Integrations before the first sync.",
      severity: "info",
      actionLabel: "Open integrations",
    });
  }

  if (clinicDb?.status === "degraded" || failedEvents.length > 0) {
    alerts.push({
      id: "sync-health",
      title: "Data sync needs attention",
      detail: `${failedEvents.length} failed integration event${failedEvents.length === 1 ? "" : "s"} in the log.`,
      severity: "warning",
      actionLabel: "Open logs",
    });
  }

  if (usage.periodUsageJson.aiRuns / usage.monthlyAiRuns >= 0.8) {
    alerts.push({
      id: "ai-limit",
      title: "AI usage is close to the plan limit",
      detail: `${usage.periodUsageJson.aiRuns} of ${usage.monthlyAiRuns} AI runs used this period.`,
      severity: "info",
      actionLabel: "Open billing",
    });
  }

  return alerts;
}

function buildSetupSteps({
  organization,
  users,
  integrations,
  dataAccessContracts,
  subscription,
  usage,
}: {
  organization: Organization;
  users: User[];
  integrations: Integration[];
  dataAccessContracts: DataAccessContract[];
  subscription: Subscription;
  usage: UsageLimits;
}) {
  const clinicContract = dataAccessContracts.find((contract) => contract.provider === "clinic_database");
  const activeSources = integrations.filter((integration) => integration.status === "active");

  return [
    {
      id: "clinic-profile",
      title: "Clinic profile",
      detail: `${organization.timezone}, ${organization.currency}, ${formatCurrency(organization.averagePatientValue, organization)} average value.`,
      status: organization.averagePatientValue > 0 ? "complete" : "pending",
      view: "dashboard" as ViewKey,
    },
    {
      id: "team-access",
      title: "Team access",
      detail: `${users.filter((user) => user.status === "active").length} active users with clinic roles.`,
      status: users.filter((user) => user.status === "active").length >= 3 ? "complete" : "pending",
      view: "leads" as ViewKey,
    },
    {
      id: "data-contract",
      title: "IT data access approval",
      detail: clinicContract?.status === "approved" ? "Contract approved and auditable." : "Approval required before sync.",
      status: clinicContract?.status === "approved" ? "complete" : "pending",
      view: "integrations" as ViewKey,
    },
    {
      id: "data-sources",
      title: "Live data sources",
      detail: `${activeSources.length} active source${activeSources.length === 1 ? "" : "s"} connected.`,
      status: activeSources.length > 0 ? "complete" : "pending",
      view: "integrations" as ViewKey,
    },
    {
      id: "subscription",
      title: "Subscription and limits",
      detail: `${subscription.plan} plan, ${usage.periodUsageJson.messages} messages used.`,
      status: subscription.status === "active" || subscription.status === "trialing" ? "complete" : "pending",
      view: "billing" as ViewKey,
    },
  ];
}

function buildLeadTimeline(
  lead: Lead,
  conversation: Conversation,
  messages: Message[],
  statusHistory: LeadStatusHistory[],
  auditLogs: AuditLog[],
): TimelineItem[] {
  const items: TimelineItem[] = [
    {
      id: `created-${lead.id}`,
      timeIso: lead.createdAt,
      title: "Lead created",
      detail: `${formatProvider(lead.source)} created a patient record.`,
      tone: "neutral",
    },
  ];

  for (const message of messages) {
    items.push({
      id: `message-${message.id}`,
      timeIso: message.sentAt,
      title:
        message.direction === "inbound"
          ? "Inbound patient message"
          : message.senderType === "automation"
            ? "Auto reply sent"
            : "Human reply sent",
      detail: message.text,
      tone:
        message.direction === "inbound"
          ? "warning"
          : message.senderType === "automation"
            ? "neutral"
            : "success",
    });
  }

  for (const history of statusHistory.filter((item) => item.leadId === lead.id)) {
    items.push({
      id: `history-${history.id}`,
      timeIso: history.createdAt,
      title: `Status changed to ${formatLeadStatus(history.toStatus)}`,
      detail: history.reason ?? `${formatLeadStatus(history.fromStatus)} to ${formatLeadStatus(history.toStatus)}`,
      tone:
        history.toStatus === "lost"
          ? "danger"
          : history.toStatus === "booked"
            ? "success"
            : history.toStatus === "at_risk"
              ? "warning"
              : "neutral",
    });
  }

  for (const log of auditLogs.filter((item) => item.entityId === lead.id || item.entityId === conversation.id)) {
    items.push({
      id: `audit-${log.id}`,
      timeIso: log.createdAt,
      title: log.action.replaceAll("_", " "),
      detail: `${log.entityType} audit event`,
      tone: "neutral",
    });
  }

  return items.toSorted(
    (left, right) => new Date(right.timeIso).getTime() - new Date(left.timeIso).getTime(),
  );
}

function LeadsView({
  filter,
  leads,
  onBook,
  onFilterChange,
  onLose,
  onOpen,
  organization,
  userById,
}: {
  filter: LeadStatus | "all";
  leads: Lead[];
  onBook: (leadId: string) => void;
  onFilterChange: (filter: LeadStatus | "all") => void;
  onLose: (leadId: string) => void;
  onOpen: (leadId: string) => void;
  organization: Organization;
  userById: Map<string, User>;
}) {
  return (
    <section className="view-stack">
      <div className="toolbar">
        <div className="segmented-control">
          {statusFilters.map((status) => (
            <button
              className={filter === status.value ? "selected" : ""}
              key={status.value}
              onClick={() => onFilterChange(status.value)}
              type="button"
            >
              {status.label}
            </button>
          ))}
        </div>
        <div className="search-box">
          <Search size={16} />
          <span>Lead, phone, source</span>
        </div>
      </div>

      <div className="data-table lead-table">
        <div className="table-head lead-grid">
          <span>Lead</span>
          <span>Status</span>
          <span>Source</span>
          <span>Owner</span>
          <span>First reply</span>
          <span>Value</span>
          <span>Actions</span>
        </div>
        {leads.map((lead) => {
          const owner = lead.assignedTo ? userById.get(lead.assignedTo)?.name : "Unassigned";
          const responseMinutes = getLeadResponseMinutes(lead);
          return (
            <div className="table-row lead-grid" key={lead.id}>
              <button className="link-button lead-name" onClick={() => onOpen(lead.id)} type="button">
                <strong>{lead.name}</strong>
                <span>{lead.phone ?? lead.email ?? lead.providerContactId}</span>
              </button>
              <StatusBadge status={lead.status} />
              <SourceBadge provider={lead.source} />
              <span>{owner}</span>
              <span>{responseMinutes === null ? "Waiting" : `${responseMinutes} min`}</span>
              <span>{formatCurrency(lead.estimatedValue, organization)}</span>
              <div className="row-actions">
                <button
                  className="icon-button"
                  onClick={() => onBook(lead.id)}
                  title="Mark booked"
                  type="button"
                >
                  <CheckCircle2 size={16} />
                </button>
                <button
                  className="icon-button danger"
                  onClick={() => onLose(lead.id)}
                  title="Mark lost"
                  type="button"
                >
                  <TrendingDown size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function InboxView({
  auditLogs,
  conversations,
  leads,
  leadStatusHistory,
  messages,
  nowIso,
  onBook,
  onLose,
  onReply,
  onSelectLead,
  organization,
  replyText,
  selectedConversation,
  selectedLead,
  selectedMessages,
  setReplyText,
  userById,
}: {
  auditLogs: AuditLog[];
  conversations: Conversation[];
  leads: Lead[];
  leadStatusHistory: LeadStatusHistory[];
  messages: Message[];
  nowIso: string;
  onBook: (leadId: string) => void;
  onLose: (leadId: string) => void;
  onReply: (text?: string) => void;
  onSelectLead: (leadId: string) => void;
  organization: Organization;
  replyText: string;
  selectedConversation?: Conversation;
  selectedLead?: Lead;
  selectedMessages: Message[];
  setReplyText: (value: string) => void;
  userById: Map<string, User>;
}) {
  const conversationRows = conversations
    .map((conversation) => {
      const lead = leads.find((item) => item.id === conversation.leadId);
      const threadMessages = getMessagesForConversation(messages, conversation.id);
      return { conversation, lead, lastMessage: threadMessages.at(-1) };
    })
    .filter((row): row is { conversation: Conversation; lead: Lead; lastMessage: Message | undefined } =>
      Boolean(row.lead),
    )
    .toSorted(
      (left, right) =>
        new Date(right.conversation.lastMessageAt).getTime() -
        new Date(left.conversation.lastMessageAt).getTime(),
    );
  const selectedOwner = selectedLead?.assignedTo
    ? userById.get(selectedLead.assignedTo)?.name
    : "Unassigned";
  const replyableChannel =
    selectedLead?.source === "telegram" ||
    selectedLead?.source === "whatsapp" ||
    selectedLead?.source === "instagram";
  const selectedTimeline =
    selectedLead && selectedConversation
      ? buildLeadTimeline(
          selectedLead,
          selectedConversation,
          selectedMessages,
          leadStatusHistory,
          auditLogs,
        )
      : [];

  return (
    <section className="inbox-layout">
      <aside className="conversation-list" aria-label="Conversations">
        {conversationRows.map(({ conversation, lead, lastMessage }) => (
          <button
            className={`conversation-row ${
              selectedConversation?.id === conversation.id ? "active" : ""
            }`}
            key={conversation.id}
            onClick={() => onSelectLead(lead.id)}
            type="button"
          >
            <div className="conversation-meta">
              <strong>{lead.name}</strong>
              <StatusBadge status={lead.status} />
            </div>
            <span>{lastMessage?.text ?? "No messages yet"}</span>
          </button>
        ))}
      </aside>

      <section className="thread-panel">
        <div className="thread-header">
          <div>
            <p className="eyebrow">{selectedLead ? formatProvider(selectedLead.source) : "Inbox"}</p>
            <h2>{selectedLead?.name ?? "Select a conversation"}</h2>
          </div>
          {selectedLead ? <StatusBadge status={selectedLead.status} /> : null}
        </div>

        <div className="message-stream">
          {selectedMessages.map((message) => (
            <div
              className={`message-bubble ${message.direction} ${message.senderType}`}
              key={message.id}
            >
              <span>{message.senderType}</span>
              <p>{message.text}</p>
              <time>{formatTime(message.sentAt)}</time>
            </div>
          ))}
        </div>

        <div className="suggestion-row">
          {suggestedReplies.map((reply) => (
            <button
              className="suggestion-chip"
              key={reply}
              onClick={() => setReplyText(reply)}
              type="button"
            >
              <Sparkles size={14} />
              {reply}
            </button>
          ))}
        </div>

        <div className="composer">
          <textarea
            aria-label="Reply"
            disabled={!replyableChannel}
            onChange={(event) => setReplyText(event.target.value)}
            placeholder={
              replyableChannel
                ? "Write a human reply..."
                : "This source is read-only in-app. Use phone or another external follow-up path."
            }
            value={replyText}
          />
          <button
            className="primary-button"
            disabled={!replyableChannel}
            onClick={() => onReply()}
            type="button"
          >
            <Send size={17} />
            Send
          </button>
        </div>
      </section>

      <aside className="lead-inspector">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Lead card</p>
            <h2>{selectedLead?.name ?? "No lead"}</h2>
          </div>
        </div>
        {selectedLead ? (
          <>
            <div className="inspector-list">
              <InfoLine label="Assigned to" value={selectedOwner ?? "Unassigned"} />
              <InfoLine label="Source" value={formatProvider(selectedLead.source)} />
              <InfoLine
                label="Waiting"
                value={`${minutesBetween(selectedLead.firstMessageAt, nowIso)} min`}
              />
              <InfoLine
                label="Value"
                value={formatCurrency(selectedLead.estimatedValue, organization)}
              />
              <InfoLine
                label="Risk"
                value={getLeadRiskLevel(selectedLead, nowIso).toUpperCase()}
              />
            </div>
            <div className="ai-note">
              <Sparkles size={16} />
              <p>
                {selectedConversation?.aiSummary ??
                  "No summary yet. Generate one from the AI insights tab."}
              </p>
            </div>
            <div className="timeline-block">
              <div className="mini-heading">
                <Clock3 size={16} />
                <strong>Timeline</strong>
              </div>
              <div className="timeline-list">
                {selectedTimeline.slice(0, 7).map((item) => (
                  <div className={`timeline-item ${item.tone}`} key={item.id}>
                    <span>{formatCompactDateTime(item.timeIso)}</span>
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="inspector-actions">
              <button className="secondary-button" onClick={() => onBook(selectedLead.id)} type="button">
                <CheckCircle2 size={16} />
                Booked
              </button>
              <button className="secondary-button danger" onClick={() => onLose(selectedLead.id)} type="button">
                <TrendingDown size={16} />
                Lost
              </button>
            </div>
          </>
        ) : null}
      </aside>
    </section>
  );
}

function AutomationsView({
  onToggle,
  rules,
}: {
  onToggle: (ruleId: string) => void;
  rules: AutomationRule[];
}) {
  return (
    <section className="view-stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Automation</p>
          <h2>Auto replies and SLA alerts</h2>
        </div>
        <span className="soft-label">{rules.filter((rule) => rule.active).length} active</span>
      </div>
      <div className="rule-list">
        {rules.map((rule) => (
          <div className="rule-row" key={rule.id}>
            <div className="rule-icon">
              <Bot size={20} />
            </div>
            <div>
              <strong>{rule.trigger.replaceAll("_", " ")}</strong>
              <p>{rule.template}</p>
            </div>
            <button
              className="toggle-button"
              onClick={() => onToggle(rule.id)}
              title={rule.active ? "Disable rule" : "Enable rule"}
              type="button"
            >
              {rule.active ? <ToggleRight size={34} /> : <ToggleLeft size={34} />}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function IntegrationsView({
  dataAccessContracts,
  events,
  isSyncing,
  integrations,
  onApproveClinicContract,
  onRevokeClinicContract,
  onSaveClinicDbConnection,
  onSaveMessagingIntegration,
  onSetStatus,
  onSyncClinicDatabase,
}: {
  dataAccessContracts: DataAccessContract[];
  events: AppState["integrationEvents"];
  isSyncing: boolean;
  integrations: Integration[];
  onApproveClinicContract: () => void;
  onRevokeClinicContract: () => void;
  onSaveClinicDbConnection: (connectionString: string, ssl: boolean) => void;
  onSaveMessagingIntegration: (provider: MessagingProvider, payload: Record<string, unknown>) => void;
  onSetStatus: (integrationId: string, status: IntegrationStatus) => void;
  onSyncClinicDatabase: () => void;
}) {
  const [connectionString, setConnectionString] = useState("");
  const [useSsl, setUseSsl] = useState(false);
  const [telegramConfig, setTelegramConfig] = useState({
    botToken: "",
    botUsername: "",
    webhookSecret: "",
  });
  const [whatsAppConfig, setWhatsAppConfig] = useState({
    accessToken: "",
    phoneNumberId: "",
    businessAccountId: "",
    appSecret: "",
    webhookVerifyToken: "",
  });
  const [instagramConfig, setInstagramConfig] = useState({
    pageAccessToken: "",
    pageId: "",
    instagramBusinessAccountId: "",
    appSecret: "",
    webhookVerifyToken: "",
  });
  const [setupGuides, setSetupGuides] = useState<MessagingSetupGuide[]>([]);
  const sortedEvents = getVisibleIntegrationEvents(events).toSorted(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
  const clinicDb = integrations.find((integration) => integration.provider === "clinic_database");
  const telegram = integrations.find((integration) => integration.provider === "telegram");
  const whatsapp = integrations.find((integration) => integration.provider === "whatsapp");
  const instagram = integrations.find((integration) => integration.provider === "instagram");
  const clinicDbContract = dataAccessContracts.find(
    (contract) => contract.provider === "clinic_database",
  );
  const clinicDbApproved = clinicDbContract?.status === "approved";
  const clinicDbConfigured = Boolean(clinicDb?.encryptedCredentials);
  const clinicDbReadyForSync = clinicDbApproved && clinicDbConfigured;
  const telegramGuide = setupGuides.find((guide) => guide.provider === "telegram");
  const whatsappGuide = setupGuides.find((guide) => guide.provider === "whatsapp");
  const instagramGuide = setupGuides.find((guide) => guide.provider === "instagram");

  useEffect(() => {
    let cancelled = false;

    async function loadSetupGuides() {
      try {
        const response = await fetch("/api/v1/integrations/messaging/setup", {
          cache: "no-store",
        });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { guides?: MessagingSetupGuide[] };
        if (!cancelled && payload.guides) {
          setSetupGuides(payload.guides);
          const nextTelegram = payload.guides.find((guide) => guide.provider === "telegram");
          const nextWhatsApp = payload.guides.find((guide) => guide.provider === "whatsapp");
          const nextInstagram = payload.guides.find((guide) => guide.provider === "instagram");

          if (nextTelegram) {
            setTelegramConfig((current) => ({
              ...current,
              webhookSecret: current.webhookSecret || nextTelegram.verifyToken,
            }));
          }

          if (nextWhatsApp) {
            setWhatsAppConfig((current) => ({
              ...current,
              webhookVerifyToken: current.webhookVerifyToken || nextWhatsApp.verifyToken,
            }));
          }

          if (nextInstagram) {
            setInstagramConfig((current) => ({
              ...current,
              webhookVerifyToken: current.webhookVerifyToken || nextInstagram.verifyToken,
            }));
          }
        }
      } catch {
        // setup guides are helpful but should not block the rest of the integrations UI
      }
    }

    void loadSetupGuides();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="view-grid integrations-grid">
      <section className="wide-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Data sources</p>
            <h2>Live connections</h2>
          </div>
          <span className="soft-label">Read-only sync + webhooks</span>
        </div>
        <div className="integration-list">
          {integrations.map((integration) => (
            <div className="integration-row" key={integration.id}>
              <div>
                <SourceBadge provider={integration.provider} />
                <p>
                  {integration.lastSyncAt
                    ? `Last sync ${formatCompactDateTime(integration.lastSyncAt)}`
                    : integration.errorState ?? "No sync yet"}
                </p>
              </div>
              <div className="health-meter" aria-label={`${integration.healthScore}% healthy`}>
                <span style={{ width: `${integration.healthScore}%` }} />
              </div>
              <StatusDot status={integration.status} />
              {integration.provider === "clinic_database" ? (
                <button
                  className="secondary-button"
                  disabled={isSyncing || !clinicDbReadyForSync}
                  onClick={onSyncClinicDatabase}
                  title={
                    clinicDbReadyForSync
                      ? "Run Clinic DB sync"
                      : clinicDbApproved
                        ? "Save the clinic database connection first"
                        : "Approve the data access contract first"
                  }
                  type="button"
                >
                  <RefreshCw size={16} />
                  {isSyncing
                    ? "Syncing"
                    : clinicDbReadyForSync
                      ? "Sync now"
                      : clinicDbApproved
                        ? "Save connection"
                        : "Approve first"}
                </button>
              ) : integration.provider === "web_form" ? (
                <button
                  className="secondary-button"
                  onClick={() =>
                    onSetStatus(
                      integration.id,
                      integration.status === "active" ? "disconnected" : "active",
                    )
                  }
                  type="button"
                >
                  <Plug size={16} />
                  {integration.status === "active" ? "Disable webhook" : "Activate webhook"}
                </button>
              ) : integration.status === "active" ? (
                <button
                  className="secondary-button"
                  onClick={() => onSetStatus(integration.id, "disconnected")}
                  type="button"
                >
                  <Plug size={16} />
                  Pause channel
                </button>
              ) : (
                <button
                  className="secondary-button"
                  onClick={() =>
                    document
                      .getElementById(`config-${integration.provider}`)
                      ?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }
                  type="button"
                >
                  <Plug size={16} />
                  Open setup
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="wide-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Messaging APIs</p>
            <h2>Real channel credentials</h2>
          </div>
          <span className="soft-label">Telegram + Meta Cloud APIs</span>
        </div>

        <div className="channel-config-grid">
          <form
            className="channel-config-card"
            id="config-telegram"
            onSubmit={(event) => {
              event.preventDefault();
              onSaveMessagingIntegration("telegram", telegramConfig);
            }}
          >
            <div className="channel-config-head">
              <SourceBadge provider="telegram" />
              <StatusDot status={telegram?.status ?? "disconnected"} />
            </div>
            <p className="form-help">
              Uses the real Telegram Bot API and registers the webhook automatically on save.
            </p>
            {telegramGuide ? (
              <ProviderSetupGuide
                docsUrl={telegramGuide.docsUrl}
                portalLabel={telegramGuide.portalLabel}
                requiredCredentials={telegramGuide.requiredCredentials}
                steps={telegramGuide.steps}
                verifyToken={telegramGuide.verifyToken}
                webhookUrl={telegramGuide.callbackUrl}
              />
            ) : null}
            <label className="login-field">
              <span>Bot token</span>
              <input
                disabled={isSyncing}
                onChange={(event) =>
                  setTelegramConfig((current) => ({ ...current, botToken: event.target.value }))
                }
                placeholder="123456:AA..."
                type="password"
                value={telegramConfig.botToken}
              />
            </label>
            <label className="login-field">
              <span>Bot username</span>
              <input
                disabled={isSyncing}
                onChange={(event) =>
                  setTelegramConfig((current) => ({ ...current, botUsername: event.target.value }))
                }
                placeholder="@clinic_bot"
                value={telegramConfig.botUsername}
              />
            </label>
            <label className="login-field">
              <span>Webhook secret token</span>
              <input
                disabled={isSyncing}
                onChange={(event) =>
                  setTelegramConfig((current) => ({ ...current, webhookSecret: event.target.value }))
                }
                placeholder="tg_clinic_live"
                value={telegramConfig.webhookSecret}
              />
            </label>
            <button
              className="primary-button"
              disabled={isSyncing || !telegramConfig.botToken.trim() || !telegramConfig.webhookSecret.trim()}
              type="submit"
            >
              <Plug size={16} />
              Save Telegram API
            </button>
          </form>

          <form
            className="channel-config-card"
            id="config-whatsapp"
            onSubmit={(event) => {
              event.preventDefault();
              onSaveMessagingIntegration("whatsapp", whatsAppConfig);
            }}
          >
            <div className="channel-config-head">
              <SourceBadge provider="whatsapp" />
              <StatusDot status={whatsapp?.status ?? "disconnected"} />
            </div>
            <p className="form-help">
              Connects directly to WhatsApp Cloud API. Inbound messages start after webhook verification in Meta.
            </p>
            {whatsappGuide ? (
              <ProviderSetupGuide
                docsUrl={whatsappGuide.docsUrl}
                portalLabel={whatsappGuide.portalLabel}
                requiredCredentials={whatsappGuide.requiredCredentials}
                steps={whatsappGuide.steps}
                verifyToken={whatsappGuide.verifyToken}
                webhookUrl={whatsappGuide.callbackUrl}
              />
            ) : null}
            <label className="login-field">
              <span>Permanent access token</span>
              <input
                disabled={isSyncing}
                onChange={(event) =>
                  setWhatsAppConfig((current) => ({ ...current, accessToken: event.target.value }))
                }
                placeholder="EAAG..."
                type="password"
                value={whatsAppConfig.accessToken}
              />
            </label>
            <label className="login-field">
              <span>Phone number ID</span>
              <input
                disabled={isSyncing}
                onChange={(event) =>
                  setWhatsAppConfig((current) => ({ ...current, phoneNumberId: event.target.value }))
                }
                placeholder="106540352242922"
                value={whatsAppConfig.phoneNumberId}
              />
            </label>
            <label className="login-field">
              <span>WhatsApp Business account ID</span>
              <input
                disabled={isSyncing}
                onChange={(event) =>
                  setWhatsAppConfig((current) => ({ ...current, businessAccountId: event.target.value }))
                }
                placeholder="optional but recommended"
                value={whatsAppConfig.businessAccountId}
              />
            </label>
            <label className="login-field">
              <span>Meta app secret</span>
              <input
                disabled={isSyncing}
                onChange={(event) =>
                  setWhatsAppConfig((current) => ({ ...current, appSecret: event.target.value }))
                }
                placeholder="used to verify x-hub-signature-256"
                type="password"
                value={whatsAppConfig.appSecret}
              />
            </label>
            <label className="login-field">
              <span>Webhook verify token</span>
              <input
                disabled={isSyncing}
                onChange={(event) =>
                  setWhatsAppConfig((current) => ({ ...current, webhookVerifyToken: event.target.value }))
                }
                placeholder="wa_smile_studio"
                value={whatsAppConfig.webhookVerifyToken}
              />
            </label>
            <button
              className="primary-button"
              disabled={
                isSyncing ||
                !whatsAppConfig.accessToken.trim() ||
                !whatsAppConfig.phoneNumberId.trim() ||
                !whatsAppConfig.webhookVerifyToken.trim()
              }
              type="submit"
            >
              <Plug size={16} />
              Save WhatsApp API
            </button>
          </form>

          <form
            className="channel-config-card"
            id="config-instagram"
            onSubmit={(event) => {
              event.preventDefault();
              onSaveMessagingIntegration("instagram", instagramConfig);
            }}
          >
            <div className="channel-config-head">
              <SourceBadge provider="instagram" />
              <StatusDot status={instagram?.status ?? "disconnected"} />
            </div>
            <p className="form-help">
              Uses Meta Send API for Instagram DMs. Production inbound DMs require Live mode and app review.
            </p>
            {instagramGuide ? (
              <ProviderSetupGuide
                docsUrl={instagramGuide.docsUrl}
                portalLabel={instagramGuide.portalLabel}
                requiredCredentials={instagramGuide.requiredCredentials}
                steps={instagramGuide.steps}
                verifyToken={instagramGuide.verifyToken}
                webhookUrl={instagramGuide.callbackUrl}
              />
            ) : null}
            <label className="login-field">
              <span>Page access token</span>
              <input
                disabled={isSyncing}
                onChange={(event) =>
                  setInstagramConfig((current) => ({ ...current, pageAccessToken: event.target.value }))
                }
                placeholder="EAAG..."
                type="password"
                value={instagramConfig.pageAccessToken}
              />
            </label>
            <label className="login-field">
              <span>Facebook page ID</span>
              <input
                disabled={isSyncing}
                onChange={(event) =>
                  setInstagramConfig((current) => ({ ...current, pageId: event.target.value }))
                }
                placeholder="page id linked to the clinic Instagram"
                value={instagramConfig.pageId}
              />
            </label>
            <label className="login-field">
              <span>Instagram business account ID</span>
              <input
                disabled={isSyncing}
                onChange={(event) =>
                  setInstagramConfig((current) => ({
                    ...current,
                    instagramBusinessAccountId: event.target.value,
                  }))
                }
                placeholder="1784..."
                value={instagramConfig.instagramBusinessAccountId}
              />
            </label>
            <label className="login-field">
              <span>Meta app secret</span>
              <input
                disabled={isSyncing}
                onChange={(event) =>
                  setInstagramConfig((current) => ({ ...current, appSecret: event.target.value }))
                }
                placeholder="used for webhook signature verification"
                type="password"
                value={instagramConfig.appSecret}
              />
            </label>
            <label className="login-field">
              <span>Webhook verify token</span>
              <input
                disabled={isSyncing}
                onChange={(event) =>
                  setInstagramConfig((current) => ({ ...current, webhookVerifyToken: event.target.value }))
                }
                placeholder="ig_smile_studio"
                value={instagramConfig.webhookVerifyToken}
              />
            </label>
            <button
              className="primary-button"
              disabled={
                isSyncing ||
                !instagramConfig.pageAccessToken.trim() ||
                !instagramConfig.pageId.trim() ||
                !instagramConfig.webhookVerifyToken.trim()
              }
              type="submit"
            >
              <Plug size={16} />
              Save Instagram API
            </button>
          </form>
        </div>
      </section>

      <section className="queue-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Clinic DB</p>
            <h2>Data access contract</h2>
          </div>
          <ContractStatusBadge status={clinicDbContract?.status ?? "draft"} />
        </div>
        <div className="sync-contract-list">
          <InfoLine
            label="Connection"
            value={clinicDbConfigured ? "Configured for this clinic" : "Not configured"}
          />
          <InfoLine label="Mode" value="Read-only" />
          <InfoLine label="Schedule" value="Manual now, ready for 15 min job" />
          <InfoLine label="Purpose" value={clinicDbContract?.purpose ?? "Not requested"} />
          <InfoLine
            label="Tables"
            value={clinicDbContract?.tables.join(", ") ?? "No tables approved"}
          />
          <InfoLine
            label="Fields"
            value={clinicDbContract?.fields.length ? `${clinicDbContract.fields.length} mapped` : "None"}
          />
          <InfoLine
            label="PII"
            value={clinicDbContract?.piiCategories.join(", ") ?? "None"}
          />
          <InfoLine
            label="Retention"
            value={
              clinicDbContract ? `${clinicDbContract.retentionDays} days` : "Not configured"
            }
          />
          <InfoLine label="Writes to clinic DB" value="Never" />
          {clinicDbContract?.approvedAt ? (
            <InfoLine
              label="Approved by"
              value={`${clinicDbContract.approvedByEmail ?? "IT"} at ${formatCompactDateTime(
                clinicDbContract.approvedAt,
              )}`}
            />
          ) : null}
        </div>
        <form
          className="integration-config-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSaveClinicDbConnection(connectionString.trim(), useSsl);
          }}
        >
          <label className="login-field">
            <span>Read-only PostgreSQL URL</span>
            <input
              disabled={isSyncing}
              onChange={(event) => setConnectionString(event.target.value)}
              placeholder={
                clinicDbConfigured
                  ? "Connection saved. Paste a new URL to rotate credentials."
                  : "postgresql://readonly:secret@db.host:5432/clinic"
              }
              type="password"
              value={connectionString}
            />
          </label>
          <label className="integration-checkbox">
            <input
              checked={useSsl}
              disabled={isSyncing}
              onChange={(event) => setUseSsl(event.target.checked)}
              type="checkbox"
            />
            <span>Use SSL when connecting to the clinic database</span>
          </label>
          <button className="secondary-button" disabled={isSyncing || !connectionString.trim()} type="submit">
            <Plug size={16} />
            Save connection
          </button>
        </form>
        <div className="schema-preview">
          <strong>Approved field mapping</strong>
          <div className="field-chip-list">
            {(clinicDbContract?.fields ?? []).map((field) => (
              <span key={field}>{field}</span>
            ))}
          </div>
          <div className="masked-preview">
            <span>Preview</span>
            <p>external_id: clinic-***, name: M*** C***, phone: +1 *** **34, status: booked</p>
          </div>
        </div>
        <div className="contract-actions">
          {clinicDbApproved ? (
            <button className="secondary-button danger" onClick={onRevokeClinicContract} type="button">
              <FileWarning size={16} />
              Revoke
            </button>
          ) : (
            <button className="primary-button" onClick={onApproveClinicContract} type="button">
              <CheckCircle2 size={16} />
              Approve IT contract
            </button>
          )}
        </div>
      </section>

      <section className="queue-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Sync events</p>
            <h2>Processing log</h2>
          </div>
        </div>
        <div className="event-list">
          {sortedEvents.length > 0 ? (
            sortedEvents.map((event) => (
              <div className="event-row" key={event.id}>
                <strong>{event.providerEventId}</strong>
                <span>{formatIntegrationEventStatus(event)}</span>
                {event.errorMessage ? <p>{event.errorMessage}</p> : null}
              </div>
            ))
          ) : (
            <div className="event-row">
              <strong>No sync runs yet</strong>
              <span>Save a read-only Clinic DB URL, then run the first sync to populate this log.</span>
            </div>
          )}
        </div>
      </section>

      <section className="wide-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">API checklist</p>
            <h2>What you need from each provider</h2>
          </div>
        </div>
        <div className="api-checklist-grid">
          <div className="checklist-card">
            <strong>Telegram</strong>
            <span>Bot token from BotFather</span>
            <span>Webhook secret token</span>
            <span>Public HTTPS callback URL</span>
          </div>
          <div className="checklist-card">
            <strong>WhatsApp</strong>
            <span>Permanent access token</span>
            <span>Phone number ID and WABA ID</span>
            <span>App secret + verify token</span>
          </div>
          <div className="checklist-card">
            <strong>Instagram</strong>
            <span>Page access token</span>
            <span>Facebook page ID + Instagram business account ID</span>
            <span>App secret, verify token, Live mode/app review</span>
          </div>
          <div className="checklist-card">
            <strong>Universal</strong>
            <span>Stable public app URL</span>
            <span>Encrypted integration secret in platform env</span>
            <span>Owner/admin access to provider dashboards</span>
          </div>
        </div>
      </section>
    </section>
  );
}

function ProviderSetupGuide({
  docsUrl,
  portalLabel,
  requiredCredentials,
  steps,
  verifyToken,
  webhookUrl,
}: {
  docsUrl: string;
  portalLabel: string;
  requiredCredentials: string[];
  steps: string[];
  verifyToken: string;
  webhookUrl: string;
}) {
  return (
    <div className="provider-setup-guide">
      <div className="provider-setup-head">
        <strong>{portalLabel}</strong>
        <a className="docs-link" href={docsUrl} rel="noreferrer" target="_blank">
          Open docs
        </a>
      </div>
      <CopyableValue label="Callback URL" value={webhookUrl} />
      <CopyableValue label="Verify token" value={verifyToken} />
      <div className="provider-setup-list">
        <strong>What the clinic needs</strong>
        {requiredCredentials.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
      <div className="provider-setup-list">
        <strong>Self-serve steps</strong>
        {steps.map((step, index) => (
          <span key={step}>{index + 1}. {step}</span>
        ))}
      </div>
    </div>
  );
}

function CopyableValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyValue() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="copyable-value">
      <div>
        <span>{label}</span>
        <code>{value}</code>
      </div>
      <button className="secondary-button compact-button" onClick={copyValue} type="button">
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

function AiView({
  aiInsights,
  leads,
  messages,
  onGenerate,
  organization,
  selectedConversation,
  selectedLead,
  usage,
}: {
  aiInsights: AiInsight[];
  leads: Lead[];
  messages: Message[];
  onGenerate: () => void;
  organization: Organization;
  selectedConversation?: Conversation;
  selectedLead?: Lead;
  usage: UsageLimits;
}) {
  const aiUsagePercent = Math.round((usage.periodUsageJson.aiRuns / usage.monthlyAiRuns) * 100);
  const report = buildOwnerReport(leads, messages, organization);

  return (
    <section className="view-grid ai-grid">
      <section className="radar-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Assistive AI</p>
            <h2>Summary and risk detection</h2>
          </div>
          <span className="count-pill">{aiUsagePercent}% used</span>
        </div>
        <div className="ai-target">
          <Sparkles size={22} />
          <div>
            <strong>{selectedLead?.name ?? "No conversation selected"}</strong>
            <span>{selectedConversation?.providerThreadId ?? "Open an inbox thread"}</span>
          </div>
        </div>
        <button className="primary-button wide" onClick={onGenerate} type="button">
          <Sparkles size={17} />
          Generate summary
        </button>
      </section>

      <section className="queue-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Owner brief</p>
            <h2>Weekly AI report</h2>
          </div>
        </div>
        <div className="report-brief-list">
          {report.bullets.map((bullet) => (
            <div className="report-brief" key={bullet}>
              <Sparkles size={15} />
              <span>{bullet}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="wide-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Stored outputs</p>
            <h2>AI insight log</h2>
          </div>
        </div>
        <div className="insight-list">
          {aiInsights.map((insight) => (
            <div className="insight-row" key={insight.id}>
              <div>
                <strong>{insight.resultJson.summary}</strong>
                <span>
                  {insight.type.replaceAll("_", " ")} · {insight.model} ·{" "}
                  {insight.promptVersion}
                </span>
              </div>
              <div className="insight-score">
                <span>Risk</span>
                <strong>{insight.resultJson.riskScore ?? "--"}</strong>
              </div>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

function AiAssistantDock({
  aiUsage,
  assistantMessages,
  assistantOpen,
  assistantPrompt,
  latestInsight,
  onAskAssistant,
  onChangePrompt,
  onGenerate,
  onOpenInsights,
  onToggle,
  onUseReply,
  ownerReport,
  replyOptions,
  selectedConversation,
  selectedLead,
}: {
  aiUsage: UsageLimits;
  assistantMessages: Array<{ id: string; role: "assistant" | "user"; text: string }>;
  assistantOpen: boolean;
  assistantPrompt: string;
  latestInsight?: AiInsight;
  onAskAssistant: (promptOverride?: string) => void;
  onChangePrompt: (value: string) => void;
  onGenerate: () => void;
  onOpenInsights: () => void;
  onToggle: () => void;
  onUseReply: (text: string) => void;
  ownerReport: { bullets: string[] };
  replyOptions: string[];
  selectedConversation?: Conversation;
  selectedLead?: Lead;
}) {
  const aiUsagePercent = Math.min(
    100,
    Math.round((aiUsage.periodUsageJson.aiRuns / aiUsage.monthlyAiRuns) * 100),
  );
  const quickPrompts = [
    "Give me the best next reply",
    "What is the risk on this lead?",
    "Summarize this lead for the owner",
  ];

  return (
    <aside className={`ai-dock ${assistantOpen ? "open" : "closed"}`}>
      <button className="ai-dock-launcher" onClick={onToggle} type="button">
        <Bot size={18} />
        <span>{assistantOpen ? "Hide AI" : "Open AI"}</span>
        <strong>{aiUsagePercent}%</strong>
      </button>

      {assistantOpen ? (
        <div className="ai-dock-panel">
          <div className="ai-dock-head">
            <div>
              <p className="eyebrow">AI copilot</p>
              <h3>{selectedLead?.name ?? "No lead selected"}</h3>
            </div>
            <button className="secondary-button compact-button" onClick={onOpenInsights} type="button">
              <ArrowUpRight size={14} />
              AI Insights
            </button>
          </div>

          <div className="ai-dock-context">
            <span>{selectedConversation ? formatProvider(selectedConversation.provider) : "Open a thread in Inbox"}</span>
            <strong>
              {latestInsight?.resultJson.intent?.replaceAll("_", " ") ??
                latestInsight?.resultJson.summary ??
                "Generate the first summary to unlock AI guidance."}
            </strong>
          </div>

          <div className="ai-dock-actions">
            <button className="primary-button" onClick={onGenerate} type="button">
              <Sparkles size={15} />
              Refresh summary
            </button>
            {replyOptions.map((reply, index) => (
              <button
                className="secondary-button"
                key={reply}
                onClick={() => onUseReply(reply)}
                type="button"
                title={reply}
              >
                <Send size={14} />
                Reply {index + 1}
              </button>
            ))}
          </div>

          {latestInsight?.resultJson.recommendation ? (
            <div className="ai-dock-recommendation">
              <strong>Recommendation</strong>
              <p>{latestInsight.resultJson.recommendation}</p>
            </div>
          ) : null}

          <div className="ai-dock-quick-prompts">
            {quickPrompts.map((prompt) => (
              <button
                className="quick-prompt"
                key={prompt}
                onClick={() => onAskAssistant(prompt)}
                type="button"
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="ai-dock-thread">
            {assistantMessages.slice(-6).map((message) => (
              <div className={`ai-dock-message ${message.role}`} key={message.id}>
                <strong>{message.role === "assistant" ? "AI" : "You"}</strong>
                <p>{message.text}</p>
              </div>
            ))}
          </div>

          <form
            className="ai-dock-composer"
            onSubmit={(event) => {
              event.preventDefault();
              onAskAssistant();
            }}
          >
            <textarea
              onChange={(event) => onChangePrompt(event.target.value)}
              placeholder="Ask for a reply, risk summary, or owner brief..."
              rows={3}
              value={assistantPrompt}
            />
            <button className="primary-button" disabled={!assistantPrompt.trim()} type="submit">
              <Sparkles size={15} />
              Ask AI
            </button>
          </form>

          <div className="ai-dock-owner-brief">
            <strong>Owner pulse</strong>
            {ownerReport.bullets.slice(0, 2).map((bullet) => (
              <span key={bullet}>{bullet}</span>
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  );
}

function ReportsView({
  aiInsights,
  leads,
  messages,
  nowIso,
  organization,
  userById,
}: {
  aiInsights: AiInsight[];
  leads: Lead[];
  messages: Message[];
  nowIso: string;
  organization: Organization;
  userById: Map<string, User>;
}) {
  const dashboard = calculateDashboardOverview(
    { leads, organizations: [organization] },
    organization.id,
    nowIso,
  );
  const sourceStats = getSourceStats(leads);
  const lostReasons = getLostReasonStats(leads);
  const report = buildOwnerReport(leads, messages, organization);
  const teamRows = Array.from(userById.values())
    .filter((user) => user.status === "active" && user.id !== "user-super")
    .map((user) => {
      const assigned = leads.filter((lead) => lead.assignedTo === user.id);
      const waiting = assigned.filter((lead) => ["new", "unanswered", "at_risk"].includes(lead.status)).length;
      return {
        user,
        assigned: assigned.length,
        waiting,
        booked: assigned.filter((lead) => lead.status === "booked").length,
      };
    });

  return (
    <section className="view-grid reports-grid">
      <section className="wide-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Owner report</p>
            <h2>Weekly revenue recovery summary</h2>
          </div>
          <span className="soft-label">{aiInsights.length} stored AI outputs</span>
        </div>
        <div className="report-kpi-grid">
          <MetricBlock icon={Users} label="New leads" tone="neutral" value={dashboard.newLeads} />
          <MetricBlock icon={Timer} label="Avg response" tone="warning" value={`${dashboard.averageResponseMinutes} min`} />
          <MetricBlock icon={CheckCircle2} label="Booked" tone="neutral" value={dashboard.booked} />
          <MetricBlock icon={CircleDollarSign} label="Lost revenue" tone="danger" value={formatCurrency(dashboard.lostRevenue, organization)} />
        </div>
      </section>

      <section className="queue-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">AI recommendations</p>
            <h2>Next week actions</h2>
          </div>
        </div>
        <div className="report-brief-list">
          {report.bullets.map((bullet) => (
            <div className="report-brief" key={bullet}>
              <Sparkles size={15} />
              <span>{bullet}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="split-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Channels</p>
            <h2>Conversion by source</h2>
          </div>
        </div>
        <div className="channel-list">
          {sourceStats.map((source) => (
            <div className="channel-row" key={source.provider}>
              <SourceBadge provider={source.provider} />
              <div className="channel-metrics">
                <span>{source.count} leads</span>
                <strong>{source.conversion}% booked</strong>
              </div>
              <div className="health-meter">
                <span style={{ width: `${Math.max(8, source.conversion)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="split-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Losses</p>
            <h2>Lost reasons</h2>
          </div>
        </div>
        <div className="funnel-list">
          {lostReasons.map((row) => (
            <div className="funnel-row" key={row.reason}>
              <span>{row.reason.replaceAll("_", " ")}</span>
              <div className="bar-track red">
                <span style={{ width: `${Math.max(8, row.percent)}%` }} />
              </div>
              <strong>{row.count}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="wide-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Team</p>
            <h2>Manager load</h2>
          </div>
        </div>
        <div className="data-table">
          <div className="table-head table-grid-4">
            <span>User</span>
            <span>Assigned</span>
            <span>Waiting</span>
            <span>Booked</span>
          </div>
          {teamRows.map((row) => (
            <div className="table-row table-grid-4" key={row.user.id}>
              <span>{row.user.name}</span>
              <span>{row.assigned}</span>
              <span>{row.waiting}</span>
              <span>{row.booked}</span>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

function BillingView({
  integrations,
  onManageBilling,
  onPlanChange,
  organization,
  stripeBillingConfigured,
  subscription,
  usage,
}: {
  integrations: Integration[];
  onManageBilling: () => void;
  onPlanChange: (plan: Subscription["plan"]) => void;
  organization: Organization;
  stripeBillingConfigured: boolean;
  subscription: Subscription;
  usage: UsageLimits;
}) {
  const plans: Subscription["plan"][] = ["starter", "growth", "scale"];
  const activeIntegrations = integrations.filter(
    (integration) =>
      integration.organizationId === organization.id && integration.status === "active",
  ).length;
  const hasLiveStripeCustomer = Boolean(
    subscription.externalCustomerId && !subscription.externalCustomerId.startsWith("cus_demo"),
  );
  const estimatedRecoveredRevenue = organization.averagePatientValue * 8;
  const planWarnings = [
    {
      label: "Users",
      value: usage.periodUsageJson.users,
      limit: usage.maxUsers,
    },
    {
      label: "Integrations",
      value: activeIntegrations,
      limit: usage.maxIntegrations,
    },
    {
      label: "Messages",
      value: usage.periodUsageJson.messages,
      limit: usage.monthlyMessages,
    },
    {
      label: "AI runs",
      value: usage.periodUsageJson.aiRuns,
      limit: usage.monthlyAiRuns,
    },
  ];
  return (
    <section className="view-grid billing-grid">
      <section className="radar-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Revenue operating system</p>
            <h2>{getPlanCatalog(subscription.plan).label} plan</h2>
          </div>
          <StatusDot status={subscription.status === "active" ? "active" : "pending"} />
        </div>
        <div className="billing-status-card">
          <div className="billing-price-lockup">
            <strong>${getPlanCatalog(subscription.plan).monthlyPrice}/mo</strong>
            <span>
              One missed implant consult can cover the software. Typical monthly recovery target:
              {" "}
              {formatCurrency(estimatedRecoveredRevenue, organization)}
            </span>
          </div>
          <InfoLine label="Billing status" value={subscription.status} />
          <InfoLine
            label="Stripe customer"
            value={hasLiveStripeCustomer ? subscription.externalCustomerId : "Not connected"}
          />
          <InfoLine
            label="Current period"
            value={`${formatDate(subscription.currentPeriodStart)} - ${formatDate(subscription.currentPeriodEnd)}`}
          />
          <button
            className="primary-button wide"
            disabled={!stripeBillingConfigured || !hasLiveStripeCustomer}
            onClick={onManageBilling}
            type="button"
          >
            <CreditCard size={16} />
            Manage in Stripe
          </button>
          {!stripeBillingConfigured ? (
            <p className="form-help">Stripe keys and price IDs are required before live subscription actions are enabled.</p>
          ) : null}
        </div>
        <div className="usage-list">
          <UsageLine
            label="Users"
            limit={usage.maxUsers}
            value={usage.periodUsageJson.users}
          />
          <UsageLine
            label="Integrations"
            limit={usage.maxIntegrations}
            value={activeIntegrations}
          />
          <UsageLine
            label="Messages"
            limit={usage.monthlyMessages}
            value={usage.periodUsageJson.messages}
          />
          <UsageLine
            label="AI runs"
            limit={usage.monthlyAiRuns}
            value={usage.periodUsageJson.aiRuns}
          />
        </div>
      </section>

      <section className="queue-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Plan guardrails</p>
            <h2>Capacity pressure</h2>
          </div>
        </div>
        <div className="limit-alert-list">
          {planWarnings.map((item) => {
            const percent = Math.round((item.value / item.limit) * 100);
            return (
              <div className={`limit-alert ${percent >= 90 ? "danger" : percent >= 75 ? "warning" : "ok"}`} key={item.label}>
                <strong>{item.label}</strong>
                <span>{item.value.toLocaleString()} / {item.limit.toLocaleString()} used</span>
              </div>
            );
          })}
        </div>
        <div className="billing-value-note">
          <strong>Why this pricing works</strong>
          <p>
            Dental Recovery sits above reminder software. It covers lead capture, live messaging,
            SLA rescue, recovery analytics, and AI-guided front-desk execution across revenue-critical
            channels.
          </p>
        </div>
      </section>

      <section className="wide-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Plans</p>
            <h2>Packages and pricing</h2>
          </div>
        </div>
        <div className="plan-grid">
          {plans.map((plan) => {
            const limits = getPlanLimits(plan);
            const catalog = getPlanCatalog(plan);
            return (
              <div className={`plan-option ${subscription.plan === plan ? "active" : ""}`} key={plan}>
                <strong>{catalog.label}</strong>
                <div className="plan-price">${catalog.monthlyPrice}/mo</div>
                <p className="plan-summary">{catalog.summary}</p>
                <span>{limits.maxUsers} team seats</span>
                <span>{limits.maxIntegrations} live integrations</span>
                <span>{limits.monthlyMessages.toLocaleString()} monthly messages</span>
                <span>{limits.monthlyAiRuns.toLocaleString()} AI runs</span>
                <span>
                  {catalog.onboardingFee > 0
                    ? `Onboarding from $${catalog.onboardingFee}`
                    : "Launch onboarding included"}
                </span>
                <div className="plan-feature-list">
                  {catalog.included.map((item) => (
                    <small key={item}>{item}</small>
                  ))}
                </div>
                <button
                  className="secondary-button"
                  disabled={!stripeBillingConfigured || subscription.plan === plan}
                  onClick={() => onPlanChange(plan)}
                  type="button"
                >
                  <CreditCard size={16} />
                  {subscription.plan === plan ? "Current plan" : "Launch checkout"}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </section>
  );
}

function ComplianceView({
  auditLogs,
  dataAccessContracts,
  events,
  onApproveClinicContract,
  onRevokeClinicContract,
  organization,
}: {
  auditLogs: AuditLog[];
  dataAccessContracts: DataAccessContract[];
  events: AppState["integrationEvents"];
  onApproveClinicContract: () => void;
  onRevokeClinicContract: () => void;
  organization: Organization;
}) {
  const contract = dataAccessContracts.find((item) => item.provider === "clinic_database");
  const relevantAudits = auditLogs.filter(
    (log) => log.action.includes("data_access") || log.action.includes("clinic_db"),
  );
  const relevantEvents = getVisibleIntegrationEvents(events).filter(
    (event) => event.provider === "clinic_database",
  );

  return (
    <section className="view-grid compliance-grid">
      <section className="wide-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Compliance</p>
            <h2>Data transfer approval</h2>
          </div>
          <ContractStatusBadge status={contract?.status ?? "draft"} />
        </div>
        <div className="compliance-summary-grid">
          <InfoLine label="Organization" value={organization.name} />
          <InfoLine label="Provider" value={contract ? formatProvider(contract.provider) : "Clinic DB"} />
          <InfoLine label="Read-only" value={contract?.readOnly ? "Yes" : "No"} />
          <InfoLine label="Retention" value={contract ? `${contract.retentionDays} days` : "Not configured"} />
          <InfoLine label="Tables" value={contract?.tables.join(", ") ?? "None"} />
          <InfoLine label="Fields" value={contract?.fields.length ? `${contract.fields.length} allowed` : "None"} />
        </div>
        <div className="contract-actions">
          <button className="secondary-button" onClick={() => exportComplianceFile(organization, contract, relevantAudits, relevantEvents)} type="button">
            <FileWarning size={16} />
            Export JSON
          </button>
          {contract?.status === "approved" ? (
            <button className="secondary-button danger" onClick={onRevokeClinicContract} type="button">
              <FileWarning size={16} />
              Revoke
            </button>
          ) : (
            <button className="primary-button" onClick={onApproveClinicContract} type="button">
              <CheckCircle2 size={16} />
              Approve
            </button>
          )}
        </div>
      </section>

      <section className="queue-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Audit trail</p>
            <h2>Approval and sync events</h2>
          </div>
        </div>
        <div className="event-list">
          {relevantAudits.slice(0, 8).map((audit) => (
            <div className="event-row" key={audit.id}>
              <strong>{audit.action}</strong>
              <span>{formatCompactDateTime(audit.createdAt)} - {audit.actorUserId}</span>
            </div>
          ))}
          {relevantEvents.slice(0, 8).map((event) => (
            <div className="event-row" key={event.id}>
              <strong>{event.providerEventId}</strong>
              <span>{formatIntegrationEventStatus(event)}</span>
              {event.errorMessage ? <p>{event.errorMessage}</p> : null}
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

function AdminView({
  activeRole,
  auditLogs,
  dataAccessContracts,
  events,
  integrations,
  organizations,
  subscriptions,
  usageLimits,
}: {
  activeRole: Role;
  auditLogs: AuditLog[];
  dataAccessContracts: DataAccessContract[];
  events: AppState["integrationEvents"];
  integrations: Integration[];
  organizations: Organization[];
  subscriptions: Subscription[];
  usageLimits: UsageLimits[];
}) {
  if (activeRole !== "super_admin") {
    return (
      <section className="empty-state">
        <ShieldCheck size={34} />
        <h2>Super Admin only</h2>
        <p>Switch the role selector to Super Admin to inspect platform operations.</p>
      </section>
    );
  }

  return (
    <section className="view-grid admin-grid">
      <section className="wide-panel support-overview">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Support console</p>
            <h2>Platform health</h2>
          </div>
        </div>
        <div className="support-stat-grid">
          <MetricBlock icon={Users} label="Organizations" tone="neutral" value={organizations.length} />
          <MetricBlock icon={Plug} label="Active integrations" tone="neutral" value={integrations.filter((item) => item.status === "active").length} />
          <MetricBlock icon={FileWarning} label="Failed events" tone="danger" value={events.filter((item) => item.status === "failed").length} />
          <MetricBlock icon={ShieldCheck} label="Approved contracts" tone="neutral" value={dataAccessContracts.filter((item) => item.status === "approved").length} />
        </div>
      </section>

      <section className="wide-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Platform</p>
            <h2>Organizations</h2>
          </div>
        </div>
        <div className="data-table">
          <div className="table-head table-grid-4">
            <span>Organization</span>
            <span>Status</span>
            <span>Plan</span>
            <span>Integrations</span>
          </div>
          {organizations.map((organization) => {
            const subscription = subscriptions.find(
              (item) => item.organizationId === organization.id,
            );
            const connected = integrations.filter(
              (integration) =>
                integration.organizationId === organization.id &&
                integration.status === "active",
            ).length;
            return (
              <div className="table-row table-grid-4" key={organization.id}>
                <span>{organization.name}</span>
                <span>{organization.status}</span>
                <span>{subscription?.plan ?? "none"}</span>
                <span>{connected}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="queue-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Audit</p>
            <h2>Recent events</h2>
          </div>
        </div>
        <div className="event-list">
          {auditLogs.slice(0, 7).map((entry) => (
            <div className="event-row" key={entry.id}>
              <strong>{entry.action}</strong>
              <span>
                {entry.entityType} · {entry.entityId}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="queue-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Tenant usage</p>
            <h2>Plan pressure</h2>
          </div>
        </div>
        <div className="event-list">
          {usageLimits.map((usage) => (
            <div className="event-row" key={usage.id}>
              <strong>{usage.organizationId}</strong>
              <span>
                {usage.periodUsageJson.messages} messages - {usage.periodUsageJson.aiRuns} AI runs
              </span>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

function MetricBlock({
  active = false,
  icon: Icon,
  label,
  onClick,
  subtitle,
  tone,
  value,
}: {
  active?: boolean;
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  subtitle?: string;
  tone: "neutral" | "warning" | "danger";
  value: number | string;
}) {
  return (
    <button
      className={`metric-block ${tone} ${active ? "active" : ""}`}
      onClick={onClick}
      type="button"
    >
      <Icon size={18} />
      <span>{label}</span>
      <strong>{value}</strong>
      {subtitle ? <small>{subtitle}</small> : null}
    </button>
  );
}

function RadarBar({
  color,
  label,
  max,
  value,
}: {
  color: "blue" | "red" | "ink";
  label: string;
  max: number;
  value: number;
}) {
  return (
    <div className="radar-bar">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className={`bar-track ${color}`}>
        <span style={{ width: `${Math.max(8, (value / max) * 100)}%` }} />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: LeadStatus }) {
  return <span className={`status-badge ${status}`}>{formatLeadStatus(status)}</span>;
}

function SourceBadge({ provider }: { provider: Lead["source"] }) {
  return <span className={`source-badge ${provider}`}>{formatProvider(provider)}</span>;
}

function StatusDot({ status }: { status: IntegrationStatus | Subscription["status"] }) {
  return <span className={`status-dot ${status}`}>{status.replaceAll("_", " ")}</span>;
}

function ContractStatusBadge({ status }: { status: DataAccessContract["status"] }) {
  return <span className={`contract-status ${status}`}>{status.replaceAll("_", " ")}</span>;
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function UsageLine({ label, limit, value }: { label: string; limit: number; value: number }) {
  const percent = Math.min(100, Math.round((value / limit) * 100));
  return (
    <div className="usage-line">
      <div>
        <span>{label}</span>
        <strong>
          {value.toLocaleString()} / {limit.toLocaleString()}
        </strong>
      </div>
      <div className="usage-track">
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function exportComplianceFile(
  organization: Organization,
  contract: DataAccessContract | undefined,
  auditLogs: AuditLog[],
  events: AppState["integrationEvents"],
) {
  const payload = {
    exportedAt: new Date().toISOString(),
    organization: {
      id: organization.id,
      name: organization.name,
    },
    contract,
    auditLogs,
    integrationEvents: events,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${organization.id}-data-access-contract.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function isClinicDbSetupRequiredEvent(event: AppState["integrationEvents"][number]): boolean {
  const payload = event.payloadJson as { setupRequired?: unknown } | undefined;
  return event.provider === "clinic_database" && payload?.setupRequired === true;
}

function formatIntegrationEventStatus(event: AppState["integrationEvents"][number]): string {
  if (isClinicDbSetupRequiredEvent(event)) {
    return `${formatProvider(event.provider)} - setup required`;
  }

  return `${formatProvider(event.provider)} - ${event.status} - retries ${event.retryCount}`;
}

function getVisibleIntegrationEvents(
  events: AppState["integrationEvents"],
): AppState["integrationEvents"] {
  return events.filter((event) => !isClinicDbSetupRequiredEvent(event));
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function formatCompactDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
