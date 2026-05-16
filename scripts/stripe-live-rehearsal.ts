import "dotenv/config";
import { buildStripeLiveModeRehearsalPlan } from "../src/server/stripe-rehearsal";

const plan = buildStripeLiveModeRehearsalPlan();

console.log("Stripe live-mode rehearsal");
console.log(`Status: ${plan.status}`);

for (const check of plan.checks) {
  console.log(`${check.ok ? "PASS" : "BLOCK"} ${check.id} - ${check.description}`);
  if (!check.ok) {
    console.log(`  Remediation: ${check.remediation}`);
  }
}

if (plan.status !== "ready") {
  process.exitCode = 1;
}
