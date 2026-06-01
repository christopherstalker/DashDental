import {
  errorResponse,
  getRequestContext,
  readJsonObject,
  stateForContext,
} from "@/server/api-helpers";
import { readAppState, mutateAppState } from "@/server/data-store";
import { requestPatientReviewInState } from "@/server/review-recall";
import { optionalString, requiredString } from "@/server/validation";

export async function POST(request: Request) {
  try {
    const currentState = await readAppState();
    const context = getRequestContext(request, currentState, "manager");
    const payload = await readJsonObject(request);
    const leadId = requiredString(payload, "leadId");
    const reviewUrl = optionalString(payload, "reviewUrl");

    const state = await mutateAppState((current) =>
      requestPatientReviewInState(current, {
        leadId,
        actorUserId: context.userId,
        reviewUrl,
      }),
    );

    return Response.json(stateForContext(state, context));
  } catch (error) {
    return errorResponse(error);
  }
}
