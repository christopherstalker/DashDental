import type { Metadata } from "next";
import { RedesignContentPage, staticPageContent } from "@/components/marketing/marketing-redesign";

export const metadata: Metadata = {
  title: "Dashboard Docs - Dash Dental",
  description:
    "A practical guide to using the Dash Dental dashboard, inbox, queue, AI helper, billing, and setup views.",
  alternates: {
    canonical: "/docs",
  },
};

export default function DocsPage() {
  return <RedesignContentPage {...staticPageContent.docs} />;
}
