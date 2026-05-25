export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  Bot,
  CircleDollarSign,
  Inbox,
  MessageCircle,
  Phone,
  Send,
  Users,
} from "lucide-react";
import { formatCurrency } from "@/domain/business-rules";
import type { Lead, Message, Provider } from "@/domain/types";
import { SectionBlueprintPage } from "@/features/app-shell/components/section-blueprint-page";
import { getWorkspaceShellBootstrap } from "@/features/app-shell/data/workspace-bootstrap";
import { LocalizedText } from "@/features/i18n/components/localized-text";
import type { TranslationKey } from "@/features/i18n/translations";
import { BulkActionsBar } from "@/features/inbox/components/bulk-actions-bar";
import { SlaAlertRuntime } from "@/features/inbox/components/sla-alert-runtime";
import { listInboxConversationProjections } from "@/server/inbox-projections";

const providerLabelKeys: Record<Provider, TranslationKey> = {
  clinic_database: "inbox.provider.clinicDb",
  instagram: "inbox.provider.instagram",
  telegram: "inbox.provider.telegram",
  web_form: "inbox.provider.webForm",
  whatsapp: "inbox.provider.whatsapp",
};

const statusLabelKeys: Record<Lead["status"], TranslationKey> = {
  at_risk: "inbox.status.atRisk",
  booked: "inbox.status.booked",
  in_conversation: "inbox.status.inConversation",
  lost: "inbox.status.lost",
  new: "inbox.status.new",
  unanswered: "inbox.status.unanswered",
};

const senderLabelKeys: Record<Message["senderType"], TranslationKey> = {
  automation: "inbox.sender.automation",
  manager: "inbox.sender.manager",
  patient: "inbox.sender.patient",
  system: "inbox.sender.system",
};

const responseStateLabelKeys: Record<string, TranslationKey> = {
  closed: "inbox.response.closed",
  overdue: "inbox.response.overdue",
  responded: "inbox.response.responded",
  waiting: "inbox.response.waiting",
  warning: "inbox.response.warning",
};

const riskLabelKeys: Record<string, TranslationKey> = {
  clear: "inbox.risk.clear",
  critical: "inbox.risk.critical",
  high: "inbox.risk.high",
  watch: "inbox.risk.watch",
};

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function messageTone(message: Message) {
  if (message.senderType === "automation") {
    return "automation";
  }

  return message.direction === "outbound" ? "outbound" : "inbound";
}

function deliveryStateKey(message: Message): TranslationKey {
  if (message.direction === "inbound") {
    return "inbox.delivery.received";
  }

  if (message.readAt) {
    return "inbox.delivery.read";
  }

  if (message.deliveredAt) {
    return "inbox.delivery.delivered";
  }

  return "inbox.delivery.queued";
}

function projectionRisk(input: { atRisk: boolean; responseState: string }) {
  if (input.responseState === "overdue") {
    return "critical";
  }

  if (input.atRisk || input.responseState === "warning") {
    return "high";
  }

  if (input.responseState === "responded" || input.responseState === "closed") {
    return "clear";
  }

  return "watch";
}

