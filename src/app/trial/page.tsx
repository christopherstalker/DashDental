import type { Metadata } from "next";
import { RedesignContentPage, staticPageContent } from "@/components/marketing/marketing-redesign";

export const metadata: Metadata = {
  title: "Start Trial - Dash Dental",
  description:
    "Understand the 14-day Dash Dental guided trial, what is included, what happens after trial, and how billing activation works.",
  alternates: {
    canonical: "/trial",
  },
};

export default function TrialPage() {
  return <RedesignContentPage {...staticPageContent.trial} />;
}
