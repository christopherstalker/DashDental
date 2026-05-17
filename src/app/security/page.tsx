import type { Metadata } from "next";
import { MarketingShell } from "@/features/marketing/components/landing-system";
import { SecurityTrustContent } from "@/features/marketing/components/trust-support-pages";

export const metadata: Metadata = {
  title: "Security and Trust - Dash Dental",
  description:
    "Dash Dental trust center for patient inquiry recovery: security controls, privacy boundaries, AI limitations, compliance posture, incident contact, and honest certification claims.",
  alternates: {
    canonical: "/security",
  },
  openGraph: {
    title: "Security and Trust - Dash Dental",
    description:
      "Security, privacy, AI boundaries, and compliance posture for Dash Dental patient inquiry recovery workflows.",
    url: "/security",
  },
};

export default function SecurityPage() {
  return (
    <MarketingShell launchPage="/security">
      <SecurityTrustContent />
    </MarketingShell>
  );
}
