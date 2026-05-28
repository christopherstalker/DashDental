import { cookies } from "next/headers";
import { errorResponse } from "@/server/api-helpers";
import { readAppState } from "@/server/data-store";
import {
  decodeSession,
  SESSION_COOKIE_NAME,
  resolveAuthenticatedUser,
} from "@/server/session";
import {
  buildTotpUri,
  encryptTotpSecret,
  generateTotpSecret,
} from "@/server/mfa";
import { writeUserCredentialRecord } from "@/server/user-credentials";
import { addAudit } from "@/server/state-mutations";
import { mutateAppState } from "@/server/data-store";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionPayload = decodeSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
    const state = await readAppState();
    const user = resolveAuthenticatedUser(state, sessionPayload);
    const secret = generateTotpSecret();

    await writeUserCredentialRecord(user.id, {
      totpSecretEncrypted: encryptTotpSecret(secret),
      totpEnabledAt: null,
      mfaRecoveryCodesJson: null,
    });

    await mutateAppState((current) =>
      addAudit(current, {
        organizationId: sessionPayload?.organizationId,
        actorUserId: user.id,
        action: "security.mfa_setup_started",
        entityType: "user",
        entityId: user.id,
        metadataJson: { method: "totp" },
      }),
    ).catch(() => undefined);

    return Response.json({
      secret,
      otpauthUrl: buildTotpUri({
        accountName: user.email,
        secret,
      }),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
