import "dotenv/config";

const productionHosts = new Set(["dashdental.space", "www.dashdental.space"]);

function monitorBaseUrl() {
  return (
    process.env.SYNTHETIC_MONITOR_BASE_URL?.trim() ||
    process.env.PLAYWRIGHT_BASE_URL?.trim() ||
    "http://127.0.0.1:3100"
  );
}

function allowProductionMonitor() {
  return process.env.SYNTHETIC_MONITOR_ALLOW_PRODUCTION?.trim().toLowerCase() === "true";
}

function parseMonitorUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    console.error(`Synthetic monitor guard blocked: invalid monitor URL "${value}".`);
    process.exit(1);
  }
}

const url = parseMonitorUrl(monitorBaseUrl());
const isProduction = productionHosts.has(url.hostname.toLowerCase());

if (isProduction && !allowProductionMonitor()) {
  console.error(
    `Synthetic monitor guard blocked: ${url.origin} is marked as production. Set SYNTHETIC_MONITOR_ALLOW_PRODUCTION=true only for approved production monitor runs.`,
  );
  process.exit(1);
}

console.log(`Synthetic monitor guard passed for ${url.origin}.`);
