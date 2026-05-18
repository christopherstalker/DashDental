import type { Metadata } from "next";
import { getOAuthPublicConfig } from "@/server/oauth";
import { isDevLoginEnabled } from "@/server/feature-flags";
import { buildLoginProfiles } from "@/server/session";
import { readAppState } from "@/server/data-store";
import { LoginForm } from "@/features/auth/components/login-form";
import { getPublicAuthTurnstileSiteKey } from "@/server/public-auth-bot-protection";

export const metadata: Metadata = {
  title: "Login — Dash Dental",
  description: "Sign in to your Dash Dental clinic workspace.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const allowDevLogin = isDevLoginEnabled();
  const queryPromise = searchParams;
  const statePromise = allowDevLogin ? readAppState() : Promise.resolve(null);
  const [query, state] = await Promise.all([queryPromise, statePromise]);
  const authError = Array.isArray(query.auth_error)
    ? query.auth_error[0]
    : query.auth_error;

  return (
    <LoginForm
      allowDevLogin={allowDevLogin}
      authError={authError}
      loginProfiles={allowDevLogin && state ? buildLoginProfiles(state) : []}
      oauthLogin={getOAuthPublicConfig()}
      turnstileSiteKey={getPublicAuthTurnstileSiteKey()}
    />
  );
}
