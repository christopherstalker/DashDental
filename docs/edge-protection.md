# Edge Protection Policy

Use this policy at the CDN/edge layer before broad paid self-serve launch. The
application also has in-process throttling, but edge controls are the primary
abuse boundary for public auth and buyer traffic.

## Required Controls

- `/api/v1/auth/register`: rate limit to 8-10 requests per minute per IP. Challenge suspicious traffic with Cloudflare Turnstile or an equivalent bot check.
- `/api/v1/auth/session`: rate limit to 60 requests per minute per IP. Increase friction after repeated failed password attempts.
- `/api/v1/launch/events`: rate limit to 120 requests per minute per IP. Drop oversized requests and never challenge normal page navigation.
- `/api/v1/health/storage`: rate limit to 30 requests per minute per IP. Allow synthetic monitor IPs.
- `/api/v1/webhooks/*`: do not use browser challenges. Webhooks must be protected by provider signatures, idempotency, and secret verification.

## Bot Protection

Set these environment variables only after the Turnstile widget is available on
the public login and registration surfaces:

- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`: public site key for the frontend widget.
- `TURNSTILE_SECRET_KEY`: server-side verification secret.
- `REQUIRE_PUBLIC_AUTH_BOT_PROTECTION=true`: fail closed if a public auth request has no valid challenge token.

Until the widget is enabled, keep `REQUIRE_PUBLIC_AUTH_BOT_PROTECTION=false` and
use edge rate limits plus the in-process public auth throttle.

## Free Preview Fallback

If Vercel Firewall, CDN rate limiting, or IP bypass controls are unavailable on
the current plan, keep `EDGE_PROTECTION_DEPLOYED=false`. The application still
enforces best-effort in-process throttles for:

- `/api/v1/auth/register`: 8 requests per minute per client IP.
- `/api/v1/auth/session`: 60 requests per minute per client IP.
- `/api/v1/launch/events`: 120 requests per minute per client IP and a 4 KB body guard.
- `/api/v1/health/storage`: 30 requests per minute per client IP.

This fallback is acceptable for private demos and beta/manual-invoice trials. It
does not replace a real CDN/edge control for broad paid self-serve traffic.

## Launch Rules

- Allow known uptime and synthetic monitor IPs.
- Block known malicious user agents before they reach Next.js.
- Keep public pages reachable without auth; never challenge `GET /`, `/pricing`,
  `/demo`, `/trial`, `/qa`, `/security`, `/privacy`, or `/terms` unless the
  request is already clearly abusive.
- Log rule id, client IP hash, route, and action. Do not log patient text,
  emails, phone numbers, secrets, tokens, or provider payloads.
