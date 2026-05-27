import type { Metadata } from "next";
import { PricingRedesignPage } from "@/components/marketing/marketing-redesign";

export const metadata: Metadata = {
  title: "Pricing - Dash Dental",
  description:
    "Compare Dash Dental release plans for missed-message recovery, owner reporting, safe AI-assisted drafts, and guided clinic onboarding.",
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    title: "Pricing - Dash Dental",
    description:
      "Plans for dental clinics that want to recover unanswered patient messages without replacing their CRM.",
    url: "/pricing",
  },
};

export default function PricingPage() {
  return <PricingRedesignPage />;
}
