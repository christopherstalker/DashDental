import { RecoveryCockpit } from "@/features/dashboard/components/recovery-cockpit";
import { primaryCta } from "@/features/marketing/content/dash-dental";

export function SampleDashboardConsole() {
  return (
    <RecoveryCockpit
      ctaHref="/support#request"
      ctaLabel={primaryCta}
      sampleMode
      userLabel="Demo owner view"
      workspaceName="Bright Smiles Clinic"
    />
  );
}
