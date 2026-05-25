export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  CircleDollarSign,
  Clock,
  Inbox,
  Send,
} from "lucide-react";
import { formatCurrency } from "@/domain/business-rules";
import type { Lead, Message, Provider } from "@/domain/types";
import { SectionBlueprintPage } from "@/features/app-shell/components/section-blueprint-page";
import { getWorkspaceShellBootstrap } from "@/features/app-shell/data/workspace-bootstrap";
import { LocalizedText } from "@/features/i18n/components/localized-text";
import type { TranslationKey } from "@/features/i18n/translations";
import { ReplyComposer } from "@/features/inbox/components/reply-composer";
import { ConversationOpsPanel } from "@/features/inbox/components/conversation-ops-panel";
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

  const payloadDeliveryState =
    typeof message.payloadJson?.deliveryState === "string"
      ? message.payloadJson.deliveryState
      : undefined;

  if (payloadDeliveryState === "pending_outbox") {
    return "inbox.delivery.pendingOutbox";
  }

  if (message.readAt) {
    return "inbox.delivery.read";
  }

  if (message.deliveredAt) {
    return "inbox.delivery.delivered";
  }

  return "inbox.delivery.queued";
}

function responseCopyKey(responseState?: string): TranslationKey {
  if (responseState === "overdue") {
    return "inbox.response.copy.overdue";
  }

  if (responseState === "warning") {
    return "inbox.response.copy.warning";
  }

  if (responseState === "responded") {
    return "inbox.response.copy.responded";
  }

  if (responseState === "closed") {
    return "inbox.response.copy.closed";
  }

  return "inbox.response.copy.waiting";
}

