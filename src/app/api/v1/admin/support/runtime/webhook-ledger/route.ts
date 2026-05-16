import { errorResponse, getRequestContext } from "@/server/api-helpers";
import { readAppState } from "@/server/data-store";
import { getWebhookPipelineVisibility } from "@/server/support-visibility";

export async function GET(request: Request) {
  try {
    const state = await readAppState();
    const context = getRequestContext(request, state, "super_admin");
    const url = new URL(request.url);
    const organizationId = url.searchParams.get("organizationId") ?? undefined;
    const limit = Number.parseInt(url.searchParams.get("limit") ?? "", 10);

    const visibility = await getWebhookPipelineVisibility({
      organizationId:
        organizationId && context.isSuperAdmin ? organizationId : undefined,
      limit: Number.isFinite(limit) ? limit : undefined,
    });

    return Response.json(visibility);
  } catch (error) {
    return errorResponse(error);
  }
}
