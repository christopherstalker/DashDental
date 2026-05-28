import assert from "node:assert/strict";
import test from "node:test";
import nextConfig from "../../next.config";

test("demo session cookie payload is signed and expires after fifteen minutes", async () => {
  const {
    createDemoSessionPayload,
    decodeDemoSession,
    encodeDemoSession,
    getDemoSessionCookieOptions,
    DEMO_SESSION_MAX_AGE_SECONDS,
  } = await import("../../src/server/demo-session");
  const now = Date.UTC(2026, 4, 28, 12, 0, 0);
  const payload = createDemoSessionPayload(now);
  const token = encodeDemoSession(payload);

  assert.equal(DEMO_SESSION_MAX_AGE_SECONDS, 900);
  assert.equal(decodeDemoSession(token)?.demoId, payload.demoId);
  assert.equal(decodeDemoSession(`${token.slice(0, -1)}x`), undefined);
  assert.equal(getDemoSessionCookieOptions().httpOnly, true);
  assert.equal(getDemoSessionCookieOptions().sameSite, "lax");
  assert.equal(payload.expiresAt - payload.issuedAt, 900_000);
});

test("CSRF guard rejects cross-site mutations and allows signed webhook paths", async () => {
  const { assertSameOriginRequest } = await import("../../src/server/request-security");
  const crossSite = new Request("https://dashdental.space/api/v1/state", {
    method: "POST",
    headers: {
      origin: "https://attacker.example",
      "sec-fetch-site": "cross-site",
    },
  });
  const webhook = new Request("https://dashdental.space/api/v1/webhooks/stripe", {
    method: "POST",
    headers: {
      origin: "https://stripe.example",
      "sec-fetch-site": "cross-site",
    },
  });

  assert.throws(() => assertSameOriginRequest(crossSite), /Cross-site request/);
  assert.doesNotThrow(() => assertSameOriginRequest(webhook));
});

test("next config exposes strict security response headers", async () => {
  const headerRules = await nextConfig.headers?.();
  assert.ok(headerRules);
  const allHeaders = headerRules.flatMap((rule) => rule.headers);
  const headerMap = new Map(allHeaders.map((header) => [header.key, header.value]));

  assert.equal(nextConfig.poweredByHeader, false);
  assert.match(headerMap.get("Strict-Transport-Security") ?? "", /includeSubDomains/);
  assert.equal(headerMap.get("Cross-Origin-Opener-Policy"), "same-origin");
  assert.equal(headerMap.get("Cross-Origin-Resource-Policy"), "same-origin");
  assert.equal(headerMap.get("X-Permitted-Cross-Domain-Policies"), "none");
  assert.match(headerMap.get("Permissions-Policy") ?? "", /bluetooth=\(\)/);
});

test("new partner API keys store hashes and return the raw key once by route source contract", async () => {
  const { readFile } = await import("node:fs/promises");
  const routeSource = await readFile("src/app/api/v1/api-keys/route.ts", "utf8");

  assert.match(routeSource, /hashApiKey/);
  assert.match(routeSource, /keyHash: hashApiKey\(rawKey\)/);
  assert.match(routeSource, /function sanitizeApiKey/);
  assert.equal(routeSource.includes("keyHash: key.keyHash"), false);
  assert.match(routeSource, /key: rawKey/);
});