export default async function InboxConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const bootstrap = await getWorkspaceShellBootstrap("manager");
  const organization = bootstrap.organization;
  const { conversationId } = await params;
  const conversation = bootstrap.state.conversations.find(
    (item) =>
      item.id === conversationId && item.organizationId === organization.id,
  );

  if (!conversation) {
    notFound();
  }

  const lead = bootstrap.state.leads.find(
    (item) => item.id === conversation.leadId && item.organizationId === organization.id,
  );

  if (!lead) {
    notFound();
  }

  const projections = await listInboxConversationProjections({
    organizationId: organization.id,
    state: bootstrap.state,
  });
  const projection = projections.find(
    (item) => item.conversationId === conversation.id,
  );
  const messages = bootstrap.state.messages
    .filter((message) => message.conversationId === conversation.id)
    .toSorted(
      (left, right) =>
        new Date(left.sentAt).getTime() - new Date(right.sentAt).getTime(),
    );
  const outboundMessages = messages.filter(
    (message) => message.direction === "outbound",
  );
  const lastOutbound = outboundMessages.at(-1);
  const staff = bootstrap.state.memberships
    .filter(
      (membership) =>
        membership.organizationId === organization.id &&
        membership.status === "active" &&
        membership.role !== "super_admin",
    )
    .map((membership) => bootstrap.state.users.find((user) => user.id === membership.userId))
    .filter((user): user is NonNullable<typeof user> => Boolean(user));
  const teamNotes = bootstrap.state.teamNotes.filter(
    (note) => note.conversationId === conversation.id || note.leadId === lead.id,
  );
  const reminders = (bootstrap.state.conversationReminders ?? []).filter(
    (reminder) => reminder.conversationId === conversation.id,
  );
  const templates = (bootstrap.state.replyTemplates ?? []).filter(
    (template) => template.organizationId === organization.id,
  );
  const featureFlags = (bootstrap.state.featureFlags ?? []).filter(
    (flag) => flag.organizationId === organization.id,
  );
  const suggestedReplyKeys: TranslationKey[] = [
    "inbox.detail.suggestedReply1",
    "inbox.detail.suggestedReply2",
    "inbox.detail.suggestedReply3",
  ];
  const responseStateKey =
    responseStateLabelKeys[projection?.responseState ?? ""] ?? "inbox.response.waiting";

  return (
    <SectionBlueprintPage
      description={<LocalizedText k="inbox.detail.description" />}
      eyebrow={<LocalizedText k="inbox.detail.eyebrow" />}
      metrics={[
        {
          icon: Inbox,
          label: <LocalizedText k="inbox.detail.metric.threadStatus" />,
          value: <LocalizedText k={responseStateKey} />,
          subtitle: <LocalizedText k="inbox.detail.metric.currentState" />,
        },
        {
          icon: Send,
          label: <LocalizedText k="inbox.context.messages" />,
          value: messages.length,
          subtitle: <LocalizedText k="inbox.detail.metric.timeline" />,
        },
        {
          icon: Clock,
          label: <LocalizedText k="inbox.detail.metric.sla" />,
          value: <LocalizedText k={responseStateKey} />,
          subtitle: <LocalizedText k={responseCopyKey(projection?.responseState)} />,
        },
        {
          icon: CircleDollarSign,
          label: <LocalizedText k="inbox.detail.metric.valueAtStake" />,
          value: formatCurrency(lead.estimatedValue, organization),
          subtitle: <LocalizedText k="inbox.detail.metric.recoveredRevenue" />,
        },
      ]}
      panels={[
        {
          eyebrow: <LocalizedText k="inbox.detail.panel.eyebrow" />,
          title: <LocalizedText k="inbox.detail.panel.title" />,
          items: [
            <LocalizedText key="confirm" k="inbox.detail.panel.confirm" />,
            <LocalizedText key="value" k="inbox.detail.panel.value" />,
            <LocalizedText key="queue" k="inbox.detail.panel.queue" />,
          ],
          wide: true,
        },
      ]}
      requiredRole="manager"
      session={bootstrap.session}
      title={lead.name}
    >
      <div className="detail-toolbar">
        <Link className="secondary-button compact-button" href="/inbox">
          <ArrowLeft size={15} />
          <LocalizedText k="inbox.action.back" />
        </Link>
        <span className={`status-badge ${lead.status}`}>
          <LocalizedText k={statusLabelKeys[lead.status]} />
        </span>
      </div>

      <section className="inbox-layout detail-inbox-layout">
        <article className="queue-panel thread-panel">
          <div className="thread-header">
            <div>
              <p className="eyebrow">
                <LocalizedText k="inbox.detail.patientThread" />
              </p>
              <h2>{lead.name}</h2>
              <p className="blueprint-copy">
                <LocalizedText k={providerLabelKeys[conversation.provider]} /> -{" "}
                {conversation.providerThreadId}
              </p>
            </div>
            <span className={`source-badge ${conversation.provider}`}>
              <LocalizedText k={providerLabelKeys[conversation.provider]} />
            </span>
          </div>

          <div className="compact-alert">
            <Bot size={17} />
            <p>
              <LocalizedText k={responseCopyKey(projection?.responseState)} />
            </p>
          </div>

          <div className="message-stream" aria-label={`${lead.name} message timeline`}>
            {messages.map((message) => (
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

          <ReplyComposer
            conversationId={conversation.id}
            lastOutboundMessage={lastOutbound}
            patientName={lead.name}
            suggestedReplyKeys={suggestedReplyKeys}
            templates={templates}
          />
        </article>

        <aside className="queue-panel lead-inspector detail-lead-inspector">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                <LocalizedText k="inbox.context.title" />
              </p>
              <h2>
                <LocalizedText k="inbox.detail.card.title" />
              </h2>
              <p className="blueprint-copy">
                <LocalizedText k="inbox.detail.card.copy" />
              </p>
            </div>
          </div>

          <div className="ai-note">
            <CircleDollarSign size={18} />
            <p>
              {formatCurrency(lead.estimatedValue, organization)}{" "}
              <LocalizedText k="inbox.detail.card.estimatedValue" />
            </p>
          </div>

          <div className="info-line">
            <span>
              <LocalizedText k="inbox.context.status" />
            </span>
            <strong>
              <LocalizedText k={statusLabelKeys[lead.status]} />
            </strong>
          </div>
          <div className="info-line">
            <span>
              <LocalizedText k="inbox.context.contact" />
            </span>
            <strong>
              {lead.phone ?? lead.email ?? <LocalizedText k="inbox.context.notProvided" />}
            </strong>
          </div>
          <div className="info-line">
            <span>
              <LocalizedText k="inbox.context.source" />
            </span>
            <strong>
              <LocalizedText k={providerLabelKeys[lead.source]} />
            </strong>
          </div>
          <div className="info-line">
            <span>
              <LocalizedText k="inbox.context.firstMessage" />
            </span>
            <strong>{formatTime(lead.firstMessageAt)}</strong>
          </div>
          <div className="info-line">
            <span>
              <LocalizedText k="inbox.context.lastOutbound" />
            </span>
            <strong>
              {lastOutbound ? (
                <LocalizedText k={deliveryStateKey(lastOutbound)} />
              ) : (
                <LocalizedText k="inbox.context.noOutbound" />
              )}
            </strong>
          </div>
          <div className="info-line">
            <span>
              <LocalizedText k="inbox.context.aiBoundary" />
            </span>
            <strong>
              <LocalizedText k="inbox.context.suggestOnly" />
            </strong>
          </div>

          <div className="compact-alert neutral">
            <Bot size={17} />
            <p>
              <LocalizedText k="inbox.context.aiBoundaryCopy" />
            </p>
          </div>

          <ConversationOpsPanel
            assignedTo={lead.assignedTo}
            conversationId={conversation.id}
            featureFlags={featureFlags}
            leadId={lead.id}
            reminders={reminders}
            staff={staff}
            templates={templates}
            teamNotes={teamNotes}
          />

          <div className="ops-mini-list">
            <strong>Internal notes</strong>
            {teamNotes.length > 0 ? (
              teamNotes.slice(0, 4).map((note) => (
                <span key={note.id}>{note.body}</span>
              ))
            ) : (
              <span>No staff notes yet.</span>
            )}
          </div>
        </aside>
      </section>
    </SectionBlueprintPage>
  );
}
