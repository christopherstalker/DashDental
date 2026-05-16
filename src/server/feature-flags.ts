export function isDemoActionsEnabled(): boolean {
  return process.env.ENABLE_DEMO_ACTIONS === "true";
}

export function isDevLoginEnabled(): boolean {
  return process.env.ENABLE_DEV_LOGIN === "true";
}

export function isDevBillingEnabled(): boolean {
  return process.env.ENABLE_DEV_BILLING === "true";
}

export function isProductionBuild(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}

export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production" && !isProductionBuild();
}
