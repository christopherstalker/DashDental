import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next*/**",
    ".next-codex*/**",
    ".next-codex-build/**",
    ".next-codex-dev/**",
    "out/**",
    "build/**",
    "backend/**",
    ".tmp/**",
    ".data/**",
    ".vercel/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "src/generated/**",
    "scripts/synthetic-monitor-guard.ts",
    "*.log",
    "*.err.log",
    "*.out.log",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
