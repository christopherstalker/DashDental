import { errorResponse, getRequestContext } from "@/server/api-helpers";
import { readAppState } from "@/server/data-store";
import { getPmsConnectionHealth } from "@/server/pms-sync";

export async function GET(request: Request) {
  try {
    const state = await readAppState();
    const context = getRequestContext(request, state, "manager");
    const connections = await getPmsConnectionHealth(context.organizationId);

    return Response.json({
      connected: connections.some((connection) => connection.status === "active"),
      connections,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
