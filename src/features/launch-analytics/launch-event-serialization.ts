import type { LaunchEventName } from "@/server/launch-analytics";

export type SerializableLaunchEventPayload = Record<string, unknown> & {
  event: LaunchEventName;
};

const launchEventPayloadKeys = [
  "event",
  "billingStatus",
  "completedGates",
  "locale",
  "onboardingStep",
  "page",
  "plan",
  "role",
  "section",
  "setupProgress",
  "source",
  "target",
  "totalGates",
] as const;

export function serializeLaunchEventPayload(
  payload: SerializableLaunchEventPayload,
): URLSearchParams {
  const body = new URLSearchParams();

  for (const key of launchEventPayloadKeys) {
    const value = payload[key];

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) {
        body.set(key, trimmed);
      }
      continue;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      body.set(key, String(value));
    }
  }

  return body;
}
