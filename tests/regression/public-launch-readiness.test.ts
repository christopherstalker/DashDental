import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import type { NextRequest } from "next/server";
import nextConfig from "../../next.config";
import { proxy } from "../../src/proxy";

function createProxyRequest(url: string, host: string): NextRequest {
  return {
    headers: new Headers({ host }),
    url,
  } as NextRequest;
}

function withEnv<T>(values: Record<string, string | undefined>, callback: () => T): T {
  const previous = new Map<string, string | undefined>();

  for (const [key, value] of Object.entries(values)) {
    previous.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return callback();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("proxy does not force preview hosts away from public pages by default", () => {
  const response = proxy(
    createProxyRequest(
      "https://dental-recovery-preview.vercel.app/pricing",
      "dental-recovery-preview.vercel.app",
    ),
  );

  assert.notEqual(response.status, 308);
  assert.equal(response.headers.get("location"), null);
});

test("proxy never redirects Vercel preview deployments to production canonical host", () => {
  withEnv(
    {
      ENABLE_CANONICAL_HOST_REDIRECT: "true",
      VERCEL_ENV: "preview",
    },
    () => {
      const response = proxy(
        createProxyRequest(
          "https://dental-recovery-psi.vercel.app/pricing",
          "dental-recovery-psi.vercel.app",
        ),
      );

      assert.notEqual(response.status, 308);
      assert.equal(response.headers.get("location"), null);
    },
  );
});

test("proxy redirects Vercel production deployment host when canonical redirect is enabled", () => {
  withEnv(
    {
      ENABLE_CANONICAL_HOST_REDIRECT: "true",
      VERCEL_ENV: "production",
    },
    () => {
      const response = proxy(
        createProxyRequest(
          "https://dental-recovery.vercel.app/pricing",
          "dental-recovery.vercel.app",
        ),
      );

      assert.equal(response.status, 308);
      assert.equal(response.headers.get("location"), "https://dashdental.space/pricing");
    },
  );
});

test("production handoff documents manual billing and legal launch pack", async () => {
  const backendEnv = await readFile("backend/.env.example", "utf8");
  const runbook = await readFile("docs/production-runbook.md", "utf8");

  assert.match(backendEnv, /MANUAL_BILLING_SUPPORT_EMAIL/);
  assert.match(backendEnv, /BILLING_PROVIDER/);
  assert.match(runbook, /Go-Live Billing and Legal Pack/);
  assert.match(runbook, /manual invoice/i);
  assert.match(runbook, /DPA/i);
  assert.match(runbook, /subprocessor/i);
});

test("next config applies baseline security headers for public launch", async () => {
  const headerRules = await nextConfig.headers?.();
  assert.ok(headerRules);
  const allHeaders = headerRules.flatMap((rule) => rule.headers);
  const headerMap = new Map(allHeaders.map((header) => [header.key, header.value]));

  assert.equal(nextConfig.poweredByHeader, false);
  assert.match(headerMap.get("Strict-Transport-Security") ?? "", /max-age=63072000/);
  assert.equal(headerMap.get("X-Content-Type-Options"), "nosniff");
  assert.equal(headerMap.get("X-Frame-Options"), "DENY");
  assert.equal(headerMap.get("Referrer-Policy"), "strict-origin-when-cross-origin");
  assert.match(headerMap.get("Permissions-Policy") ?? "", /camera=\(\)/);
});
