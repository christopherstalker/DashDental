import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import test from "node:test";

async function readLaunchArtifact(primaryPath: string, repairedPath?: string) {
  try {
    return await readFile(primaryPath, "utf8");
  } catch (error) {
    if (!repairedPath) {
      throw error;
    }

    return readFile(repairedPath, "utf8");
  }
}

function runGuard(env: Record<string, string | undefined>) {
  return spawnSync(
    process.execPath,
    ["--import", "tsx", "scripts/synthetic-monitor-safety.ts"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        PLAYWRIGHT_BASE_URL: "",
        SYNTHETIC_MONITOR_ALLOW_PRODUCTION: "",
        SYNTHETIC_MONITOR_BASE_URL: "",
        ...env,
      },
    },
  );
}

test("synthetic monitor guard allows local and staging targets but blocks production by default", () => {
  const local = runGuard({ PLAYWRIGHT_BASE_URL: "http://127.0.0.1:3100" });
  assert.equal(local.status, 0, local.stderr);
  assert.match(local.stdout, /guard passed/i);

  const staging = runGuard({
    SYNTHETIC_MONITOR_BASE_URL: "https://staging.dashdental.space",
  });
  assert.equal(staging.status, 0, staging.stderr);

  const production = runGuard({
    SYNTHETIC_MONITOR_BASE_URL: "https://dashdental.space",
  });
  assert.equal(production.status, 1);
  assert.match(production.stderr, /marked as production/i);

  const allowedProduction = runGuard({
    SYNTHETIC_MONITOR_ALLOW_PRODUCTION: "true",
    SYNTHETIC_MONITOR_BASE_URL: "https://dashdental.space",
  });
  assert.equal(allowedProduction.status, 0, allowedProduction.stderr);
});

test("launch rehearsal workflows use guarded monitors and expose required env gates", async () => {
  const packageJson = await readFile("package.json", "utf8");
  const syntheticWorkflow = await readFile(
    ".github/workflows/synthetic-monitor.yml",
    "utf8",
  );
  const rehearsalWorkflow = await readLaunchArtifact(
    ".github/workflows/go-live-rehearsal.yml",
    ".github/workflows/go-live-rehearsal-fixed.yml",
  );

  assert.match(packageJson, /"monitor:synthetic:guarded"/);
  assert.match(packageJson, /"monitor:preview"/);
  assert.match(syntheticWorkflow, /monitor_mode/);
  assert.match(syntheticWorkflow, /npm run monitor:preview/);
  assert.match(syntheticWorkflow, /npm run monitor:synthetic:guarded/);
  assert.match(syntheticWorkflow, /allow_production/);
  assert.match(rehearsalWorkflow, /npm run go-live:check/);
  assert.match(rehearsalWorkflow, /npm run monitor:preview/);
  assert.match(rehearsalWorkflow, /npm run monitor:synthetic:guarded/);
  assert.match(rehearsalWorkflow, /STAGING_DATABASE_URL/);
  assert.match(rehearsalWorkflow, /TURNSTILE_SECRET_KEY/);
  assert.match(rehearsalWorkflow, /LEGAL_REVIEW_APPROVED/);
});

test("staging template and checklist cover paid launch blockers", async () => {
  const stagingEnv = await readLaunchArtifact(
    ".env.staging.example",
    ".env.staging.repaired.example",
  );
  const checklist = JSON.parse(
    await readFile("docs/launch-checklist.json", "utf8"),
  ) as {
    forbiddenClaims: string[];
    requiredChecks: Array<{ id: string }>;
  };
  const runbook = await readFile("docs/production-runbook.md", "utf8");

  for (const requiredEnv of [
    "EDGE_PROTECTION_DEPLOYED",
    "REQUIRE_PUBLIC_AUTH_BOT_PROTECTION",
    "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
    "TURNSTILE_SECRET_KEY",
    "SUPPORT_OWNER_EMAIL",
    "SECURITY_CONTACT_EMAIL",
    "INCIDENT_ESCALATION_EMAIL",
    "SYNTHETIC_MONITOR_BASE_URL",
    "SYNTHETIC_MONITOR_SCHEDULED",
    "PRODUCTION_MONITOR_POLICY_APPROVED",
    "LEGAL_REVIEW_APPROVED",
    "DPA_APPROVED",
    "SUBPROCESSORS_APPROVED",
    "ORDER_FORM_APPROVED",
    "CANCELLATION_POLICY_APPROVED",
    "DATA_HANDLING_POLICY_APPROVED",
    "FIRST_CLINIC_REHEARSAL_APPROVED",
    "DATABASE_BACKUPS_CONFIRMED",
    "MANUAL_INVOICE_TEMPLATE_APPROVED",
  ]) {
    assert.match(stagingEnv, new RegExp(`^${requiredEnv}=`, "m"));
  }

  const requiredCheckIds = new Set(checklist.requiredChecks.map((item) => item.id));
  for (const id of [
    "edge_protection_deployed",
    "public_auth_bot_protection_required",
    "legal_review_approved",
    "dpa_approved",
    "subprocessors_approved",
    "order_form_approved",
    "cancellation_policy_approved",
    "data_handling_policy_approved",
    "first_clinic_rehearsal_approved",
    "database_url_ssl_params",
    "database_backups_confirmed",
    "synthetic_monitor_scheduled",
    "production_monitor_policy_approved",
    "manual_billing_ready",
    "manual_invoice_template_approved",
    "stripe_live_rehearsal_ready",
  ]) {
    assert.equal(requiredCheckIds.has(id), true, `${id} missing from checklist`);
  }

  assert.deepEqual(checklist.forbiddenClaims, [
    "SOC 2 certified",
    "HIPAA compliant",
    "ISO 27001 certified",
  ]);
  assert.match(runbook, /Staging Rehearsal/);
  assert.match(runbook, /production monitor\s+tenant and cleanup policy/i);
  assert.doesNotMatch(runbook, /SOC 2 certified|HIPAA compliant|ISO 27001 certified/i);
});
