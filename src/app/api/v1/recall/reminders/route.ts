import {
  errorResponse,
  getRequestContext,
  readJsonObject,
  stateForContext,
} from "@/server/api-helpers";
import { readAppState, mutateAppState } from "@/server/data-store";
import { scheduleRecallReminderInState } from "@/server/review-recall";
import { optionalIsoString, optionalString, requiredString } from "@/server/validation";

function tomorrowMorningIso(): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 1);
  date.setUTCHours(9, 0, 0, 0);
  return date.toISOString();
}

export async function POST(request: Request) {
  try {
    const currentState = await readAppState();
    const context = getRequestContext(request, currentState, "manager");
    const payload = await readJsonObject(request);
    const leadId = requiredString(payload, "leadId");
    const remindAt = optionalIsoString(payload, "remindAt") ?? tomorrowMorningIso();
    const note = optionalString(payload, "note");

    const state = await mutateAppState((current) =>
      scheduleRecallReminderInState(current, {
        leadId,
        actorUserId: context.userId,
        remindAt,
        note,
      }),
    );

    return Response.json(stateForContext(state, context));
  } catch (error) {
    return errorResponse(error);
  }
}
