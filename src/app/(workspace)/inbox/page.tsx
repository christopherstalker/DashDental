export const dynamic = "force-dynamic";

import {
  RedesignedInbox,
  type InboxHistoryItem,
  type InboxThread,
} from "@/components/inbox/redesigned-inbox";
import type { AppState, Lead, Provider } from "@/domain/types";
import { SlaAlertRuntime } from "@/features/inbox/components/sla-alert-runtime";
import { getWorkspaceShellBootstrap } from "@/features/app-shell/data/workspace-bootstrap";
import { listInboxConversationProjections } from "@/server/inbox-projections";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function responseState(
  value: "closed" | "overdue" | "responded" | "waiting" | "warning",
): InboxThread["responseState"] {
  if (value === "overdue") {
    return "alert";
  }

  if (value === "warning") {
    return "warm";
  }

  if (value === "responded" || value === "closed") {
    return "ok";
  }

  return "info";
}

function statusLabel(input: {
  leadStage: Lead["status"];
  responseState: "closed" | "overdue" | "responded" | "waiting" | "warning";
}): string {
  if (input.leadStage === "booked") {
    return "Booked";
  }

  if (input.leadStage === "lost") {
    return "Lost";
  }

  const labels = {
    closed: "Closed",
    overdue: "SLA overdue",
    responded: "Responded",
    waiting: "Waiting",
    warning: "SLA warning",
  } satisfies Record<typeof input.responseState, string>;

  return labels[input.responseState];
}

function providerLabel(provider: Provider): string {
  const labels: Record<Provider, string> = {
    clinic_database: "Clinic DB",
    instagram: "Instagram",
    telegram: "Telegram",
    web_form: "Web",
    whatsapp: "WhatsApp",
  };

  return labels[provider];
}

function patientMatches(left: Lead, right: Lead): boolean {
  if (left.phone && right.phone && left.phone === right.phone) {
    return true;
  }

  if (left.providerContactId && right.providerContactId && left.providerContactId === right.providerContactId) {
    return true;
  }

  return left.name.trim().toLowerCase() === right.name.trim().toLowerCase();
}

function buildPatientHistory(
  state: AppState,
  lead: Lead,
): { history: InboxHistoryItem[]; lastAppointment?: string; returningPatient: boolean } {
  const relatedLeads = state.leads.filter(
    (item) => item.organizationId === lead.organizationId && patientMatches(item, lead),
  );
  const relatedLeadIds = new Set(relatedLeads.map((item) => item.id));
  const history = state.conversations
    .filter((conversation) => relatedLeadIds.has(conversation.leadId))
    .map((conversation) => {
      const relatedLead = relatedLeads.find((item) => item.id === conversation.leadId);
      const lastMessage = state.messages
        .filter((message) => message.conversationId === conversation.id)
        .toSorted(
          (left, right) =>
            new Date(right.sentAt).getTime() - new Date(left.sentAt).getTime(),
        )
        .at(0);

      return {
        channel: conversation.provider,
        date: conversation.lastMessageAt,
        id: conversation.id,
        preview:
          lastMessage?.text ??
          `${providerLabel(conversation.provider)} conversation for ${relatedLead?.name ?? "patient"}`,
      };
    })
    .toSorted(
      (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime(),
    );
  const lastAppointment = relatedLeads
    .map((item) => item.bookedAt)
    .filter((value): value is string => Boolean(value))
    .toSorted((left, right) => new Date(right).getTime() - new Date(left).getTime())
    .at(0);

  return {
    history,
    lastAppointment,
    returningPatient: history.length > 1,
  };
}

export default async function InboxPage() {
  const bootstrap = await getWorkspaceShellBootstrap("manager");
  const organization = bootstrap.organization;
  const projections = await listInboxConversationProjections({
    organizationId: organization.id,
    state: bootstrap.state,
  });
  const usersById = new Map(bootstrap.state.users.map((user) => [user.id, user]));
  const staff = bootstrap.state.memberships
    .filter(
      (membership) =>
        membership.organizationId === organization.id &&
        membership.status === "active" &&
        membership.role !== "super_admin",
    )
    .map((membership) => usersById.get(membership.userId))
    .filter((user): user is NonNullable<typeof user> => Boolean(user))
    .map((user) => ({
      id: user.id,
      initials: initials(user.name),
      name: user.name,
    }));
  const templates = bootstrap.state.replyTemplates
    .filter((template) => template.organizationId === organization.id)
    .map((template) => ({
      body: template.body,
      category: template.category,
      id: template.id,
      title: template.title,
    }));
  const threads = projections.reduce<InboxThread[]>((accumulator, projection) => {
      const conversation = bootstrap.state.conversations.find(
        (item) => item.id === projection.conversationId,
      );
      const lead = bootstrap.state.leads.find((item) => item.id === projection.leadId);

      if (!conversation || !lead) {
        return accumulator;
      }

      const assignee = projection.assignedTo ? usersById.get(projection.assignedTo) : undefined;
      const notes = bootstrap.state.teamNotes
        .filter((note) => note.conversationId === conversation.id || note.leadId === lead.id)
        .toSorted(
          (left, right) =>
            new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
        )
        .map((note) => ({
          authorName: usersById.get(note.authorUserId)?.name ?? "Clinic team",
          body: note.body,
          createdAt: note.createdAt,
          id: note.id,
        }));
      const messages = bootstrap.state.messages
        .filter((message) => message.conversationId === conversation.id)
        .toSorted(
          (left, right) =>
            new Date(left.sentAt).getTime() - new Date(right.sentAt).getTime(),
        )
        .map((message) => ({
          direction: message.direction,
          id: message.id,
          senderType: message.senderType,
          sentAt: message.sentAt,
          text: message.text,
        }));
      const patientHistory = buildPatientHistory(bootstrap.state, lead);
      const snoozed = bootstrap.state.conversationReminders.some(
        (reminder) =>
          reminder.conversationId === conversation.id && reminder.status === "scheduled",
      );

      accumulator.push({
        assignedInitials: assignee ? initials(assignee.name) : undefined,
        assignedName: assignee?.name,
        assignedTo: projection.assignedTo,
        channel: projection.channel,
        estimatedValue: projection.estimatedValue,
        history: patientHistory.history,
        id: projection.conversationId,
        lastAppointment: patientHistory.lastAppointment,
        lastMessageAt: projection.lastMessageAt,
        leadId: projection.leadId,
        messages,
        notes,
        patientName: projection.patientName,
        patientPhone: projection.patientPhone,
        preview: projection.lastMessagePreview || projection.lastMessageText,
        responseState: responseState(projection.responseState),
        returningPatient: patientHistory.returningPatient,
        snoozed,
        statusLabel: statusLabel({
          leadStage: projection.leadStage,
          responseState: projection.responseState,
        }),
        unreadCount: projection.unreadCount,
      });

      return accumulator;
    }, []);
  const featureFlags = bootstrap.state.featureFlags.filter(
    (flag) => flag.organizationId === organization.id,
  );
  const atRiskCount = threads.filter(
    (thread) => thread.responseState === "alert" || thread.responseState === "warm",
  ).length;

  return (
    <>
      <SlaAlertRuntime atRiskCount={atRiskCount} featureFlags={featureFlags} />
      <RedesignedInbox
        currentUserId={bootstrap.session?.user.id}
        initialThreads={threads}
        teamMembers={staff}
        templates={templates}
      />
    </>
  );
}
