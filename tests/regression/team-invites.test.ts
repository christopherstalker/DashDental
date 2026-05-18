import assert from "node:assert/strict";
import test from "node:test";
import type { AppState } from "../../src/domain/types";
import { createEmptyAppState } from "../../src/domain/empty-app-state";
import {
  acceptTeamInviteInState,
  createTeamInviteInState,
  getTeamInvitePreview,
} from "../../src/server/team-invites";

function invitedState(): AppState {
  return {
    ...createEmptyAppState(),
    organizations: [
      {
        id: "org-invite",
        name: "Invite Dental",
        timezone: "Europe/Kiev",
        currency: "USD",
        averagePatientValue: 500,
        businessHours: {
          start: "09:00",
          end: "18:00",
          weekdays: [1, 2, 3, 4, 5],
        },
        status: "active",
      },
    ],
    users: [
      {
        id: "user-invited",
        avatar: "IN",
        email: "invitee@example.com",
        lastLoginAt: "",
        name: "Invited User",
        status: "invited",
      },
    ],
    memberships: [
      {
        id: "mem-invited",
        organizationId: "org-invite",
        role: "manager",
        status: "invited",
        userId: "user-invited",
      },
    ],
  };
}

test("valid invite preview and acceptance activate user and membership", () => {
  const created = createTeamInviteInState(invitedState(), {
    email: "invitee@example.com",
    membershipId: "mem-invited",
    organizationId: "org-invite",
    requestUrl: "https://app.example/team",
    role: "manager",
    nowIso: "2026-05-18T10:00:00.000Z",
  });

  const preview = getTeamInvitePreview(
    created.state,
    created.invite.token,
    "2026-05-18T10:01:00.000Z",
  );
  assert.equal(preview.status, "valid");
  assert.equal(preview.email, "invitee@example.com");

  const accepted = acceptTeamInviteInState(created.state, {
    name: "Nadia Frontdesk",
    nowIso: "2026-05-18T10:02:00.000Z",
    token: created.invite.token,
  });
  assert.equal(accepted.userId, "user-invited");
  assert.equal(
    accepted.state.users.find((user) => user.id === "user-invited")?.status,
    "active",
  );
  assert.equal(
    accepted.state.memberships.find((membership) => membership.id === "mem-invited")
      ?.status,
    "active",
  );
  assert.ok(accepted.state.inviteTokens?.[0]?.acceptedAt);
});

test("expired invite cannot be accepted", () => {
  const created = createTeamInviteInState(invitedState(), {
    email: "invitee@example.com",
    membershipId: "mem-invited",
    organizationId: "org-invite",
    requestUrl: "https://app.example/team",
    role: "manager",
    nowIso: "2026-05-01T10:00:00.000Z",
  });

  assert.equal(
    getTeamInvitePreview(created.state, created.invite.token, "2026-05-20T10:00:00.000Z")
      .status,
    "expired",
  );
  assert.throws(
    () =>
      acceptTeamInviteInState(created.state, {
        name: "Nadia Frontdesk",
        nowIso: "2026-05-20T10:00:00.000Z",
        token: created.invite.token,
      }),
    /expired/i,
  );
});

test("used invite cannot be accepted twice", () => {
  const created = createTeamInviteInState(invitedState(), {
    email: "invitee@example.com",
    membershipId: "mem-invited",
    organizationId: "org-invite",
    requestUrl: "https://app.example/team",
    role: "manager",
    nowIso: "2026-05-18T10:00:00.000Z",
  });
  const accepted = acceptTeamInviteInState(created.state, {
    name: "Nadia Frontdesk",
    nowIso: "2026-05-18T10:02:00.000Z",
    token: created.invite.token,
  });

  assert.throws(
    () =>
      acceptTeamInviteInState(accepted.state, {
        name: "Nadia Frontdesk",
        nowIso: "2026-05-18T10:03:00.000Z",
        token: created.invite.token,
      }),
    /already been accepted/i,
  );
});

test("invalid invite token is rejected", () => {
  assert.equal(getTeamInvitePreview(invitedState(), "bad-token").status, "invalid");
  assert.throws(
    () =>
      acceptTeamInviteInState(invitedState(), {
        name: "Nadia Frontdesk",
        token: "bad-token",
      }),
    /invalid/i,
  );
});
