import type { Metadata } from "next";
import { SecurityRedesignPage } from "@/components/marketing/marketing-redesign";

export const metadata: Metadata = {
  title: "Security and Trust - Dash Dental",
  description:
    "Dash Dental trust center for patient inquiry recovery: security controls, privacy boundaries, AI limitations, and honest certification claims.",
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
  return <SecurityRedesignPage />;
}