export default async function InboxPage() {
  const bootstrap = await getWorkspaceShellBootstrap("manager");
  const organization = bootstrap.organization;
  const leads = bootstrap.state.leads.filter(
    (lead) => lead.organizationId === organization.id,
  );
  const projections = await listInboxConversationProjections({
    organizationId: organization.id,
    state: bootstrap.state,
  });
  const conversations = bootstrap.state.conversations
    .filter((conversation) => conversation.organizationId === organization.id)
    .toSorted(
      (left, right) =>
        new Date(right.lastMessageAt).getTime() -
        new Date(left.lastMessageAt).getTime(),
    );
  const messagesByConversation = new Map(
    conversations.map((conversation) => [
      conversation.id,
      bootstrap.state.messages
        .filter((message) => message.conversationId === conversation.id)
        .toSorted(
          (left, right) =>
            new Date(left.sentAt).getTime() - new Date(right.sentAt).getTime(),
        ),
    ]),
  );
  const leadById = new Map(leads.map((lead) => [lead.id, lead]));
  const selectedProjection = projections[0];
  const selectedConversation = selectedProjection
    ? conversations.find((conversation) => conversation.id === selectedProjection.conversationId)
    : conversations[0];
  const selectedLead = selectedConversation
    ? leadById.get(selectedConversation.leadId)
    : undefined;
  const selectedMessages = selectedConversation
    ? messagesByConversation.get(selectedConversation.id) ?? []
    : [];
  const featureFlags = (bootstrap.state.featureFlags ?? []).filter(
    (flag) => flag.organizationId === organization.id,
  );
  const atRiskCount = projections.filter(
    (projection) => projection.responseState === "overdue" || projection.responseState === "warning",
  ).length;

  return (
    <SectionBlueprintPage
      description={<LocalizedText k="inbox.header.description" />}
      eyebrow={<LocalizedText k="workspace.nav.inbox" />}
      metrics={[
        {
          icon: Inbox,
          label: <LocalizedText k="inbox.metric.openThreads" />,
          value: projections.filter((projection) => projection.status === "open").length,
          subtitle: <LocalizedText k="inbox.metric.openThreadsSub" />,
        },
        {
          icon: Send,
          label: <LocalizedText k="inbox.metric.messages" />,
          value: bootstrap.state.messages.length,
          subtitle: <LocalizedText k="inbox.metric.messagesSub" />,
        },
        {
          icon: Bot,
          label: <LocalizedText k="inbox.metric.ai" />,
          value: bootstrap.state.aiInsights.length,
          subtitle: <LocalizedText k="inbox.metric.aiSub" />,
        },
        {
          icon: Users,
          label: <LocalizedText k="inbox.metric.leadsWithThreads" />,
          value: projections.length,
          subtitle: <LocalizedText k="inbox.metric.leadsWithThreadsSub" />,
        },
      ]}
      panels={[
        {
          eyebrow: <LocalizedText k="inbox.panel.systemEyebrow" />,
          title: <LocalizedText k="inbox.panel.railsTitle" />,
          items: [
            <span key="conversation-rail">
              <LocalizedText k="inbox.rail.conversation.title" /> -{" "}
              <LocalizedText k="inbox.rail.conversation.purpose" />{" "}
              <LocalizedText k="inbox.rail.conversation.contents" />
            </span>,
            <span key="thread-canvas">
              <LocalizedText k="inbox.rail.thread.title" /> -{" "}
              <LocalizedText k="inbox.rail.thread.purpose" />{" "}
              <LocalizedText k="inbox.rail.thread.contents" />
            </span>,
            <span key="context-drawer">
              <LocalizedText k="inbox.rail.context.title" /> -{" "}
              <LocalizedText k="inbox.rail.context.purpose" />{" "}
              <LocalizedText k="inbox.rail.context.contents" />
            </span>,
          ],
          wide: true,
        },
      ]}
      requiredRole="manager"
      session={bootstrap.session}
      title={<LocalizedText k="inbox.header.title" />}
    >
      <SlaAlertRuntime atRiskCount={atRiskCount} featureFlags={featureFlags} />
      {projections.length === 0 ? (
        <section className="empty-state inbox-empty-actions">
          <Inbox size={34} />
          <h2>No patient conversations yet.</h2>
          <p>
            Connect a channel or send a website-form test lead to start tracking
            response time, unanswered patients, and recoverable revenue.
          </p>
          <div className="account-workspace-actions">
            <Link className="primary-button" href="/integrations">
              Connect channel
            </Link>
            <Link className="secondary-button" href="/integrations">
              Send test lead
            </Link>
          </div>
        </section>
      ) : (
      <section className="inbox-layout">
        <aside className="queue-panel conversation-list" aria-label="Live conversations">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                <LocalizedText k="inbox.liveRail.eyebrow" />
              </p>
              <h2>
                <LocalizedText k="inbox.liveRail.title" />
              </h2>
              <p className="blueprint-copy">
                <LocalizedText k="inbox.liveRail.copy" />
              </p>
            </div>
          </div>
          {projections.map((projection) => {
            const risk = projectionRisk(projection);

            return (
              <Link
                className={`conversation-row ${
                  selectedConversation?.id === projection.conversationId ? "active" : ""
                }`}
                href={`/inbox/${projection.conversationId}`}
                key={projection.conversationId}
              >
                <div className="conversation-meta">
                  <strong>{projection.patientName}</strong>
                  <span className={`source-badge ${projection.channel}`}>
                    <LocalizedText k={providerLabelKeys[projection.channel]} />
                  </span>
                </div>
                <span>
                  {projection.lastMessagePreview || (
                    <LocalizedText k="inbox.thread.noMessages" />
                  )}
                </span>
                <div className="conversation-meta">
                  <small>
                    <LocalizedText
                      k={responseStateLabelKeys[projection.responseState] ?? "inbox.response.waiting"}
                    />
                  </small>
                  <small className={`risk-pill ${risk}`}>
                    <LocalizedText k={riskLabelKeys[risk] ?? "inbox.risk.watch"} />
                  </small>
                </div>
              </Link>
            );
          })}
          <BulkActionsBar conversationIds={projections.map((projection) => projection.conversationId)} />
        </aside>

        <article className="queue-panel thread-panel">
          <div className="thread-header">
            <div>
              <p className="eyebrow">
                <LocalizedText k="inbox.thread.eyebrow" />
              </p>
              <h2>
                {selectedLead?.name ?? <LocalizedText k="inbox.thread.emptyTitle" />}
              </h2>
              <p className="blueprint-copy">
                {selectedConversation ? (
                  <>
                    <LocalizedText k={providerLabelKeys[selectedConversation.provider]} /> -{" "}
                    {selectedConversation.providerThreadId}
                  </>
                ) : (
                  <LocalizedText k="inbox.thread.emptyCopy" />
                )}
              </p>
            </div>
            {selectedLead ? (
              <span className={`status-badge ${selectedLead.status}`}>
                <LocalizedText k={statusLabelKeys[selectedLead.status]} />
              </span>
            ) : null}
          </div>

          <div className="message-stream">
            {selectedMessages.map((message) => (
              <div
                className={`message-bubble ${messageTone(message)}`}
                key={message.id}
              >
                <span>
                  <LocalizedText k={senderLabelKeys[message.senderType]} /> -{" "}
                  <LocalizedText k={deliveryStateKey(message)} />
                </span>
                <p>{message.text}</p>
                <time>{formatTime(message.sentAt)}</time>
              </div>
            ))}
          </div>

          <div className="suggestion-row">
            <span className="suggestion-chip">
              <MessageCircle size={15} />
              <LocalizedText k="inbox.suggestion.confirmTime" />
            </span>
            <span className="suggestion-chip">
              <Phone size={15} />
              <LocalizedText k="inbox.suggestion.askPhone" />
            </span>
            <span className="suggestion-chip">
              <Bot size={15} />
              <LocalizedText k="inbox.suggestion.summarizeDentist" />
            </span>
          </div>
        </article>

        <aside className="queue-panel lead-inspector">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                <LocalizedText k="inbox.context.eyebrow" />
              </p>
              <h2>
                <LocalizedText k="inbox.context.title" />
              </h2>
              <p className="blueprint-copy">
                <LocalizedText k="inbox.context.copy" />
              </p>
            </div>
          </div>

          {selectedLead ? (
            <>
              <div className="ai-note">
                <CircleDollarSign size={18} />
                <p>
                  {formatCurrency(selectedLead.estimatedValue, organization)}{" "}
                  <LocalizedText k="inbox.context.estimatedValue" />
                </p>
              </div>
              <div className="info-line">
                <span>
                  <LocalizedText k="inbox.context.status" />
                </span>
                <strong>
                  <LocalizedText k={statusLabelKeys[selectedLead.status]} />
                </strong>
              </div>
              <div className="info-line">
                <span>
                  <LocalizedText k="inbox.context.source" />
                </span>
                <strong>
                  <LocalizedText k={providerLabelKeys[selectedLead.source]} />
                </strong>
              </div>
              <div className="info-line">
                <span>
                  <LocalizedText k="inbox.context.contact" />
                </span>
                <strong>
                  {selectedLead.phone ?? selectedLead.email ?? (
                    <LocalizedText k="inbox.context.notProvided" />
                  )}
                </strong>
              </div>
              <div className="info-line">
                <span>
                  <LocalizedText k="inbox.context.messages" />
                </span>
                <strong>{selectedMessages.length}</strong>
              </div>
              <div className="info-line">
                <span>
                  <LocalizedText k="inbox.context.delivery" />
                </span>
                <strong>
                  {selectedMessages
                    .filter((message) => message.direction === "outbound")
                    .at(-1)
                    ? (
                        <LocalizedText
                          k={deliveryStateKey(
                            selectedMessages
                              .filter((message) => message.direction === "outbound")
                              .at(-1)!,
                          )}
                        />
                      )
                    : (
                        <LocalizedText k="inbox.context.noOutbound" />
                      )}
                </strong>
              </div>
              <div className="inspector-actions">
                <Link className="secondary-button" href={`/inbox/${selectedConversation?.id}`}>
                  <LocalizedText k="inbox.action.openDetail" />
                </Link>
                <Link className="secondary-button" href="/notes">
                  <LocalizedText k="inbox.action.addNote" />
                </Link>
              </div>
            </>
          ) : (
            <section className="empty-state">
              <Inbox size={28} />
              <h2>
                <LocalizedText k="inbox.empty.title" />
              </h2>
              <p>
                <LocalizedText k="inbox.empty.copy" />
              </p>
            </section>
          )}
        </aside>
      </section>
      )}
    </SectionBlueprintPage>
  );
}

