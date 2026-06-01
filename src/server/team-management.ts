import { getPlanLimits } from "@/domain/business-rules";
import type { AppState, Membership, Role, User } from "@/domain/types";
import { ApiError } from "./api-error";
import { mutateAppState } from "./data-store";
import { captureError } from "./observability";
import { addAudit } from "./state-mutations";
import {
  createTeamInviteInState,
  markInviteEmailDelivery,
  sendTeamInviteEmail,
  type CreatedTeamInvite,
  type TeamInviteEmailDelivery,
} from "./team-invites";

type TeamRole = Exclude<Role, "super_admin">;

function createRuntimeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function sanitizeAvatar(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((chunk) => chunk[0]?.toUpperCase() ?? "")
      .join("") || "DR"
  );
}

function isSeatConsuming(status: Membership["status"]): boolean {
  return status === "active" || status === "invited";
}

function countUsedSeats(state: AppState, organizationId: string): number {
  return state.memberships.filter(
    (membership) =>
      membership.organizationId === organizationId && isSeatConsuming(membership.status),
  ).length;
}

function getSeatLimit(state: AppState, organizationId: string): number {
  const usage = state.usageLimits.find((item) => item.organizationId === organizationId);
  if (usage) {
    return usage.maxUsers;
  }

  const subscription = state.subscriptions.find((item) => item.organizationId === organizationId);
  return getPlanLimits(subscription?.plan ?? "starter").maxUsers;
}

function syncUsageUsers(state: AppState, organizationId: string): AppState {
  const users = countUsedSeats(state, organizationId);

  return {
    ...state,
    usageLimits: state.usageLimits.map((usage) =>
      usage.organizationId === organizationId
        ? {
            ...usage,
            periodUsageJson: {
              ...usage.periodUsageJson,
              users,
            },
          }
        : usage,
    ),
  };
}

function assertTeamRole(role: Role): TeamRole {
  if (role === "super_admin") {
    throw new ApiError(400, "Clinic team members cannot be super admins", "validation_error", {
      field: "role",
    });
  }

  return role;
}

export async function createClinicTeamMember(input: {
  actorUserId: string;
  actorRole: Role;
  email: string;
  name: string;
  organizationId: string;
  requestUrl: string;
  role: Role;
}): Promise<{ inviteDelivery?: TeamInviteEmailDelivery; state: AppState }> {
  const email = normalizeEmail(input.email);
  const name = input.name.trim();
  const role = assertTeamRole(input.role);

  if (name.length < 2) {
    throw new ApiError(400, "name is required", "validation_error", { field: "name" });
  }

  if (!email.includes("@")) {
    throw new ApiError(400, "email must be valid", "validation_error", { field: "email" });
  }

  if (role === "owner" && input.actorRole !== "owner" && input.actorRole !== "super_admin") {
    throw new ApiError(403, "Only owners can add another owner", "forbidden");
  }

  let createdInvite: CreatedTeamInvite | undefined;
  let inviteClinicName = "";

  const state = await mutateAppState((current) => {
    const organization = current.organizations.find((item) => item.id === input.organizationId);
    if (!organization) {
      throw new ApiError(404, "Organization was not found", "organization_not_found");
    }

    const existingUser = current.users.find((user) => user.email.toLowerCase() === email);
    const existingMembership = existingUser
      ? current.memberships.find(
          (membership) =>
            membership.organizationId === input.organizationId &&
            membership.userId === existingUser.id,
        )
      : undefined;

    if (existingMembership && isSeatConsuming(existingMembership.status)) {
      throw new ApiError(409, "This user already has a seat in the clinic", "seat_conflict", {
        email,
      });
    }

    const usedSeats = countUsedSeats(current, input.organizationId);
    const maxSeats = getSeatLimit(current, input.organizationId);
    if (usedSeats >= maxSeats) {
      throw new ApiError(409, "Seat limit reached for this plan", "seat_limit_reached", {
        usedSeats,
        maxSeats,
      });
    }

    const targetUserId = existingUser?.id ?? createRuntimeId("user");
    const isRegisteredUser = existingUser?.status === "active";
    const nextUser: User = existingUser
      ? {
          ...existingUser,
          name,
          avatar: sanitizeAvatar(name),
          status: existingUser.status === "disabled" ? "invited" : existingUser.status,
        }
      : {
          id: targetUserId,
          email,
          name,
          avatar: sanitizeAvatar(name),
          status: "invited",
          lastLoginAt: "",
          sessionVersion: 0,
        };
    const membershipStatus: Membership["status"] = isRegisteredUser ? "active" : "invited";
    const nextMembership: Membership = existingMembership
      ? {
          ...existingMembership,
          role,
          status: membershipStatus,
          invitedBy: input.actorUserId,
        }
      : {
          id: createRuntimeId("mem"),
          userId: targetUserId,
          organizationId: input.organizationId,
          role,
          status: membershipStatus,
          invitedBy: input.actorUserId,
        };

    let nextState: AppState = {
      ...current,
      users: existingUser
        ? current.users.map((user) => (user.id === existingUser.id ? nextUser : user))
        : [...current.users, nextUser],
      memberships: existingMembership
        ? current.memberships.map((membership) =>
            membership.id === existingMembership.id ? nextMembership : membership,
          )
        : [...current.memberships, nextMembership],
    };

    nextState = syncUsageUsers(nextState, input.organizationId);
    nextState = addAudit(nextState, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: existingMembership ? "team.member_reinvited" : "team.member_invited",
      entityType: "membership",
      entityId: nextMembership.id,
      metadataJson: {
        email,
        role,
        status: nextMembership.status,
        seatCount: countUsedSeats(nextState, input.organizationId),
      },
    });

    if (nextMembership.status === "invited") {
      const inviteResult = createTeamInviteInState(nextState, {
        actorUserId: input.actorUserId,
        email,
        membershipId: nextMembership.id,
        organizationId: input.organizationId,
        requestUrl: input.requestUrl,
        role,
      });
      createdInvite = inviteResult.invite;
      inviteClinicName = organization.name;
      nextState = inviteResult.state;
    }

    return nextState;
  });

  if (!createdInvite) {
    return { state };
  }

  try {
    const delivery = await sendTeamInviteEmail({
      clinicName: inviteClinicName,
      email,
      inviteUrl: createdInvite.inviteUrl,
      role,
    });
    const deliveryState = await markInviteEmailDelivery({
      error: delivery.error,
      inviteId: createdInvite.invite.id,
      status: delivery.status,
    });

    return {
      inviteDelivery: {
        devInviteUrl: delivery.status === "skipped" ? createdInvite.inviteUrl : undefined,
        error: delivery.error,
        status: delivery.status,
      },
      state: deliveryState,
    };
  } catch (error) {
    const captured = captureError(error, {
      inviteId: createdInvite.invite.id,
      operation: "team.invite.email_delivery",
    });
    const message = "Invite email delivery failed.";
    const deliveryState = await markInviteEmailDelivery({
      error: captured.id,
      inviteId: createdInvite.invite.id,
      status: "failed",
    });

    return {
      inviteDelivery: {
        error: message,
        status: "failed",
      },
      state: deliveryState,
    };
  }
}

