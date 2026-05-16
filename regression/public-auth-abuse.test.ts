import assert from "node:assert/strict";
import test from "node:test";
import { ApiError } from "../../src/server/api-error";
import {
  assertPublicAuthRateLimit,
  getPublicAuthClientKey,
  resetPublicAuthRateLimitsForTests,
} from "../../src/server/public-auth-rate-limit";
import {
  assertPublicRouteRateLimit,
  getPublicRouteRateLimitKey,
  resetPublicRouteRateLimitsForTests,
} from "../../src/server/public-route-rate-limit";

test("public auth rate limit uses forwarded client identity without trusting patient data", () => {
  const request = new Request("https://dashdental.space/api/v1/auth/session", {
    headers: {
      "cf-connecting-ip": "203.0.113.42",
      "user-agent": "Playwright Clinic Browser",
      "x-forwarded-for": "198.51.100.7, 10.0.0.1",
    },
  });

  assert.equal(getPublicAuthClientKey(request, "login"), "login:203.0.113.42");
});

test("public auth rate limit blocks repeated login or registration abuse", () => {
  resetPublicAuthRateLimitsForTests();

  const request = new Request("https://dashdental.space/api/v1/auth/register", {
    headers: {
      "x-forwarded-for": "198.51.100.8",
    },
  });

  for (let attempt = 0; attempt < 8; attempt += 1) {
    assert.doesNotThrow(() =>
      assertPublicAuthRateLimit(request, {
        action: "register",
        nowMs: 1_000,
      }),
    );
  }

  assert.throws(
    () =>
      assertPublicAuthRateLimit(request, {
        action: "register",
        nowMs: 1_000,
      }),
    (error) =>
      error instanceof ApiError &&
      error.status === 429 &&
      error.code === "rate_limited" &&
      /Too many registration attempts/i.test(error.message),
  );
});

test("public route fallback rate limits cover health and launch analytics", () => {
  resetPublicRouteRateLimitsForTests();

  const request = new Request("https://dashdental.space/api/v1/health/storage", {
    headers: {
      "x-forwarded-for": "198.51.100.44, 10.0.0.1",
    },
  });

  assert.equal(
    getPublicRouteRateLimitKey(request, "health_storage"),
    "health_storage:198.51.100.44",
  );

  for (let attempt = 0; attempt < 30; attempt += 1) {
    assert.doesNotThrow(() =>
      assertPublicRouteRateLimit(request, {
        route: "health_storage",
        nowMs: 1_000,
      }),
    );
  }

  assert.throws(
    () =>
      assertPublicRouteRateLimit(request, {
        route: "health_storage",
        nowMs: 1_000,
      }),
    (error) =>
      error instanceof ApiError &&
      error.status === 429 &&
      error.code === "rate_limited",
  );
});
