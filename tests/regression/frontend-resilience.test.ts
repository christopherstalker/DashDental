import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "generated") {
        return [];
      }

      return listSourceFiles(fullPath);
    }

    return /\.(tsx|ts)$/.test(entry.name) ? [fullPath] : [];
  });
}

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

test("interactive frontend code does not use native form submission", () => {
  const offenders = listSourceFiles(join(root, "src"))
    .filter((filePath) => !filePath.includes(`${join("src", "generated")}`))
    .filter((filePath) => readFileSync(filePath, "utf8").includes("<form"));

  assert.deepEqual(offenders.map((filePath) => filePath.replace(root, "")), []);
});

test("legacy all-in-one client app is removed from the bundle surface", () => {
  assert.equal(existsSync(join(root, "src/app/dental-recovery-app.tsx")), false);
});

test("route-level error and loading boundaries cover core product segments", () => {
  for (const filePath of [
    "src/app/error.tsx",
    "src/app/global-error.tsx",
    "src/app/(auth)/error.tsx",
    "src/app/(workspace)/error.tsx",
    "src/app/demo/error.tsx",
    "src/app/platform/error.tsx",
    "src/app/support/error.tsx",
    "src/app/(auth)/loading.tsx",
    "src/app/(workspace)/loading.tsx",
    "src/app/demo/loading.tsx",
    "src/app/platform/loading.tsx",
    "src/app/support/loading.tsx",
  ]) {
    assert.equal(existsSync(join(root, filePath)), true, `${filePath} is missing`);
  }
});

test("client-visible fallback paths do not render raw caught error messages", () => {
  const offenders = [
    ...listSourceFiles(join(root, "src/app")).filter((filePath) => !filePath.includes(`${join("src", "app", "api")}`)),
    ...listSourceFiles(join(root, "src/components")),
    ...listSourceFiles(join(root, "src/features")),
  ]
    .filter((filePath) => {
      const source = readFileSync(filePath, "utf8");
      return (
        source.includes("console.error(") ||
        source.includes("error instanceof Error ? error.message") ||
        source.includes("throw new Error(result.error") ||
        source.includes("throw new Error(payload.error")
      );
    });

  assert.deepEqual(offenders.map((filePath) => filePath.replace(root, "")), []);
});

test("dynamic client API path segments are encoded through safe helpers", () => {
  const checkedFiles = [
    "src/components/inbox/redesigned-inbox.tsx",
    "src/components/settings/settings-screen.tsx",
    "src/features/inbox/components/reply-composer.tsx",
    "src/features/inbox/components/conversation-ops-panel.tsx",
    "src/features/team/components/team-actions.tsx",
  ];

  for (const filePath of checkedFiles) {
    const source = read(filePath);
    assert.match(source, /safePathSegment|conversationPathId|messagePathId/);
    assert.doesNotMatch(source, /\/api\/v1\/(?:conversations|team|integrations|ai)\/\$\{(?!safePathSegment|conversationPathId|messagePathId)/);
  }
});

test("privileged UI flows have API-layer role gates", () => {
  const checks: Array<[string, string]> = [
    ["src/app/(workspace)/integrations/page.tsx", 'getWorkspaceShellBootstrap("admin")'],
    ["src/app/api/v1/integrations/messaging/config/route.ts", 'getRequestContext(request, currentState, "admin")'],
    ["src/app/api/v1/integrations/phone/config/route.ts", 'getRequestContext(request, currentState, "admin")'],
    ["src/app/api/v1/integrations/clinic-db/contract/route.ts", 'getRequestContext(request, currentState, "owner")'],
    ["src/app/api/v1/team/members/route.ts", 'getRequestContext(request, currentState, "admin")'],
    ["src/app/api/v1/billing/checkout-session/route.ts", 'getRequestContext(request, state, "owner")'],
  ];

  for (const [filePath, expected] of checks) {
    assert.ok(read(filePath).includes(expected), `${filePath} should include ${expected}`);
  }
});

test("client bundles only read explicitly public environment variables", () => {
  const offenders = listSourceFiles(join(root, "src"))
    .filter((filePath) => readFileSync(filePath, "utf8").includes('"use client"'))
    .filter((filePath) => {
      const source = readFileSync(filePath, "utf8");
      return /process\.env\.(?!NEXT_PUBLIC_)[A-Z0-9_]+/.test(source);
    });

  assert.deepEqual(offenders.map((filePath) => filePath.replace(root, "")), []);
});
