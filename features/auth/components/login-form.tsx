"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, ShieldCheck } from "lucide-react";
import type { OAuthPublicConfig } from "@/server/oauth";
import type { LoginProfile } from "@/server/session";
import { TurnstileChallenge } from "./turnstile-challenge";

const authErrorMessages: Record<string, string> = {
  oauth_not_configured: "SSO is not configured yet.",
  oauth_provider_error: "The SSO provider rejected the login request.",
  oauth_state_invalid: "SSO session expired. Please try again.",
  oauth_login_failed: "SSO login failed. Check that your email is invited.",
};

export function LoginForm({
  allowDevLogin,
  authError,
  loginProfiles,
  oauthLogin,
  turnstileSiteKey,
}: {
  allowDevLogin: boolean;
  authError?: string;
  loginProfiles: LoginProfile[];
  oauthLogin: OAuthPublicConfig;
  turnstileSiteKey?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [error, setError] = useState<string | null>(
    authError ? authErrorMessages[authError] ?? "Authentication failed." : null,
  );
  const showOauthLogin = oauthLogin.enabled || oauthLogin.label.toLowerCase().includes("google");

  function friendlyAuthError(code?: string, fallback = "Could not sign in.") {
    if (code === "bot_protection_required") {
      return "Complete the bot protection challenge before signing in.";
    }
    if (code === "bot_protection_failed") {
      return "Bot protection could not verify this browser. Try the challenge again.";
    }
    if (code === "bot_protection_not_configured") {
      return "Login is temporarily unavailable while bot protection is being configured.";
    }

    return fallback;
  }

  async function signIn(payload: Record<string, string>, options?: { requiresChallenge?: boolean }) {
    setError(null);

    if (options?.requiresChallenge && turnstileSiteKey && !turnstileToken) {
      setError("Complete the bot protection challenge before signing in.");
      return;
    }

    const response = await fetch("/api/v1/auth/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(
        options?.requiresChallenge
          ? {
              ...payload,
              turnstileToken,
            }
          : payload,
      ),
    });
    const result = (await response.json().catch(() => ({}))) as {
      code?: string;
      error?: string;
    };

    if (!response.ok) {
      setError(friendlyAuthError(result.code, result.error ?? "Could not sign in."));
      setTurnstileResetKey((value) => value + 1);
      return;
    }

    startTransition(() => {
      router.replace("/dashboard");
      router.refresh();
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await signIn({ email, password }, { requiresChallenge: true });
  }

  return (
    <section className="auth-card">
      <div className="auth-card-heading">
        <p className="eyebrow">Login</p>
        <h2>Enter the clinic workspace</h2>
        <p>Use your owner, admin, or manager account to continue.</p>
      </div>

      {showOauthLogin ? (
        <a className="login-oauth-button secondary-button" href="/api/v1/auth/oauth/start">
          <ShieldCheck size={16} />
          Continue with {oauthLogin.label}
        </a>
      ) : null}

      <form className="login-form login-form-grid" onSubmit={handleSubmit}>
        <label className="login-field">
          <span>Email</span>
          <input
            autoComplete="email"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="owner@clinic.com"
            required
            type="email"
            value={email}
          />
        </label>
        <label className="login-field">
          <span>Password</span>
          <input
            autoComplete="current-password"
            minLength={10}
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 10 characters"
            required
            type="password"
            value={password}
          />
        </label>
        <TurnstileChallenge
          action="login"
          resetKey={turnstileResetKey}
          siteKey={turnstileSiteKey}
          onError={setError}
          onTokenChange={setTurnstileToken}
        />
        <button className="primary-button" disabled={isPending} type="submit">
          {isPending ? "Signing in..." : "Open dashboard"}
          <ArrowRight size={16} />
        </button>
      </form>

      {error ? <p className="login-error">{error}</p> : null}

      {allowDevLogin && loginProfiles.length > 0 ? (
        <>
          <div className="login-divider">Demo profiles</div>
          <div className="login-profile-grid">
            {loginProfiles.slice(0, 4).map((profile) => (
              <button
                className="login-profile-card"
                disabled={isPending}
                key={`${profile.organizationId}-${profile.userId}`}
                onClick={() =>
                  signIn({
                    userId: profile.userId,
                    organizationId: profile.organizationId,
                  })
                }
                type="button"
              >
                <span className="avatar">{profile.avatar}</span>
                <span>
                  <strong>{profile.name}</strong>
                  <small>{profile.organizationName}</small>
                </span>
                <em>{profile.role.replaceAll("_", " ")}</em>
              </button>
            ))}
          </div>
        </>
      ) : null}

      <div className="auth-alt-action">
        <Building2 size={16} />
        <span>New clinic?</span>
        <a href="/register">Create a workspace</a>
      </div>
    </section>
  );
}
