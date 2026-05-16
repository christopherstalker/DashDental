import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  sanitizeLaunchEventPayload,
  type LaunchEventName,
} from "../../src/server/launch-analytics";
import { serializeLaunchEventPayload } from "../../src/features/launch-analytics/launch-event-serialization";
import { POST as postLaunchEvent } from "../../src/app/api/v1/launch/events/route";
import { resetPublicRouteRateLimitsForTests } from "../../src/server/public-route-rate-limit";

test("launch analytics accepts only allowlisted events and strips unsupported fields", () => {
  const result = sanitizeLaunchEventPayload({
    event: "public.home.start_trial_clicked",
    page: "/",
    section: "hero",
    target: "/register",
    plan: "growth",
    locale: "en",
    email: "owner@clinic.example",
    patientName: "Jane Patient",
    message: "I need an emergency implant appointment.",
    metadata: {
      phone: "+15555550123",
      secret: "do-not-log",
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.event, "public.home.start_trial_clicked" satisfies LaunchEventName);
  assert.deepEqual(Object.keys(result.context).sort(), [
    "locale",
    "page",
    "plan",
    "section",
    "target",
  ]);
  assert.equal(JSON.stringify(result).includes("owner@clinic.example"), false);
  assert.equal(JSON.stringify(result).includes("Jane Patient"), false);
  assert.equal(JSON.stringify(result).includes("+15555550123"), false);
});

test("launch analytics rejects unsupported events instead of logging arbitrary names", () => {
  const result = sanitizeLaunchEventPayload({
    event: "patient.message.received",
    page: "/inbox",
    message: "patient text should not enter launch analytics",
  });

  assert.deepEqual(result, {
    ok: false,
    code: "unsupported_launch_event",
    status: 400,
  });
});

test("launch analytics route rejects oversized public bodies safely", async () => {
  resetPublicRouteRateLimitsForTests();

  const response = await postLaunchEvent(
    new Request("https://dashdental.space/api/v1/launch/events", {
      body: `event=public.home.start_trial_clicked&message=${"x".repeat(5000)}`,
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "x-forwarded-for": "198.51.100.77",
      },
      method: "POST",
    }),
  );
  const body = (await response.json()) as { code?: string; ok?: boolean };

  assert.equal(response.status, 400);
  assert.equal(body.ok, false);
  assert.equal(body.code, "unsupported_launch_event");
});

test("launch analytics browser transport serializes a non-empty beacon-safe body", () => {
  const body = serializeLaunchEventPayload({
    event: "public.home.start_trial_clicked",
    page: "/",
    section: "hero",
    target: "/register",
    locale: "en",
    patientName: "Jane Patient",
    message: "Do not send patient text",
    metadata: {
      secret: "do-not-send",
    },
  });

  assert.ok(body instanceof URLSearchParams);
  assert.equal(body.get("event"), "public.home.start_trial_clicked");
  assert.equal(body.get("page"), "/");
  assert.equal(body.get("target"), "/register");
  assert.equal(body.has("patientName"), false);
  assert.equal(body.has("message"), false);
  assert.equal(body.has("metadata"), false);
  assert.equal(body.toString().length > 0, true);
});

test("production runbook documents launch funnel monitoring", async () => {
  const runbook = await readFile("docs/production-runbook.md", "utf8");

  assert.match(runbook, /Launch Funnel Instrumentation/);
  assert.match(runbook, /public\.home\.start_trial_clicked/);
  assert.match(runbook, /workspace\.setup\.viewed/);
  assert.match(runbook, /workspace\.setup\.next_action_clicked/);
  assert.match(runbook, /Synthetic Launch Monitors/);
  assert.match(runbook, /trial conversion/i);
});
