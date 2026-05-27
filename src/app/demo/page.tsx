import type { Metadata } from "next";
import { DemoRedesignPage } from "@/components/marketing/marketing-redesign";

export const metadata: Metadata = {
  title: "Sample Dashboard - Dash Dental",
  description:
    "Try a no-login Dash Dental sample workflow with priority patient queue, SLA pressure, owner visibility, and human-reviewed AI reply drafts.",
  alternates: {
    canonical: "/demo",
  },
  openGraph: {
    title: "Sample Dashboard - Dash Dental",
    description:
      "A public sample dashboard that shows how missed-message recovery works before signup.",
    url: "/demo",
  },
};

export default function DemoPage() {
  return <DemoRedesignPage />;
}
