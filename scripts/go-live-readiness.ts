import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import nextEnv from "@next/env";
import {
  buildGoLiveReadinessPlan,
  requiredLaunchDocs,
  requiredLegalDocs,
} from "../src/server/go-live-readiness";

const { loadEnvConfig } = nextEnv;
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "production";
}
loadEnvConfig(process.cwd(), process.env.NODE_ENV === "development");

const legalDocs = new Set<string>(
  requiredLegalDocs.filter((filePath) => existsSync(filePath)),
);
const launchDocs = new Set<string>(
  requiredLaunchDocs.filter((filePath) => existsSync(filePath)),
);
const plan = buildGoLiveReadinessPlan({ legalDocs, launchDocs });
const repoChecks = buildRepositoryChecks();

console.log("Dental Recovery go-live readiness");
console.log(
  `Status: ${
    plan.status === "ready" && !repoChecks.some((check) => check.level === "block")
      ? "ready"
      : "blocked"
  }`,
);

for (const check of [...plan.checks, ...repoChecks]) {
  const label =
    check.level === "pass" ? "PASS" : check.level === "warn" ? "WARN" : "BLOCK";

  console.log(`${label} ${check.id} - ${check.description}`);
  if (check.level !== "pass") {
    console.log(`  Remediation: ${check.remediation}`);
  }
}

if (plan.status !== "ready" || repoChecks.some((check) => check.level === "block")) {
  process.exit(1);
}

type ScriptCheck = {
  description: string;
  id: string;
  level: "block" | "pass" | "warn";
  remediation: string;
};

function pass(id: string, description: string, remediation = "No action needed."): ScriptCheck {
  return { description, id, level: "pass", remediation };
}

function block(id: string, description: string, remediation: string): ScriptCheck {
  return { description, id, level: "block", remediation };
}

