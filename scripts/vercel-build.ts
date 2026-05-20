import { spawnSync } from "node:child_process";

const isProductionDeployment = process.env.VERCEL_ENV === "production";
const npmCli = process.env.npm_execpath;

function runNpm(args: string[]) {
  const command = npmCli ? process.execPath : "npm";
  const commandArgs = npmCli ? [npmCli, ...args] : args;
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

runNpm(["run", "build"]);
