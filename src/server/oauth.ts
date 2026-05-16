import crypto from "node:crypto";
import { defaultOrganizationId, isDemoOrganizationId } from "@/domain/seed-data";
import type { AppState, Membership } from "@/domain/types";
import { ApiError } from "./api-error";
import type { RequestContext } from "./api-helpers";
import {
  createSessionPayload,
  decodeSignedPayload,
  encodeSignedPayload,
  resolveSessionContext,
} from "./session";

export const OAUTH_STATE_COOKIE_NAME = "dental_recovery_oauth_state";
export const OAUTH_STATE_MAX_AGE_SECONDS = 10 * 60;
const DEFAULT_OAUTH_PROVIDER_LABEL = "Google";
const DEFAULT_OAUTH_ISSUER_URL = "https://accounts.google.com";

export interface OAuthPublicConfig {
  enabled: boolean;
  label: string;
}

interface OAuthProviderConfig {
  label: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string;
  tokenAuthMethod: "client_secret_post" | "client_secret_basic";
  allowedEmailDomains: string[];
}

export interface OAuthStatePayload {
  state: string;
  nonce: string;
  codeVerifier: string;
  redirectUri: string;
  organizationId?: string;
  issuedAt: number;
  expiresAt: number;
}

interface OAuthTokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  id_token?: string;
  error?: string;
  error_description?: string;
}

interface OAuthUserInfo {
  sub?: string;
  id?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  preferred_username?: string;
  picture?: string;
}

function envString(name: string, aliases: string[] = []): string | undefined {
  const rawValue = process.env[name] ?? aliases.map((alias) => process.env[alias]).find(Boolean);
  const value = rawValue?.trim();
  return value || undefined;
}

function splitEnvList(value?: string): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function randomBase64Url(bytes = 32): string {
  return base64UrlEncode(crypto.randomBytes(bytes));
}

function createCodeChallenge(verifier: string): string {
  return base64UrlEncode(crypto.createHash("sha256").update(verifier).digest());
}

function getAppUrl(requestUrl: string): URL {
  return new URL(requestUrl);
}

async function resolveProviderEndpoints(): Promise<{
  authorizationUrl?: string;
  tokenUrl?: string;
  userInfoUrl?: string;
}> {
  const authorizationUrl = envString("OAUTH_AUTHORIZATION_URL");
  const tokenUrl = envString("OAUTH_TOKEN_URL");
  const userInfoUrl = envString("OAUTH_USERINFO_URL");

  if (authorizationUrl && tokenUrl && userInfoUrl) {
    return { authorizationUrl, tokenUrl, userInfoUrl };
  }

  const issuerUrl =
    envString("OAUTH_ISSUER_URL") ??
    (envString("OAUTH_CLIENT_ID", ["GOOGLE_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_ID"]) &&
    envString("OAUTH_CLIENT_SECRET", ["GOOGLE_CLIENT_SECRET", "GOOGLE_OAUTH_CLIENT_SECRET"])
      ? DEFAULT_OAUTH_ISSUER_URL
      : undefined);
  if (!issuerUrl) {
    return { authorizationUrl, tokenUrl, userInfoUrl };
  }

  const discoveryUrl =
    envString("OAUTH_DISCOVERY_URL") ??
    `${issuerUrl.replace(/\/$/, "")}/.well-known/openid-configuration`;
  const response = await fetch(discoveryUrl, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ApiError(502, "OAuth discovery endpoint did not respond", "oauth_discovery_failed");
  }

  const discovery = (await response.json()) as {
    authorization_endpoint?: string;
    token_endpoint?: string;
    userinfo_endpoint?: string;
  };

  return {
    authorizationUrl: authorizationUrl ?? discovery.authorization_endpoint,
    tokenUrl: tokenUrl ?? discovery.token_endpoint,
    userInfoUrl: userInfoUrl ?? discovery.userinfo_endpoint,
  };
}

