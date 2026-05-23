import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const isProductionDeployment = process.env.VERCEL_ENV === "production";
const shouldDeployPrismaMigrations =
  process.env.VERCEL === "1" && Boolean(process.env.DATABASE_URL?.trim());

function getNpmInvocation() {
  if (process.env.npm_execpath) {
    return {
      command: process.execPath,
      prefixArgs: [process.env.npm_execpath],
    };
  }

  if (process.platform === "win32") {
    const bundledNpmCli = path.join(
      path.dirname(process.execPath),
      "node_modules",
      "npm",
      "bin",
      "npm-cli.js",
    );

    if (existsSync(bundledNpmCli)) {
      return {
        command: process.execPath,
        prefixArgs: [bundledNpmCli],
      };
    }
  }

  return {
    command: "npm",
    prefixArgs: [],
  };
}

function runNpm(args: string[]) {
  const npmInvocation = getNpmInvocation();
  const command = npmInvocation.command;
  const commandArgs = [...npmInvocation.prefixArgs, ...args];
  const result = spawnSync(command, commandArgs, {
    env: process.env,
    stdio: "inherit",
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  process.exitCode = result.status ?? 1;
  if (process.exitCode !== 0) {
    process.exit(process.exitCode);
  }
}

if (isProductionDeployment) {
  runNpm(["run", "go-live:check"]);
}

if (shouldDeployPrismaMigrations) {
  runNpm(["exec", "--", "prisma", "migrate", "deploy"]);
}

runNpm(["run", "build"]);
