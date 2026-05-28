import { cookies } from "next/headers";
import { ApiError, errorResponse, readJsonObject } from "@/server/api-helpers";
import { readAppState } from "@/server/data-store";
import {
  createSessionPayload,
  decodeSession,
  encodeSession,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
  resolveAuthenticatedUser,
} from "@/server/session";
import {
  createRecoveryCodes,
  decryptTotpSecret,
  verifyTotpCode,
} from "@/server/mfa";
import {
  readUserCredentialRecord,
  writeUserCredentialRecord,
} from "@/server/user-credentials";
import { optionalString } from "@/server/validation";
import { addAudit } from "@/server/state-mutations";
import { mutateAppState } from "@/server/data-store";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const currentPayload = decodeSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
    const state = await readAppState();
    const user = resolveAuthenticatedUser(state, currentPayload);
    const payload = await readJsonObject(request);
    const code = optionalString(payload, "code");
    const credential = await readUserCredentialRecord(user.id);
    const secret = decryptTotpSecret(credential?.totpSecretEncrypted);

    if (!secret || !code || !verifyTotpCode({ code, secret })) {
      throw new ApiError(403, "Enter a valid MFA code", "mfa_invalid");
    }

    const recoveryCodes = credential?.totpEnabledAt
      ? { rawCodes: [] as string[], hashes: credential.mfaRecoveryCodesJson ?? [] }
      : createRecoveryCodes();
    const verifiedAt = Date.now();
    await writeUserCredentialRecord(user.id, {
      totpEnabledAt: credential?.totpEnabledAt ?? new Date(verifiedAt).toISOString(),
      mfaRecoveryCodesJson: recoveryCodes.hashes,
    });

    cookieStore.set({
      ...getSessionCookieOptions(),
      name: SESSION_COOKIE_NAME,
      value: encodeSession(
        createSessionPayload({
          userId: user.id,
          organizationId: currentPayload?.organizationId,
          mfaVerifiedAt: verifiedAt,
          sessionVersion: user.sessionVersion ?? 0,
        }),
      ),
    });

    await mutateAppState((current) =>
      addAudit(current, {
        organizationId: currentPayload?.organizationId,
        actorUserId: user.id,
        action: credential?.totpEnabledAt ? "security.mfa_verified" : "security.mfa_enabled",
        entityType: "user",
        entityId: user.id,
        metadataJson: { method: "totp" },
      }),
    ).catch(() => undefined);

    return Response.json({
      ok: true,
      recoveryCodes: recoveryCodes.rawCodes,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