export function getOAuthPublicConfig(): OAuthPublicConfig {
  const clientId = envString("OAUTH_CLIENT_ID", ["GOOGLE_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_ID"]);
  const clientSecret = envString("OAUTH_CLIENT_SECRET", [
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_OAUTH_CLIENT_SECRET",
  ]);

  return {
    enabled: Boolean(clientId && clientSecret),
    label: envString("OAUTH_PROVIDER_LABEL") ?? DEFAULT_OAUTH_PROVIDER_LABEL,
  };
}

export async function getOAuthProviderConfig(requestUrl: string): Promise<OAuthProviderConfig> {
  const clientId = envString("OAUTH_CLIENT_ID", ["GOOGLE_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_ID"]);
  const clientSecret = envString("OAUTH_CLIENT_SECRET", [
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_OAUTH_CLIENT_SECRET",
  ]);
  const endpoints = await resolveProviderEndpoints();

  if (!clientId || !clientSecret || !endpoints.authorizationUrl || !endpoints.tokenUrl) {
    throw new ApiError(501, "OAuth provider is not configured", "oauth_not_configured");
  }

  if (!endpoints.userInfoUrl) {
    throw new ApiError(501, "OAuth userinfo endpoint is not configured", "oauth_not_configured");
  }

  return {
    label: envString("OAUTH_PROVIDER_LABEL") ?? DEFAULT_OAUTH_PROVIDER_LABEL,
    authorizationUrl: endpoints.authorizationUrl,
    tokenUrl: endpoints.tokenUrl,
    userInfoUrl: endpoints.userInfoUrl,
    clientId,
    clientSecret,
    redirectUri:
      envString("OAUTH_REDIRECT_URI") ??
      new URL("/api/v1/auth/oauth/callback", getAppUrl(requestUrl)).toString(),
    scopes: envString("OAUTH_SCOPES") ?? "openid email profile",
    tokenAuthMethod:
      envString("OAUTH_TOKEN_AUTH_METHOD") === "client_secret_basic"
        ? "client_secret_basic"
        : "client_secret_post",
    allowedEmailDomains: splitEnvList(process.env.OAUTH_ALLOWED_EMAIL_DOMAINS),
  };
}

export function createOAuthStatePayload(input: {
  redirectUri: string;
  organizationId?: string;
  now?: number;
}): OAuthStatePayload {
  const issuedAt = input.now ?? Date.now();

  return {
    state: randomBase64Url(24),
    nonce: randomBase64Url(24),
    codeVerifier: randomBase64Url(48),
    redirectUri: input.redirectUri,
    organizationId: input.organizationId,
    issuedAt,
    expiresAt: issuedAt + OAUTH_STATE_MAX_AGE_SECONDS * 1000,
  };
}

export function encodeOAuthState(payload: OAuthStatePayload): string {
  return encodeSignedPayload(payload);
}

export function decodeOAuthState(token?: string): OAuthStatePayload | undefined {
  const payload = decodeSignedPayload<OAuthStatePayload>(token);
  if (
    !payload?.state ||
    !payload.nonce ||
    !payload.codeVerifier ||
    !payload.redirectUri ||
    Date.now() > payload.expiresAt
  ) {
    return undefined;
  }

  return payload;
}

export function buildAuthorizationUrl(
  config: OAuthProviderConfig,
  statePayload: OAuthStatePayload,
): URL {
  const authorizationUrl = new URL(config.authorizationUrl);
  authorizationUrl.searchParams.set("client_id", config.clientId);
  authorizationUrl.searchParams.set("redirect_uri", statePayload.redirectUri);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("scope", config.scopes);
  authorizationUrl.searchParams.set("state", statePayload.state);
  authorizationUrl.searchParams.set("nonce", statePayload.nonce);
  authorizationUrl.searchParams.set("code_challenge", createCodeChallenge(statePayload.codeVerifier));
  authorizationUrl.searchParams.set("code_challenge_method", "S256");

  return authorizationUrl;
}

