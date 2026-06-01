import assert from "node:assert/strict";
import test from "node:test";
import { getInitialAppState } from "../../src/domain/seed-data";

test("multi-location overview includes owner workspaces without cross-tenant mutation", async () => {
  const { buildMultiLocationOverview } = await import("../../src/server/multi-location");
  const rows = buildMultiLocationOverview({
    state: getInitialAppState(),
    userId: "user-owner",
    nowIso: "2026-04-22T10:00:00.000Z",
  });

  assert.ok(rows.some((row) => row.organizationId === "org-smile-studio"));
  assert.ok(rows.some((row) => row.organizationId === "org-bright-bite"));
  assert.ok(rows.every((row) => row.role === "owner"));
});

test("super admin multi-location overview can see all organizations", async () => {
  const { buildMultiLocationOverview } = await import("../../src/server/multi-location");
  const state = getInitialAppState();
  const rows = buildMultiLocationOverview({
    state,
    userId: "user-super",
    isSuperAdmin: true,
    nowIso: "2026-04-22T10:00:00.000Z",
  });

  assert.equal(rows.length, state.organizations.length);
  assert.ok(rows.every((row) => row.role === "super_admin"));
});