export async function deactivateClinicTeamMember(input: {
  actorUserId: string;
  actorRole: Role;
  membershipId: string;
  organizationId: string;
}): Promise<AppState> {
  return mutateAppState((current) => {
    const membership = current.memberships.find(
      (item) =>
        item.id === input.membershipId && item.organizationId === input.organizationId,
    );
    if (!membership) {
      throw new ApiError(404, "Membership was not found", "membership_not_found");
    }

    if (membership.userId === input.actorUserId) {
      throw new ApiError(409, "You cannot deactivate your own seat", "self_deactivate_blocked");
    }

    if (membership.role === "owner" && input.actorRole !== "owner" && input.actorRole !== "super_admin") {
      throw new ApiError(403, "Only owners can deactivate owner seats", "forbidden");
    }

    const activeOwners = current.memberships.filter(
      (item) =>
        item.organizationId === input.organizationId &&
        item.role === "owner" &&
        item.status === "active",
    );
    if (membership.role === "owner" && activeOwners.length <= 1) {
      throw new ApiError(409, "At least one active owner is required", "last_owner_blocked");
    }

    let nextState: AppState = {
      ...current,
      memberships: current.memberships.map((item) =>
        item.id === membership.id
          ? {
              ...item,
              status: "disabled",
            }
          : item,
      ),
    };
    const hasOtherActiveMembership = nextState.memberships.some(
      (item) => item.userId === membership.userId && item.status === "active",
    );

    if (!hasOtherActiveMembership) {
      nextState = {
        ...nextState,
        users: nextState.users.map((user) =>
          user.id === membership.userId
            ? {
                ...user,
                status: "disabled",
              }
            : user,
        ),
      };
    }

    nextState = syncUsageUsers(nextState, input.organizationId);
    nextState = addAudit(nextState, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "team.member_deactivated",
      entityType: "membership",
      entityId: membership.id,
      metadataJson: {
        userId: membership.userId,
        role: membership.role,
        seatCount: countUsedSeats(nextState, input.organizationId),
      },
    });

    return nextState;
  });
}
