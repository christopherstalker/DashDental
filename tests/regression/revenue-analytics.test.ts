import assert from "node:assert/strict";
import test from "node:test";
import { defaultOrganizationId, getInitialAppState } from "../../src/domain/seed-data";

test("revenue analytics ranks sources by leakage and booked value", async () => {
  const { buildRevenueAnalytics } = await import("../../src/server/revenue-analytics");
  const summary = buildRevenueAnalytics(
    getInitialAppState(),
    defaultOrganizationId,
    "2026-04-22T10:00:00.000Z",
  );

  assert.equal(summary.totalInquiries > 0, true);
  assert.equal(summary.bookedRevenue > 0, true);
  assert.equal(summary.lostRevenue > 0, true);
  assert.ok(summary.sourceRows.some((row) => row.label === "Web form"));
  assert.ok(summary.sourceRows[0]!.lostRevenue + summary.sourceRows[0]!.atRiskRevenue >= 0);
});
