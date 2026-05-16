import { ApiError } from "./api-error";

type PublicAuthBotAction = "login" | "register";

type BotProtectionEnv = {
  [key: string]: string | undefined;
};

type VerifyTokenInput = {
  remoteIp?: string;
  secret: string;
  token: string;
};

type VerifyTokenResult = {
  ok: boolean;
};

function readClientIp(request: Request) {
  return (
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    undefined
  );
}

export function isPublicAuthBotProtectionRequired(
  env: BotProtectionEnv = process.env,
) {
  return env.REQUIRE_PUBLIC_AUTH_BOT_PROTECTION === "true";
}

async function verifyTurnstileToken({
  remoteIp,
  secret,
  token,
}: VerifyTokenInput): Promise<VerifyTokenResult> {
  const body = new URLSearchParams({
    response: token,
    secret,
  });

  if (remoteIp) {
    body.set("remoteip", remoteIp);
  }

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      body,
      cache: "no-store",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      method: "POST",
    },
  );
  const payload = (await response.json().catch(() => ({}))) as {
    success?: boolean;
  };

  return { ok: response.ok && payload.success === true };
}

export async function assertPublicAuthBotProtection(input: {
  action: PublicAuthBotAction;
  env?: BotProtectionEnv;
  request: Request;
  token?: string;
  verifyToken?: (input: VerifyTokenInput) => Promise<VerifyTokenResult>;
}) {
  const env = input.env ?? process.env;

  if (!isPublicAuthBotProtectionRequired(env)) {
    return { checked: false };
  }

  const secret = env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    throw new ApiError(
      503,
      "Public auth bot protection is required but not configured",
      "bot_protection_not_configured",
      { action: input.action },
    );
  }

  const token = input.token?.trim();
  if (!token) {
    throw new ApiError(
      403,
      "Bot protection challenge is required",
      "bot_protection_required",
      { action: input.action },
    );
  }

  const verify = input.verifyToken ?? verifyTurnstileToken;
  const result = await verify({
    remoteIp: readClientIp(input.request),
    secret,
    token,
  });

  if (!result.ok) {
    throw new ApiError(
      403,
      "Bot protection challenge failed",
      "bot_protection_failed",
      { action: input.action },
    );
  }

  return { checked: true };
}
