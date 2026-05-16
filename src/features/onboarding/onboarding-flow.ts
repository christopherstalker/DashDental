export interface OnboardingStepDefinition {
  id: string;
  title: string;
  owner: string;
  route: string;
  successCriteria: string;
}

export const onboardingFlow: OnboardingStepDefinition[] = [
  {
    id: "workspace-created",
    title: "Create clinic workspace",
    owner: "Clinic owner",
    route: "/register",
    successCriteria: "Owner can sign in and sees a clinic-scoped dashboard shell.",
  },
  {
    id: "staff-access",
    title: "Confirm user roles",
    owner: "Clinic admin",
    route: "/setup",
    successCriteria: "Managers, admins, and owners match the intended operating model.",
  },
  {
    id: "integrations-connected",
    title: "Connect intake channels",
    owner: "Clinic admin",
    route: "/integrations",
    successCriteria: "Telegram and web form are active; Clinic DB config is saved.",
  },
  {
    id: "contract-approved",
    title: "Approve read-only data contract",
    owner: "IT + clinic owner",
    route: "/compliance",
    successCriteria: "Clinic DB data access contract is approved and audit recorded.",
  },
  {
    id: "first-sync",
    title: "Run first sync and validate queue",
    owner: "Operations admin",
    route: "/queue",
    successCriteria: "Imported leads appear in queue and inbox with correct tenant scope.",
  },
  {
    id: "billing-confirmed",
    title: "Confirm billing plan",
    owner: "Clinic owner",
    route: "/billing",
    successCriteria: "Billing method, payment reference, and plan limits are visible and usable.",
  },
];
