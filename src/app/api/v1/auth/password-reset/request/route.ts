import { errorResponse, readJsonObject } from "@/server/api-helpers";
import { requestPasswordReset } from "@/server/account-security";
import { assertPublicAuthRateLimit } from "@/server/public-auth-rate-limit";
import { optionalString } from "@/server/validation";

export async function POST(request: Request) {
  try {
    assertPublicAuthRateLimit(request, { action: "password_reset" });
    const payload = await readJsonObject(request);
    const delivery = await requestPasswordReset({
      email: optionalString(payload, "email") ?? "",
      requestUrl: request.url,
    });

    return Response.json({
      devUrl: delivery.devUrl,
      ok: true,
      status: delivery.status,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
