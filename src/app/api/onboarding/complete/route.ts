import { errorResponse, getRequestContext } from "@/server/api-helpers";
import { readAppState } from "@/server/data-store";
import { completeGuidedOnboarding } from "@/server/guided-onboarding";

export async function POST(request: Request) {
  try {
    const state = await readAppState();
    const context = getRequestContext(request, state, "admin");
    const result = await completeGuidedOnboarding({
      organizationId: context.organizationId,
      userId: context.userId,
    });

    return Response.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
