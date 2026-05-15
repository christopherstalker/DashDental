import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Inbox,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  UserRound,
  Zap,
} from "lucide-react";
import {
  canAccess,
  formatCurrency,
  getLeadRiskLevel,
  getSubscriptionAccessStatus,
  getSubscriptionDaysRemaining,
  isSubscriptionAccessActive,
  minutesBetween,
} from "@/domain/business-rules";
import type { Lead, Provider, Subscription } from "@/domain/types";
import { getWorkspaceShellBootstrap } from "@/features/app-shell/data/workspace-bootstrap";
import {
  LocalizedBillingCalendarStatus,
  LocalizedCalendarMonth,
  LocalizedChannelLeakageMeta,
  LocalizedCompactDateTime,
  LocalizedInboxPreviewMeta,
  LocalizedLeadStatus,
  LocalizedOwnerBriefLine,
  LocalizedPatientQueueMeta,
  LocalizedProviderName,
  LocalizedRiskLabel,
  LocalizedWeekday,
  type OwnerBriefItem,
} from "@/features/dashboard/components/localized-dashboard-fragments";
import {
  RecoveryCockpit,
  type CockpitMetric,
  type CockpitQueueRow,
} from "@/features/dashboard/components/recovery-cockpit";
import { LocalizedText } from "@/features/i18n/components/localized-text";

const providerOrder: Provider[] = ["telegram", "web_form", "instagram", "whatsapp"];
const riskRank = {
  critical: 4,
  high: 3,
  watch: 2,
  clear: 1,
} as const;

