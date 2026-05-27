import type { Metadata } from "next";
import { RedesignContentPage, staticPageContent } from "@/components/marketing/marketing-redesign";

export const metadata: Metadata = {
  title: "Integrations - Dash Dental",
  description:
    "Dash Dental integration matrix for WhatsApp, Instagram, Telegram, website forms, clinic context, and manual call notes.",
  alternates: {
    canonical: "/integrations-guide",
  },
  openGraph: {
    title: "Integrations - Dash Dental",
    description:
      "See channel status, setup type, and notes for Dash Dental patient-message recovery integrations.",
    url: "/integrations-guide",
  },
};

export default function IntegrationsGuidePage() {
  return <RedesignContentPage {...staticPageContent.integrations} />;
}
