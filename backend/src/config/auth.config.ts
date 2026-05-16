import { registerAs } from '@nestjs/config';

function readAuthSecret(name: string, developmentFallback: string): string {
  const value = process.env[name]?.trim();
  if (value) {
    return value;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${name} is required in production.`);
  }

  return developmentFallback;
}

export default registerAs('auth', () => ({
  accessSecret: readAuthSecret(
    'JWT_ACCESS_SECRET',
    'development-only-dental-recovery-access-secret',
  ),
  refreshSecret: readAuthSecret(
    'JWT_REFRESH_SECRET',
    'development-only-dental-recovery-refresh-secret',
  ),
  accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
  refreshTtl: process.env.JWT_REFRESH_TTL ?? '30d',
  oidc: {
    issuerUrl: process.env.OAUTH_ISSUER_URL ?? '',
    clientId: process.env.OAUTH_CLIENT_ID ?? '',
    clientSecret: process.env.OAUTH_CLIENT_SECRET ?? '',
    redirectUri: process.env.OAUTH_REDIRECT_URI ?? '',
  },
}));