export default async function DashboardPage() {
  const bootstrap = await getWorkspaceShellBootstrap("manager");
  const hasAccess = bootstrap.session ? canAccess("manager", bootstrap.session.role) : false;

  if (!hasAccess) {
    return <WorkspaceAccessRequired requiredRole="manager" />;
  }

  const nowIso = new Date().toISOString();
  const organization = bootstrap.organization;
  const leads = bootstrap.state.leads.filter(
    (lead) => lead.organizationId === organization.id,
  );
  const conversations = bootstrap.state.conversations.filter(
    (conversation) => conversation.organizationId === organization.id,
  );
  const messagesByConversation = new Map(
    conversations.map((conversation) => [
      conversation.id,
      bootstrap.state.messages.filter((message) => message.conversationId === conversation.id),
    ]),
  );
  const activeIntegrations = bootstrap.state.integrations.filter(
    (integration) =>
      integration.organizationId === organization.id && integration.status === "active",
  );
  const degradedIntegrations = bootstrap.state.integrations.filter(
    (integration) =>
      integration.organizationId === organization.id &&
      (integration.status === "degraded" || integration.status === "disconnected"),
  );

  const triageLeads = leads
    .map((lead) => {
      const risk = getLeadRiskLevel(lead, nowIso);
      const conversation = conversations.find((item) => item.leadId === lead.id);
      const messageCount = conversation
        ? messagesByConversation.get(conversation.id)?.length ?? 0
        : 0;

      return {
        lead,
        risk,
        waitingMinutes: minutesBetween(lead.firstMessageAt, nowIso),
        messageCount,
      };
    })
    .filter(
      (item) =>
        item.risk !== "clear" &&
        item.lead.status !== "booked" &&
        item.lead.status !== "lost",
    )
    .toSorted(
      (left, right) =>
        riskRank[right.risk] - riskRank[left.risk] ||
        right.lead.estimatedValue - left.lead.estimatedValue ||
        right.waitingMinutes - left.waitingMinutes,
    );

  const recoverableRevenue = triageLeads.reduce(
    (sum, item) => sum + item.lead.estimatedValue,
    0,
  );
  const bookedLeads = leads
    .filter((lead) => lead.status === "booked")
    .toSorted(
      (left, right) =>
        new Date(right.bookedAt ?? right.updatedAt).getTime() -
        new Date(left.bookedAt ?? left.updatedAt).getTime(),
  );
  const savedRevenue = bookedLeads.reduce((sum, lead) => sum + lead.estimatedValue, 0);
  const firstName = bootstrap.session?.user.name.split(" ")[0] ?? "team";
  const recentInbox = conversations
    .toSorted(
      (left, right) =>
        new Date(right.lastMessageAt).getTime() - new Date(left.lastMessageAt).getTime(),
    )
    .slice(0, 4)
    .map((conversation) => {
      const lead = leads.find((item) => item.id === conversation.leadId);

      return {
        conversation,
        lead,
        messages: messagesByConversation.get(conversation.id)?.length ?? 0,
      };
    });
  const sourceRows = providerOrder.map((provider) => {
    const sourceLeads = leads.filter((lead) => lead.source === provider);
    const booked = sourceLeads.filter((lead) => lead.status === "booked").length;
    const atRisk = sourceLeads.filter(
      (lead) => getLeadRiskLevel(lead, nowIso) !== "clear" && lead.status !== "lost",
    ).length;
    const noResponseLoss = sourceLeads.filter(
      (lead) => lead.status === "lost" && lead.lostReason === "no_response",
    ).length;

    return {
      provider,
      total: sourceLeads.length,
      booked,
      atRisk,
      conversion: sourceLeads.length ? Math.round((booked / sourceLeads.length) * 100) : 0,
      lostRevenue: noResponseLoss * organization.averagePatientValue,
    };
  });
  const topLeak = sourceRows
    .toSorted(
      (left, right) =>
        right.lostRevenue - left.lostRevenue || right.atRisk - left.atRisk,
    )
    .at(0);
  const ownerBrief = buildOwnerBrief({
    atRisk: bootstrap.overview.atRisk,
    recoverableRevenue: formatCurrency(recoverableRevenue, organization),
    topLeak,
    unanswered: bootstrap.overview.unanswered,
  });
  const calendar = buildScheduleCalendar({
    bookedLeads,
    hasWorkspaceAccess: bootstrap.billing.hasWorkspaceAccess,
    nowIso,
    subscription: bootstrap.subscription,
    timeZone: organization.timezone,
  });

  const dashboardMetrics: CockpitMetric[] = [
    {
      helper: "Estimated treatment opportunity, not a booking promise",
      label: "Money at risk today",
      tone: "risk",
      value: formatCurrency(recoverableRevenue, organization),
    },
    {
      helper: "Waiting across active patient channels",
      label: "Unanswered patients",
      tone: "warning",
      value: String(bootstrap.overview.unanswered),
    },
    {
      helper: "Current first-response average",
      label: "Avg first response",
      tone: "default",
      value: `${bootstrap.overview.averageResponseMinutes}m`,
    },
    {
      helper: "Marked booked or protected this month",
      label: "Recovered conversations",
      tone: "success",
      value: String(bookedLeads.length),
    },
    {
      helper: "Connected or monitored intake channels",
      label: "Active channels",
      tone: "active",
      value: String(activeIntegrations.length),
    },
  ];

  const dashboardQueueRows: CockpitQueueRow[] = triageLeads.slice(0, 4).map((item) => ({
    action: "Review the thread, confirm the safest callback path, and offer appointment options.",
    channel: providerDisplayName(item.lead.source),
    draft:
      "Thanks for reaching out. Our front desk can help with booking options today. Can you confirm the best callback number and preferred time?",
    excerpt: "I would like to book a visit and understand the next available options.",
    initials: patientInitials(item.lead.name),
    intent: recoveryIntentLabel(item.lead),
    riskReason:
      item.risk === "critical"
        ? "High-priority patient message is outside the clinic response target."
        : "Unanswered patient intent is visible in the recovery queue before it goes cold.",
    status: item.risk === "critical" ? "Needs staff reply" : "AI draft ready",
    urgency: riskDisplayName(item.risk),
    value: formatCurrency(item.lead.estimatedValue, organization),
    waiting: formatWaiting(item.waitingMinutes),
  }));

  if (dashboardMetrics.length >= 0) {
    return (
      <RecoveryCockpit
        activeChannels={String(activeIntegrations.length)}
        ctaHref="/inbox"
        ctaLabel="Open inbox"
        embedded
        metrics={dashboardMetrics}
        queueRows={dashboardQueueRows}
        userLabel={`${firstName} · ${bootstrap.session?.role ?? "manager"}`}
        workspaceName={organization.name}
      />
    );
  }

  return (
    <section className="premium-dashboard">
      <header className="clinic-console-header">
        <div className="clinic-console-title">
          <div className="clinic-kicker">
            <LocalizedText k="dashboard.hero.kicker" />
          </div>
          <h1>
            <LocalizedText k="workspace.nav.dashboard" />
          </h1>
          <p className="clinic-console-summary">
            <LocalizedText k="dashboard.hero.greeting" /> {firstName}{" - "}
            {organization.name}{" - "}
            {triageLeads.length}{" "}
            {triageLeads.length === 1 ? (
              <LocalizedText k="dashboard.hero.patientSingular" />
            ) : (
              <LocalizedText k="dashboard.hero.patientPlural" />
            )}{" "}
            <LocalizedText k="dashboard.hero.waiting" />{" - "}
            {formatCurrency(recoverableRevenue, organization)}
          </p>
        </div>
        <div className="clinic-console-actions">
          <Link className="clinic-primary-action" href="/inbox">
            <Inbox size={17} />
            <LocalizedText k="dashboard.hero.openInbox" />
          </Link>
          <Link className="clinic-secondary-action" href="/queue">
            <Zap size={17} />
            <LocalizedText k="dashboard.hero.triageQueue" />
          </Link>
        </div>
      </header>

      <section className="clinic-metric-strip">
        <MetricPill
          icon={<AlertTriangle size={17} />}
          label={<LocalizedText k="dashboard.metric.revenueAtRisk" />}
          subtitle={<LocalizedText k="dashboard.metric.revenueAtRiskSub" />}
          tone="danger"
          value={formatCurrency(recoverableRevenue, organization)}
        />
        <MetricPill
          icon={<CircleDollarSign size={17} />}
          label={<LocalizedText k="dashboard.metric.recovered" />}
          subtitle={<LocalizedText k="dashboard.metric.recoveredSub" />}
          tone="success"
          value={formatCurrency(savedRevenue, organization)}
        />
        <MetricPill
          icon={<Inbox size={17} />}
          label={<LocalizedText k="dashboard.metric.unanswered" />}
          subtitle={<LocalizedText k="dashboard.metric.unansweredSub" />}
          tone="warning"
          value={bootstrap.overview.unanswered}
        />
        <MetricPill
          icon={<Clock3 size={17} />}
          label={<LocalizedText k="dashboard.metric.avgResponse" />}
          subtitle={<LocalizedText k="dashboard.metric.avgResponseSub" />}
          tone="neutral"
          value={
            <>
              {bootstrap.overview.averageResponseMinutes}{" "}
              <LocalizedText k="dashboard.unit.minuteShort" />
            </>
          }
        />
        <MetricPill
          icon={<CheckCircle2 size={17} />}
          label={<LocalizedText k="dashboard.metric.bookedRate" />}
          subtitle={<LocalizedText k="dashboard.metric.bookedRateSub" />}
          tone="neutral"
          value={bookedLeads.length}
        />
      </section>

      <section className="clinic-dashboard-grid">
        <div className="clinic-main-column">
          <section className="clinic-two-column">
            <article className="premium-panel patient-list-panel">
              <PanelTitle
                action={<LocalizedText k="dashboard.panel.today" />}
                kicker={<LocalizedText k="dashboard.panel.recoverNow" />}
                title={<LocalizedText k="dashboard.panel.patientQueue" />}
              />
              <div className="premium-list">
                {triageLeads.slice(0, 5).map((item) => (
                  <PatientQueueRow
                    key={item.lead.id}
                    lead={item.lead}
                    messageCount={item.messageCount}
                    organizationCurrency={formatCurrency(item.lead.estimatedValue, organization)}
                    risk={item.risk}
                    waitingMinutes={item.waitingMinutes}
                  />
                ))}
                {triageLeads.length === 0 ? (
                  <div className="empty-premium-row">
                    <CheckCircle2 size={18} />
                    <span>
                      <LocalizedText k="dashboard.empty.noSla" />
                    </span>
                  </div>
                ) : null}
              </div>
            </article>

            <article className="premium-panel consult-panel">
              <PanelTitle
                action={<LocalizedText k="dashboard.panel.aiAssisted" />}
                kicker={<LocalizedText k="dashboard.panel.nextBestAction" />}
                title={<LocalizedText k="dashboard.panel.consultation" />}
              />
              <div className="consult-profile">
                <PatientAvatar name={triageLeads[0]?.lead.name ?? "Patient"} tone="blue" />
                <div>
                  <strong>
                    {triageLeads[0]?.lead.name ?? (
                      <LocalizedText k="dashboard.consult.noUrgent" />
                    )}
                  </strong>
                  <span>
                    {triageLeads[0]
                      ? (
                          <>
                            <LocalizedProviderName provider={triageLeads[0].lead.source} />{" - "}
                            <LocalizedLeadStatus status={triageLeads[0].lead.status} />
                          </>
                        )
                      : <LocalizedText k="dashboard.consult.inboxCalm" />}
                  </span>
                </div>
              </div>
              <div className="consult-tags">
                <span>
                  <LocalizedText k="dashboard.consult.implant" />
                </span>
                <span>
                  <LocalizedText k="dashboard.consult.highIntent" />
                </span>
                <span>
                  <LocalizedText k="dashboard.consult.slaWatched" />
                </span>
              </div>
              <dl className="consult-decision-list">
                <div>
                  <dt>
                    <LocalizedText k="dashboard.consult.observation" />
                  </dt>
                  <dd>
                    <LocalizedOwnerBriefLine item={ownerBrief[0]} />
                  </dd>
                </div>
                <div>
                  <dt>
                    <LocalizedText k="dashboard.consult.replyAngle" />
                  </dt>
                  <dd>
                    <LocalizedText k="dashboard.consult.replyCopy" />
                  </dd>
                </div>
                <div>
                  <dt>
                    <LocalizedText k="dashboard.consult.value" />
                  </dt>
                  <dd>
                    {triageLeads[0]
                      ? formatCurrency(triageLeads[0].lead.estimatedValue, organization)
                      : <LocalizedText k="dashboard.consult.noRevenue" />}
                  </dd>
                </div>
              </dl>
            </article>
          </section>

          <section className="premium-panel channel-leakage-panel">
            <PanelTitle
              action={
                <>
                  {activeIntegrations.length}{" "}
                  <LocalizedText k="dashboard.health.activeChannels" />
                </>
              }
              kicker={<LocalizedText k="dashboard.panel.revenueRadar" />}
              title={<LocalizedText k="dashboard.panel.channelLeakage" />}
            />
            <div className="premium-channel-list">
              {sourceRows.map((row) => (
                <div className="premium-channel-row" key={row.provider}>
                  <div>
                    <strong>
                      <LocalizedProviderName provider={row.provider} />
                    </strong>
                    <LocalizedChannelLeakageMeta
                      atRisk={row.atRisk}
                      lostRevenue={formatCurrency(row.lostRevenue, organization)}
                      total={row.total}
                    />
                  </div>
                  <div className="premium-channel-meter">
                    <span style={{ width: `${Math.max(7, row.conversion)}%` }} />
                  </div>
                  <b>{row.conversion}%</b>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="clinic-side-column">
          <section className="premium-panel schedule-panel">
            <PanelTitle
              action={<LocalizedCalendarMonth month={calendar.month} year={calendar.year} />}
              kicker={<LocalizedText k="dashboard.panel.calendar" />}
              title={<LocalizedText k="dashboard.panel.schedule" />}
            />
            <div className="premium-calendar">
              {calendar.weekdays.map((weekday) => (
                <span className="weekday" key={weekday}>
                  <LocalizedWeekday weekdayIndex={weekday} />
                </span>
              ))}
              {calendar.leadingBlanks.map((key) => (
                <span aria-hidden="true" className="empty" key={key} />
              ))}
              {calendar.days.map((day) => (
                <span
                  className={[
                    day.isToday ? "today" : "",
                    day.isBooked ? "booked" : "",
                    day.isPeriodEnd ? "period-end" : "",
                    day.isAfterPeriod ? "after-period" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={day.key}
                >
                  {day.day}
                </span>
              ))}
            </div>
            <div className={`billing-calendar-status ${calendar.accessActive ? "active" : "locked"}`}>
              <LocalizedBillingCalendarStatus
                accessActive={calendar.accessActive}
                daysRemaining={calendar.daysRemaining}
                hasSubscription={calendar.hasSubscription}
                periodEndIso={calendar.periodEndIso}
                subscriptionActive={calendar.subscriptionActive}
                subscriptionTrialActive={calendar.subscriptionTrialActive}
              />
            </div>
            <div className="upcoming-visits">
              {bookedLeads.slice(0, 2).map((lead) => (
                <div className="upcoming-visit" key={lead.id}>
                  <CalendarDays size={17} />
                  <div>
                    <strong>{lead.name}</strong>
                    <LocalizedCompactDateTime iso={lead.bookedAt ?? lead.updatedAt} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="premium-panel ai-note-panel">
            <PanelTitle
              action="v1"
              kicker={<LocalizedText k="dashboard.panel.dentistNotes" />}
              title={<LocalizedText k="dashboard.panel.aiBrief" />}
            />
            <div className="ai-note-illustration">
              <Sparkles size={22} />
              <span />
            </div>
            <div className="ai-note-list">
              {ownerBrief.slice(1).map((item) => (
                <p key={item.type}>
                  <LocalizedOwnerBriefLine item={item} />
                </p>
              ))}
            </div>
          </section>

          <section className="premium-panel live-pulse-panel">
            <PanelTitle
              action={<LocalizedText k="dashboard.panel.live" />}
              kicker={<LocalizedText k="dashboard.panel.systemPulse" />}
              title={<LocalizedText k="dashboard.panel.inboxHealth" />}
            />
            <div className="connection-checks premium-checks">
              <ConnectionCheck
                label={
                  <>
                    {activeIntegrations.length}{" "}
                    <LocalizedText k="dashboard.health.activeChannels" />
                  </>
                }
                ok={activeIntegrations.length > 0}
              />
              <ConnectionCheck
                label={
                  <>
                    {degradedIntegrations.length}{" "}
                    <LocalizedText k="dashboard.health.providerIssues" />
                  </>
                }
                ok={degradedIntegrations.length === 0}
              />
              <ConnectionCheck
                label={
                  <>
                    {bootstrap.summary.openConversations}{" "}
                    <LocalizedText k="dashboard.health.openThreads" />
                  </>
                }
                ok={bootstrap.summary.openConversations >= 0}
              />
            </div>
            <div className="premium-inbox-preview">
              {recentInbox.map((item) => (
                <div className="inbox-preview-row" key={item.conversation.id}>
                  <MessageCircle size={16} />
                  <div>
                    <strong>
                      {item.lead?.name ?? <LocalizedText k="dashboard.inbox.unknownPatient" />}
                    </strong>
                    <LocalizedInboxPreviewMeta
                      messageCount={item.messages}
                      provider={item.conversation.provider}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </section>
  );
}

function WorkspaceAccessRequired({ requiredRole }: { requiredRole: string }) {
  return (
    <section className="view-grid">
      <header className="topbar blueprint-topbar">
        <div>
          <p className="eyebrow">
            <LocalizedText k="workspace.sidebar.readiness" />
          </p>
          <h1>
            <LocalizedText k="dashboard.access.title" />
          </h1>
          <p className="blueprint-copy">
            <LocalizedText k="dashboard.access.copy" />
          </p>
        </div>
      </header>
      <section className="empty-state">
        <ShieldCheck size={34} />
        <h2>
          <LocalizedText k="dashboard.access.requires" /> {requiredRole}
        </h2>
        <p>
          <LocalizedText k="dashboard.access.body" />
        </p>
        <Link className="primary-button" href="/">
          <LocalizedText k="dashboard.access.goLogin" />
        </Link>
      </section>
    </section>
  );
}

function MetricPill({
  icon,
  label,
  subtitle,
  tone,
  value,
}: {
  icon: ReactNode;
  label: ReactNode;
  subtitle?: ReactNode;
  tone: "danger" | "neutral" | "success" | "warning";
  value: ReactNode;
}) {
  return (
    <article className={`clinic-metric-card ${tone}`}>
      <div>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      {subtitle ? <small>{subtitle}</small> : null}
    </article>
  );
}

function PanelTitle({
  action,
  kicker,
  title,
}: {
  action: ReactNode;
  kicker: ReactNode;
  title: ReactNode;
}) {
  return (
    <div className="premium-panel-title">
      <div>
        <p className="clinic-kicker">{kicker}</p>
        <h2>{title}</h2>
      </div>
      <span>{action}</span>
    </div>
  );
}

function PatientQueueRow({
  lead,
  messageCount,
  organizationCurrency,
  risk,
  waitingMinutes,
}: {
  lead: Lead;
  messageCount: number;
  organizationCurrency: string;
  risk: "clear" | "watch" | "high" | "critical";
  waitingMinutes: number;
}) {
  return (
    <div className={`premium-patient-row ${risk}`}>
      <PatientAvatar name={lead.name} tone={risk === "critical" ? "rose" : "blue"} />
      <div className="premium-patient-copy">
        <strong>{lead.name}</strong>
        <LocalizedPatientQueueMeta
          messageCount={messageCount}
          provider={lead.source}
          waitingMinutes={waitingMinutes}
        />
      </div>
      <div className="patient-row-value">
        <b>{organizationCurrency}</b>
        <small>
          <LocalizedRiskLabel risk={risk} />
        </small>
      </div>
    </div>
  );
}

function PatientAvatar({ name, tone }: { name: string; tone: "blue" | "rose" }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase())
    .join("");

  return (
    <span className={`premium-avatar ${tone}`}>
      {initials || <UserRound size={15} />}
    </span>
  );
}

function ConnectionCheck({ label, ok }: { label: ReactNode; ok: boolean }) {
  return (
    <div className={`connection-check ${ok ? "ok" : "warn"}`}>
      {ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
      <span>{label}</span>
    </div>
  );
}

function patientInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((chunk) => chunk[0]?.toUpperCase())
      .join("") || "PT"
  );
}

function providerDisplayName(provider: Provider) {
  const names: Record<Provider, string> = {
    clinic_database: "Clinic DB",
    instagram: "Instagram",
    telegram: "Telegram",
    web_form: "Website form",
    whatsapp: "WhatsApp",
  };

  return names[provider];
}

function recoveryIntentLabel(lead: Lead) {
  if (lead.estimatedValue >= 1200) return "Implant or cosmetic consult";
  if (lead.estimatedValue >= 400) return "Emergency or treatment inquiry";
  if (lead.source === "instagram") return "Cosmetic pricing";
  if (lead.source === "telegram") return "Follow-up inquiry";
  return "Patient booking request";
}

function riskDisplayName(risk: "clear" | "watch" | "high" | "critical") {
  const names = {
    clear: "Clear",
    critical: "High urgency",
    high: "High value",
    watch: "Medium",
  } as const;

  return names[risk];
}

function formatWaiting(waitingMinutes: number) {
  if (waitingMinutes < 60) return `${waitingMinutes}m waiting`;

  const hours = Math.floor(waitingMinutes / 60);
  const minutes = waitingMinutes % 60;

  return minutes ? `${hours}h ${minutes}m waiting` : `${hours}h waiting`;
}

function buildOwnerBrief({
  atRisk,
  recoverableRevenue,
  topLeak,
  unanswered,
}: {
  atRisk: number;
  recoverableRevenue: string;
  topLeak?: {
    provider: Provider;
    lostRevenue: number;
    atRisk: number;
  };
  unanswered: number;
}): OwnerBriefItem[] {
  return [
    { count: unanswered, type: "unanswered" },
    { count: atRisk, type: "pastSla" },
    { provider: topLeak?.provider, type: "channel" },
    { type: "value", value: recoverableRevenue },
  ];
}

function buildScheduleCalendar({
  bookedLeads,
  hasWorkspaceAccess,
  nowIso,
  subscription,
  timeZone,
}: {
  bookedLeads: Lead[];
  hasWorkspaceAccess: boolean;
  nowIso: string;
  subscription: Subscription | null;
  timeZone: string;
}) {
  const safeTimeZone = timeZone || "UTC";
  const today = getZonedDateParts(nowIso, safeTimeZone);
  const daysInMonth = new Date(Date.UTC(today.year, today.month, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(today.year, today.month - 1, 1)).getUTCDay();
  const bookedDateKeys = new Set(
    bookedLeads
      .map((lead) => lead.bookedAt ?? lead.updatedAt)
      .map((iso) => getZonedDateKey(iso, safeTimeZone)),
  );
  const periodEndKey = subscription
    ? getZonedDateKey(
        new Date(Date.parse(subscription.currentPeriodEnd) - 1).toISOString(),
        safeTimeZone,
      )
    : "";
  const subscriptionActive = isSubscriptionAccessActive(subscription, nowIso);
  const subscriptionStatus = getSubscriptionAccessStatus(subscription, nowIso);
  const subscriptionTrialActive = subscriptionActive && subscriptionStatus === "trialing";
  const accessActive = hasWorkspaceAccess;
  const daysRemaining = getSubscriptionDaysRemaining(subscription, nowIso);

  return {
    accessActive,
    days: Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const key = toDateKey(today.year, today.month, day);
      const isAfterPeriod = Boolean(periodEndKey && key > periodEndKey);

      return {
        day,
        isAfterPeriod,
        isBooked: bookedDateKeys.has(key),
        isPeriodEnd: key === periodEndKey,
        isToday: key === toDateKey(today.year, today.month, today.day),
        key,
      };
    }),
    daysRemaining,
    hasSubscription: Boolean(subscription),
    leadingBlanks: Array.from({ length: firstWeekday }, (_, index) => `blank-${index}`),
    month: today.month,
    periodEndIso: subscription?.currentPeriodEnd ?? "",
    subscriptionActive,
    subscriptionTrialActive,
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    year: today.year,
  };
}

function getZonedDateParts(iso: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(new Date(iso));

  return {
    day: Number(parts.find((part) => part.type === "day")?.value ?? "1"),
    month: Number(parts.find((part) => part.type === "month")?.value ?? "1"),
    year: Number(parts.find((part) => part.type === "year")?.value ?? "1970"),
  };
}

function getZonedDateKey(iso: string, timeZone: string) {
  const parts = getZonedDateParts(iso, timeZone);

  return toDateKey(parts.year, parts.month, parts.day);
}

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