function safeRead(filePath: string) {
  try {
    return readFileSync(filePath, "utf8");
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

function readResult(filePath: string) {
  try {
    return { ok: true as const, content: readFileSync(filePath, "utf8") };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function listTextFiles(root: string) {
  const ignoredDirectoryNames = new Set([
    ".cursor",
    ".data",
    ".git",
    ".tmp",
    ".vercel",
    "build",
    "coverage",
    "dist",
    "node_modules",
    "out",
    "playwright-report",
    "scripts",
    "test-results",
    "tests",
  ]);
  const ignoredRelativeDirectories = new Set([
    "backend/dist",
    "docs/superpowers",
    "src/generated",
  ]);
  const ignoredExactFiles = new Set([
    "scripts/synthetic-monitor-guard.ts",
    "src/features/i18n/generated-translations.ts",
  ]);
  const allowedExtensions = new Set([
    ".css",
    ".env",
    ".example",
    ".html",
    ".json",
    ".md",
    ".mjs",
    ".ts",
    ".tsx",
    ".txt",
    ".yml",
    ".yaml",
  ]);
  const files: string[] = [];

  function shouldIgnoreDirectory(entryName: string, relativePath: string) {
    return (
      entryName.startsWith(".next") ||
      ignoredDirectoryNames.has(entryName) ||
      ignoredRelativeDirectories.has(relativePath)
    );
  }

  function walk(current: string) {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      const relativePath = path.relative(root, fullPath).replace(/\\/g, "/");

      if (entry.isDirectory()) {
        if (!shouldIgnoreDirectory(entry.name, relativePath)) {
          walk(fullPath);
        }
        continue;
      }

      if (
        entry.isFile() &&
        !ignoredExactFiles.has(relativePath) &&
        !relativePath.endsWith(".log") &&
        allowedExtensions.has(path.extname(entry.name))
      ) {
        files.push(relativePath);
      }
    }
  }

  walk(root);
  return files;
}

function findLines(pattern: RegExp, files: string[]) {
  const matches: string[] = [];
  for (const file of files) {
    const result = readResult(file);
    if (!result.ok) {
      continue;
    }

    result.content.split(/\r?\n/).forEach((line, index) => {
      if (pattern.test(line)) {
        matches.push(`${file}:${index + 1}: ${line.trim()}`);
      }
    });
  }
  return matches;
}

function hasRequiredText(filePath: string, snippets: string[]) {
  const result = readResult(filePath);
  if (!result.ok) {
    return { ok: false, reason: `${filePath} is unreadable: ${result.error}` };
  }

  const missing = snippets.filter((snippet) => !result.content.includes(snippet));
  return {
    ok: missing.length === 0,
    reason: missing.length ? `${filePath} missing: ${missing.join(", ")}` : "",
  };
}

function hasRequiredTextAcross(filePaths: string[], snippets: string[]) {
  const results = filePaths.map((filePath) => ({ filePath, result: readResult(filePath) }));
  const unreadable = results.filter((item) => !item.result.ok);
  if (unreadable.length > 0) {
    return {
      ok: false,
      reason: unreadable
        .map((item) =>
          item.result.ok ? "" : `${item.filePath} is unreadable: ${item.result.error}`,
        )
        .filter(Boolean)
        .join("; "),
    };
  }

  const content = results
    .map((item) => (item.result.ok ? item.result.content : ""))
    .join("\n");
  const missing = snippets.filter((snippet) => !content.includes(snippet));

  return {
    ok: missing.length === 0,
    reason: missing.length
      ? `${filePaths.join(", ")} missing: ${missing.join(", ")}`
      : "",
  };
}

function buildRepositoryChecks(): ScriptCheck[] {
  const root = process.cwd();
  const checks: ScriptCheck[] = [];
  const requiredReadableFiles = [
    ".env.example",
    ".env.production.example",
    ".env.staging.template",
    ".github/workflows/go-live-rehearsal-fixed.yml",
    ".github/workflows/synthetic-monitor.yml",
  ];

  const unreadableFiles = requiredReadableFiles.filter((file) => !readResult(file).ok);
  checks.push(
    unreadableFiles.length === 0
      ? pass("launch_files_readable", "Launch env examples and workflows are readable.")
      : block(
          "launch_files_readable",
          `Unreadable launch files: ${unreadableFiles.join(", ")}.`,
          "Repair the filesystem entry or recreate the file, then rerun npm run go-live:check.",
        ),
  );

  const criticalRoutes = [
    "src/app/page.tsx",
    "src/app/demo/page.tsx",
    "src/app/pricing/page.tsx",
    "src/app/support/page.tsx",
    "src/app/security/page.tsx",
    "src/app/privacy/page.tsx",
    "src/app/about/page.tsx",
    "src/app/(auth)/register/page.tsx",
  ];
  const missingRoutes = criticalRoutes.filter((file) => !existsSync(file));
  checks.push(
    missingRoutes.length === 0
      ? pass("critical_public_routes_present", "Critical public and registration routes exist.")
      : block(
          "critical_public_routes_present",
          `Missing critical routes: ${missingRoutes.join(", ")}.`,
          "Restore the missing App Router page files.",
        ),
  );

  const textFiles = listTextFiles(root);
  const personalEmailPattern = new RegExp(["g", "mail"].join(""), "i");
  const personalNamePattern = new RegExp(["chris", "stalker"].join(""), "i");
  const personalEmailMatches = findLines(
    new RegExp(`${personalEmailPattern.source}|${personalNamePattern.source}`, "i"),
    textFiles,
  );
  checks.push(
    personalEmailMatches.length === 0
      ? pass("no_personal_email_references", "No personal email/name references found in scanned text files.")
      : block(
          "no_personal_email_references",
          `Personal email/name references found: ${personalEmailMatches.slice(0, 5).join(" | ")}`,
          "Remove personal mailbox/name references from public and repository text.",
        ),
  );

  const contactSource = safeRead("src/features/marketing/content/dash-dental.ts");
  const contactOk =
    contactSource.includes('supportEmail = "support@dashdental.space"') &&
    contactSource.includes('securityEmail = "security@dashdental.space"') &&
    contactSource.includes('privacyEmail = "privacy@dashdental.space"');
  checks.push(
    contactOk
      ? pass("public_contact_emails_domain", "Public contact emails use dashdental.space domain inboxes.")
      : block(
          "public_contact_emails_domain",
          "Public contact constants are missing required dashdental.space emails.",
          "Set support/security/privacy contacts in src/features/marketing/content/dash-dental.ts.",
        ),
  );

  const badComplianceLines = findLines(/\b(SOC 2 certified|HIPAA compliant|ISO 27001 certified)\b/i, textFiles).filter(
    (line) =>
      !line.startsWith("docs/launch-checklist.json:") &&
      !/\b(no|not|unless|avoid|does not|do not|should not|without fake|unsupported|forbidden)\b/i.test(line),
  );
  checks.push(
    badComplianceLines.length === 0
      ? pass("no_fake_compliance_claims", "No unsupported SOC 2/HIPAA/ISO certification claims found.")
      : block(
          "no_fake_compliance_claims",
          `Risky compliance claims found: ${badComplianceLines.slice(0, 5).join(" | ")}`,
          "Rewrite certification/compliance copy as boundaries rather than claims.",
        ),
  );

  const badRevenueLines = findLines(/guarantee(d)?[^.\n]*revenue|revenue[^.\n]*guarantee(d)?/i, textFiles).filter(
    (line) => !/\b(no|not|never|without)\b/i.test(line),
  );
  checks.push(
    badRevenueLines.length === 0
      ? pass("no_guaranteed_revenue_claims", "No guaranteed-revenue claims found.")
      : block(
          "no_guaranteed_revenue_claims",
          `Risky revenue claims found: ${badRevenueLines.slice(0, 5).join(" | ")}`,
          "Rewrite ROI copy as planning estimates only.",
        ),
  );

  const trialContradictions = findLines(/\b3[- ]day\b/i, textFiles);
  checks.push(
    trialContradictions.length === 0
      ? pass("trial_copy_consistent", "No unsupported short-trial references found in scanned text files.")
      : block(
          "trial_copy_consistent",
          `Contradictory trial copy found: ${trialContradictions.slice(0, 5).join(" | ")}`,
          "Update trial copy/tests/docs to the supported 14-day trial or remove duration claims.",
        ),
  );

  const sampleDashboard = hasRequiredTextAcross(
    [
      "src/features/marketing/components/sample-dashboard-console.tsx",
      "src/features/dashboard/components/recovery-cockpit.tsx",
      "src/features/i18n/translations.ts",
    ],
    [
      "sampleMode",
      "dashboard.cockpit.sampleNoticeTitle",
      "dashboard.cockpit.sampleNoticeBody",
      "dashboard.cockpit.draftNotice",
      "Sample data only",
      "Draft only - staff review required",
      "This dashboard uses illustrative data and does not show real patients.",
    ],
  );
  checks.push(
    sampleDashboard.ok
      ? pass("sample_dashboard_disclosures_present", "Sample dashboard has sample-data and human-review disclosures.")
      : block(
          "sample_dashboard_disclosures_present",
          sampleDashboard.reason,
          "Restore sample-data and Draft-only staff-review labels in the sample dashboard.",
        ),
  );

  const workflow = hasRequiredText(".github/workflows/go-live-rehearsal-fixed.yml", [
    "npm run lint",
    "npm run typecheck",
    "npm run test:regression",
    "npm run go-live:check",
  ]);
  checks.push(
    workflow.ok
      ? pass("go_live_workflow_validates_core_commands", "Go-live workflow runs core validation commands.")
      : block(
          "go_live_workflow_validates_core_commands",
          workflow.reason,
          "Repair .github/workflows/go-live-rehearsal-fixed.yml with lint/typecheck/test/go-live steps.",
        ),
  );

  const envExample = hasRequiredText(".env.production.example", [
    "APP_URL=",
    "DATABASE_URL=",
    "REDIS_URL=",
    "SESSION_SECRET=",
    "RESEND_API_KEY=",
    "EMAIL_FROM=",
    "NEXT_PUBLIC_TURNSTILE_SITE_KEY=",
    "TURNSTILE_SECRET_KEY=",
    "SUPPORT_OWNER_NAME=",
    "support@dashdental.space",
    "security@dashdental.space",
  ]);
  const stagingTemplate = hasRequiredText(".env.staging.template", [
    "APP_URL=",
    "DATABASE_URL=",
    "REDIS_URL=",
    "SESSION_SECRET=",
    "RESEND_API_KEY=",
    "EMAIL_FROM=",
    "NEXT_PUBLIC_TURNSTILE_SITE_KEY=",
    "TURNSTILE_SECRET_KEY=",
    "SUPPORT_OWNER_NAME=",
    "support@dashdental.space",
    "security@dashdental.space",
  ]);
  checks.push(
    envExample.ok && stagingTemplate.ok
      ? pass("launch_env_templates_complete", "Production and staging env templates cover required launch variables.")
      : block(
          "launch_env_templates_complete",
          [envExample.reason, stagingTemplate.reason].filter(Boolean).join("; "),
          "Repair .env.production.example and .env.staging.template with safe placeholders for required launch variables.",
        ),
  );

  return checks;
}
