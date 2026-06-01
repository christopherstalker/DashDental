import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

async function listRouteFiles(dir = "src/app/api"): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return listRouteFiles(fullPath);
      }

      return entry.name === "route.ts" ? [fullPath.replaceAll(path.sep, "/")] : [];
    }),
  );

  return nested.flat();
}

function isRawBodyException(routePath: string): boolean {
  return (
    routePath.includes("/webhooks/") ||
    routePath.includes("/launch/events/") ||
    routePath.includes("/demo/") ||
    routePath.includes("/oauth/") ||
    routePath.includes("/health/")
  );
}

function allowsClientOrganizationId(routePath: string, source: string): boolean {
  return (
    routePath.includes("/auth/") ||
    routePath.includes("/demo/") ||
    routePath.includes("/webhooks/") ||
    source.includes("assertSameOrganization") ||
    source.includes("resolveSessionContext") ||
    source.includes('"super_admin"')
  );
}

test("non-public JSON API routes use same-origin JSON helper instead of raw request parsing", async () => {
  const routeFiles = await listRouteFiles();
  const offenders: string[] = [];

  for (const routePath of routeFiles) {
    const source = await readFile(routePath, "utf8");
    if (
      source.includes("request.json(") &&
      !source.includes("readJsonObject") &&
      !isRawBodyException(routePath)
    ) {
      offenders.push(routePath);
    }
  }

  assert.deepEqual(offenders, []);
});

test("client supplied organizationId is scoped or restricted to explicit admin/webhook paths", async () => {
  const routeFiles = await listRouteFiles();
  const offenders: string[] = [];

  for (const routePath of routeFiles) {
    const source = await readFile(routePath, "utf8");
    const readsClientOrganizationId =
      source.includes('optionalString(payload, "organizationId")') ||
      source.includes('requiredString(payload, "organizationId")') ||
      /payload\.[A-Za-z]*organizationId/i.test(source);

    if (readsClientOrganizationId && !allowsClientOrganizationId(routePath, source)) {
      offenders.push(routePath);
    }
  }

  assert.deepEqual(offenders, []);
});

test("authenticated request context rejects cross-site state-changing requests", async () => {
  const { getRequestContext } = await import("../../src/server/api-helpers");
  const { createSessionPayload, encodeSession, SESSION_COOKIE_NAME } = await import(
    "../../src/server/session"
  );
  const { getInitialAppState } = await import("../../src/domain/seed-data");

  const state = getInitialAppState();
  const ownerMembership = state.memberships.find(
    (membership) => membership.role === "owner" && membership.status === "active",
  );
  assert.ok(ownerMembership);
  const session = encodeSession(
    createSessionPayload({
      organizationId: ownerMembership.organizationId,
      userId: ownerMembership.userId,
      sessionVersion:
        state.users.find((user) => user.id === ownerMembership.userId)?.sessionVersion ?? 0,
    }),
  );

  assert.throws(
    () =>
      getRequestContext(
        new Request("https://dashdental.space/api/v1/billing/customer-portal", {
          headers: {
            cookie: `${SESSION_COOKIE_NAME}=${session}`,
            origin: "https://evil.example",
          },
          method: "POST",
        }),
        state,
        "owner",
      ),
    /Request origin is not allowed|Cross-site request was rejected/,
  );
});