export function buildAuthErrorRedirect(requestUrl: string, code: string): URL {
  const redirectUrl = new URL("/login", getAppUrl(requestUrl));
  redirectUrl.searchParams.set("auth_error", code);
  return redirectUrl;
}

export async function exchangeOAuthCode(input: {
  code: string;
  config: OAuthProviderConfig;
  statePayload: OAuthStatePayload;
}): Promise<OAuthTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: input.statePayload.redirectUri,
    code_verifier: input.statePayload.codeVerifier,
  });
  const headers: HeadersInit = {
    accept: "application/json",
    "content-type": "application/x-www-form-urlencoded",
  };

  if (input.config.tokenAuthMethod === "client_secret_basic") {
    headers.authorization = `Basic ${Buffer.from(
      `${input.config.clientId}:${input.config.clientSecret}`,
    ).toString("base64")}`;
    body.set("client_id", input.config.clientId);
  } else {
    body.set("client_id", input.config.clientId);
    body.set("client_secret", input.config.clientSecret);
  }

  const response = await fetch(input.config.tokenUrl, {
    method: "POST",
    headers,
    body,
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as OAuthTokenResponse;

  if (!response.ok || !payload.access_token) {
    throw new ApiError(502, "OAuth token exchange failed", "oauth_token_exchange_failed", {
      providerError: payload.error,
    });
  }

  return payload;
}

export async function fetchOAuthUserInfo(
  config: OAuthProviderConfig,
  accessToken: string,
): Promise<OAuthUserInfo> {
  const response = await fetch(config.userInfoUrl, {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as OAuthUserInfo;

  if (!response.ok || !payload.email) {
    throw new ApiError(502, "OAuth userinfo lookup failed", "oauth_userinfo_failed");
  }

  return payload;
}

function chooseMembership(
  state: AppState,
  userId: string,
  organizationId?: string,
): Membership | undefined {
  const activeMemberships = state.memberships.filter(
    (membership) => membership.userId === userId && membership.status === "active",
  );
  const targetOrganizationId =
    organizationId ?? envString("OAUTH_DEFAULT_ORGANIZATION_ID") ?? defaultOrganizationId;
  const requestedMembership = activeMemberships.find(
    (membership) => membership.organizationId === targetOrganizationId,
  );

  if (requestedMembership) {
    return requestedMembership;
  }

  return activeMemberships.toSorted((left, right) => {
    const leftDemo = isDemoOrganizationId(left.organizationId) ? 1 : 0;
    const rightDemo = isDemoOrganizationId(right.organizationId) ? 1 : 0;

    return leftDemo - rightDemo;
  })[0];
}

export function resolveOAuthSessionContext(input: {
  state: AppState;
  userInfo: OAuthUserInfo;
  providerConfig: OAuthProviderConfig;
  organizationId?: string;
}): RequestContext {
  if (input.userInfo.email_verified === false) {
    throw new ApiError(403, "OAuth email is not verified", "oauth_email_unverified");
  }

  const email = input.userInfo.email?.toLowerCase();
  if (!email) {
    throw new ApiError(403, "OAuth profile did not include an email", "oauth_email_missing");
  }

  if (input.providerConfig.allowedEmailDomains.length > 0) {
    const domain = email.split("@")[1]?.toLowerCase();
    if (!domain || !input.providerConfig.allowedEmailDomains.includes(domain)) {
      throw new ApiError(403, "OAuth email domain is not allowed", "oauth_domain_forbidden");
    }
  }

  const user = input.state.users.find(
    (item) => item.email.toLowerCase() === email && item.status === "active",
  );
  if (!user) {
    throw new ApiError(403, "OAuth user has no active invitation", "oauth_user_not_invited");
  }

  const membership = chooseMembership(input.state, user.id, input.organizationId);
  if (!membership) {
    throw new ApiError(403, "OAuth user has no workspace membership", "oauth_membership_missing");
  }

  return resolveSessionContext(
    input.state,
    createSessionPayload({
      userId: user.id,
      organizationId: membership.organizationId,
    }),
    "manager",
  );
}
