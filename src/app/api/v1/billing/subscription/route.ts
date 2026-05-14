import { readAppState } from "@/server/data-store";
import {
  assertSameOrganization,
  errorResponse,
  getRequestContext,
} from "@/server/api-helpers";

export async function GET(request: Request) {
  try {
    const state = await readAppState();
    const context = getRequestContext(request, state, "owner");
    const url = new URL(request.url);
    const organizationId = assertSameOrganization(
      context,
      url.searchParams.get("organizationId") ?? undefined,
    );
    const subscription = state.subscriptions.find(
      (item) => item.organizationId === organizationId,
    );
    const usage = state.usageLimits.find((item) => item.organizationId === organizationId);

    return Response.json({ subscription, usage });
  } catch (error) {
    return errorResponse(error);
  }
}
