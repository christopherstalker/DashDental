export function isDemoActionsEnabled(): boolean {
  return process.env.ENABLE_DEMO_ACTIONS === "true";
}

export function isDevLoginEnabled(): boolean {
  return process.env.ENABLE_DEV_LOGIN === "true";
}

export function isDevBillingEnabled(): boolean {
  return process.env.ENABLE_DEV_BILLING === "true";
}

function isLocalhostUrl(value: string): boolean {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

export function canUseDirectBillingPlanChange({
  env = process.env,
  requestUrl,
}: {
  env?: NodeJS.ProcessEnv;
  requestUrl: string;
}): boolean {
  if (env.ENABLE_DEV_BILLING === "true") {
    return true;
  }

  if (env.NODE_ENV !== "production" || env.NEXT_PHASE === "phase-production-build") {
    return true;
  }

  // Local production builds need a working upgrade path for owner QA without
  // enabling unsafe direct plan mutation on deployed preview/production hosts.
  return env.VERCEL !== "1" && isLocalhostUrl(requestUrl);
}

export function isEmailVerificationRequired(): boolean {
  return process.env.REQUIRE_EMAIL_VERIFICATION === "true";
}

export function areManagedConnectorsEnabled(): boolean {
  if (process.env.ENABLE_MANAGED_CONNECTORS === "true") {
    return true;
  }

  return !isProductionRuntime();
}

export function isProductionBuild(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}

export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production" && !isProductionBuild();
}
