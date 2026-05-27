import type { Metadata } from "next";
import { RedesignContentPage, staticPageContent } from "@/components/marketing/marketing-redesign";

export const metadata: Metadata = {
  title: "Launch Details - Dash Dental",
  description:
    "Understand the Dash Dental guided launch, what is included, and how billing activation works.",
  alternates: {
    canonical: "/trial",
  },
};

export default function TrialPage() {
  return <RedesignContentPage {...staticPageContent.trial} />;
}
