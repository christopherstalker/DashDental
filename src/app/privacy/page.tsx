import type { Metadata } from "next";
import { RedesignContentPage, staticPageContent } from "@/components/marketing/marketing-redesign";

export const metadata: Metadata = {
  title: "Privacy - Dash Dental",
  description:
    "Plain-English privacy summary for Dash Dental: clinic account data, team users, inbound patient messages, channel metadata, billing, AI boundaries, and data requests.",
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title: "Privacy - Dash Dental",
    description:
      "Clear privacy boundaries for patient-lead intake and front-desk recovery workflows.",
    url: "/privacy",
  },
};

export default function PrivacyPage() {
  return <RedesignContentPage {...staticPageContent.privacy} />;
}
