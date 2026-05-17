import type { Metadata } from "next";
import { MarketingShell } from "@/features/marketing/components/landing-system";
import { SupportHubContent } from "@/features/marketing/components/trust-support-pages";

export const metadata: Metadata = {
  title: "Support Center - Dash Dental",
  description:
    "Get Dash Dental support for onboarding, WhatsApp, Instagram, Telegram, website forms, billing, AI drafts, privacy requests, incidents, and clinic team workflows.",
  alternates: {
    canonical: "/support",
  },
  openGraph: {
    title: "Support Center - Dash Dental",
    description:
      "Operational support hub for Dash Dental onboarding, integrations, billing, AI drafts, and incident reporting.",
    url: "/support",
  },
};

export default function SupportPage() {
  return (
    <MarketingShell launchPage="/support">
      <SupportHubContent />
    </MarketingShell>
  );
}
