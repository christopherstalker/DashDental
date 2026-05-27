import { errorResponse, readJsonObject } from "@/server/api-helpers";
import { verifyEmailToken } from "@/server/account-security";
import { requiredString } from "@/server/validation";

export async function POST(request: Request) {
  try {
    const payload = await readJsonObject(request);
    const result = await verifyEmailToken({
      token: requiredString(payload, "token"),
    });

    return Response.json({
      email: result.email,
      ok: true,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
