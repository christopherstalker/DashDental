import type { Metadata } from "next";
import { RedesignContentPage, staticPageContent } from "@/components/marketing/marketing-redesign";

export const metadata: Metadata = {
  title: "Dash Dental Terms | Trial, billing, integrations, AI limits",
  description:
    "Service terms for Dash Dental covering free trial, manual invoice billing, acceptable use, integrations, AI limitations, and availability boundaries.",
  alternates: {
    canonical: "/terms",
  },
};

export default function TermsPage() {
  return <RedesignContentPage {...staticPageContent.terms} />;
}
