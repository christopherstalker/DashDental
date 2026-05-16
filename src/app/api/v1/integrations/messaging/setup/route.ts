import { readAppState } from "@/server/data-store";
import { errorResponse, getRequestContext } from "@/server/api-helpers";
import { getMessagingSetupGuide } from "@/server/integration-onboarding";

export async function GET(request: Request) {
  try {
    const state = await readAppState();
    const context = getRequestContext(request, state, "admin");

    return Response.json({
      guides: [
        getMessagingSetupGuide(request.url, context.organizationId, "telegram"),
        getMessagingSetupGuide(request.url, context.organizationId, "whatsapp"),
        getMessagingSetupGuide(request.url, context.organizationId, "instagram"),
      ],
    });
  } catch (error) {
    return errorResponse(error);
  }
}
