import { addAudit } from "@/server/state-mutations";
import { ApiError } from "@/server/api-error";
import type { AppState, TeamNote } from "@/domain/types";
import type { RequestContext } from "@/server/api-helpers";
import type { TeamNoteView } from "@/features/notes/types";

const NOTE_BODY_MAX_LENGTH = 2000;

interface TeamNoteFilters {
  organizationId: string;
  conversationId?: string;
  leadId?: string;
  limit?: number;
}

function createRuntimeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeBody(body: string): string {
  const normalized = body.trim().replace(/\r\n/g, "\n");
  if (!normalized) {
    throw new ApiError(400, "note body is required", "validation_error", {
      field: "body",
    });
  }

  if (normalized.length > NOTE_BODY_MAX_LENGTH) {
    throw new ApiError(400, "note body is too long", "validation_error", {
      field: "body",
      maxLength: NOTE_BODY_MAX_LENGTH,
    });
  }

  return normalized;
}

function assertClinicSeat(state: AppState, context: RequestContext): string {
  if (!context.membership || context.membership.organizationId !== context.organizationId) {
    throw new ApiError(
      403,
      "A clinic seat membership is required to write notes",
      "clinic_seat_required",
    );
  }

  const activeMembership = state.memberships.find(
    (membership) =>
      membership.id === context.membership?.id &&
      membership.organizationId === context.organizationId &&
      membership.userId === context.userId &&
      membership.status === "active",
  );
  if (!activeMembership) {
    throw new ApiError(403, "Active clinic seat was not found", "clinic_seat_required");
  }

  return activeMembership.id;
}

export function assertNoteTarget(
  state: AppState,
  input: {
    organizationId: string;
    conversationId?: string;
    leadId?: string;
  },
) {
  if (input.conversationId) {
    const conversation = state.conversations.find(
      (item) =>
        item.id === input.conversationId &&
        item.organizationId === input.organizationId,
    );
    if (!conversation) {
      throw new ApiError(404, "Conversation was not found", "conversation_not_found");
    }

    if (input.leadId && conversation.leadId !== input.leadId) {
      throw new ApiError(400, "leadId does not match conversation", "validation_error", {
        field: "leadId",
      });
    }
  }

  if (input.leadId) {
    const lead = state.leads.find(
      (item) => item.id === input.leadId && item.organizationId === input.organizationId,
    );
    if (!lead) {
      throw new ApiError(404, "Lead was not found", "lead_not_found");
    }
  }
}

export function getTeamNotes(state: AppState, filters: TeamNoteFilters): TeamNote[] {
  const limit = Math.max(1, Math.min(filters.limit ?? 50, 100));

  return (state.teamNotes ?? [])
    .filter((note) => note.organizationId === filters.organizationId)
    .filter((note) =>
      filters.conversationId ? note.conversationId === filters.conversationId : true,
    )
    .filter((note) => (filters.leadId ? note.leadId === filters.leadId : true))
    .toSorted(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    )
    .slice(0, limit);
}

export function buildTeamNoteViews(
  state: AppState,
  notes: TeamNote[],
): TeamNoteView[] {
  const users = new Map(state.users.map((user) => [user.id, user]));
  const memberships = new Map(
    state.memberships.map((membership) => [membership.id, membership]),
  );
  const leads = new Map(state.leads.map((lead) => [lead.id, lead]));
  const conversations = new Map(
    state.conversations.map((conversation) => [conversation.id, conversation]),
  );

  return notes.map((note) => {
    const user = users.get(note.authorUserId);
    const membership = memberships.get(note.authorMembershipId);
    const lead = note.leadId ? leads.get(note.leadId) : undefined;
    const conversation = note.conversationId
      ? conversations.get(note.conversationId)
      : undefined;
    const contextLabel = lead
      ? `${lead.name} - ${lead.source.replaceAll("_", " ")}`
      : conversation
        ? `Conversation ${conversation.providerThreadId}`
        : "Workspace note";

    return {
      ...note,
      author: {
        userId: user?.id ?? note.authorUserId,
        membershipId: membership?.id ?? note.authorMembershipId,
        name: user?.name ?? "Unknown teammate",
        email: user?.email ?? "unknown",
        avatar: user?.avatar ?? "",
        role: membership?.role ?? "manager",
      },
      context: {
        label: contextLabel,
        href: note.conversationId ? `/inbox/${note.conversationId}` : undefined,
      },
    };
  });
}

export function createTeamNote(
  state: AppState,
  input: {
    context: RequestContext;
    organizationId: string;
    conversationId?: string;
    leadId?: string;
    body: string;
    nowIso?: string;
  },
): AppState {
  const authorMembershipId = assertClinicSeat(state, input.context);
  const conversation = input.conversationId
    ? state.conversations.find(
        (item) =>
          item.id === input.conversationId &&
          item.organizationId === input.organizationId,
      )
    : undefined;
  const resolvedLeadId = input.leadId ?? conversation?.leadId;
  assertNoteTarget(state, { ...input, leadId: resolvedLeadId });

  const nowIso = input.nowIso ?? new Date().toISOString();
  const note: TeamNote = {
    id: createRuntimeId("note"),
    organizationId: input.organizationId,
    conversationId: input.conversationId,
    leadId: resolvedLeadId,
    authorUserId: input.context.userId,
    authorMembershipId,
    body: normalizeBody(input.body),
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const nextState: AppState = {
    ...state,
    teamNotes: [note, ...(state.teamNotes ?? [])],
  };

  return addAudit(nextState, {
    organizationId: input.organizationId,
    actorUserId: input.context.userId,
    action: "team_note.created",
    entityType: "team_note",
    entityId: note.id,
    metadataJson: {
      authorMembershipId,
      conversationId: note.conversationId,
      leadId: note.leadId,
    },
  });
}
