import assert from "node:assert/strict";
import test from "node:test";
import type { AppState } from "../../src/domain/types";
import { createEmptyAppState } from "../../src/domain/empty-app-state";
import { defaultOrganizationId, getInitialAppState } from "../../src/domain/seed-data";

function stateWithStandaloneUser(): AppState {
  return {
    ...createEmptyAppState(),
    users: [
      {
        id: "user-standalone",
        email: "standalone@example.com",
        name: "Standalone User",
        avatar: "SU",
        status: "active",
        lastLoginAt: "",
      },
    ],
  };
}

test("session payload can represent a signed-in user without selected clinic", async () => {
  const {
    createSessionPayload,
    decodeSession,
    encodeSession,
    resolveAuthenticatedUser,
    resolveSessionContext,
    toAccountSession,
  } = await import("../../src/server/session");

  const state = stateWithStandaloneUser();
  const payload = createSessionPayload({
    userId: "user-standalone",
  });
  const decoded = decodeSession(encodeSession(payload));
  const user = resolveAuthenticatedUser(state, decoded);

  assert.equal(decoded?.userId, "user-standalone");
  assert.equal(decoded?.organizationId, undefined);
  assert.equal(user.email, "standalone@example.com");
  assert.equal(toAccountSession(state, user).workspaces.length, 0);
  assert.throws(
    () => resolveSessionContext(state, decoded, "manager"),
    /Select a clinic workspace/i,
  );
});

test("workspace context still requires active membership for selected clinic", async () => {
  const {
    createSessionPayload,
    listUserWorkspaces,
    resolveSessionContext,
  } = await import("../../src/server/session");

  const state = getInitialAppState();
  const payload = createSessionPayload({
    userId: "user-admin",
    organizationId: defaultOrganizationId,
    now: 1_767_225_600_000,
  });
  const context = resolveSessionContext(state, payload, "manager");

  assert.equal(context.userId, "user-admin");
  assert.equal(context.organizationId, defaultOrganizationId);
  assert.equal(context.role, "admin");
  assert.equal(listUserWorkspaces(state, "user-admin").length, 1);
});

test("selected clinic without membership is forbidden", async () => {
  const { createSessionPayload, resolveSessionContext } = await import(
    "../../src/server/session"
  );
  const state: AppState = {
    ...getInitialAppState(),
    organizations: [
      ...getInitialAppState().organizations,
      {
        id: "org-not-member",
        name: "Not Member Dental",
        timezone: "UTC",
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
  };

  assert.throws(
    () =>
      resolveSessionContext(
        state,
        createSessionPayload({
          userId: "user-admin",
          organizationId: "org-not-member",
          now: 1_767_225_600_000,
        }),
        "manager",
      ),
    /does not belong/i,
  );
});
