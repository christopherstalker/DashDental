import { errorResponse } from "@/server/api-helpers";
import { fetchBackendAdminFromRequest } from "@/server/backend-admin-client";

export async function GET(request: Request) {
  try {
    const response = await fetchBackendAdminFromRequest<unknown>(
      request,
      "/admin/runtime/drills",
      undefined,
      "super_admin",
    );

    return Response.json(response);
  } catch (error) {
    return errorResponse(error);
  }
}
