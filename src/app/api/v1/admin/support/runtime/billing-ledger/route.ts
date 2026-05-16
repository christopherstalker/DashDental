import { errorResponse, getRequestContext } from "@/server/api-helpers";
import { readAppState } from "@/server/data-store";
import { getBillingLedgerVisibility } from "@/server/support-visibility";

export async function GET(request: Request) {
  try {
    const state = await readAppState();
    getRequestContext(request, state, "super_admin");
    const url = new URL(request.url);
    const organizationId = url.searchParams.get("organizationId") ?? undefined;
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : undefined;

    return Response.json(
      await getBillingLedgerVisibility({
        organizationId,
        limit,
      }),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
