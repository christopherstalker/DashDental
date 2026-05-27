import type { Metadata } from "next";
import { RedesignContentPage, staticPageContent } from "@/components/marketing/marketing-redesign";

export const metadata: Metadata = {
  title: "About - Dash Dental",
  description:
    "Dash Dental is built for dental teams that cannot afford to miss patient messages across WhatsApp, Instagram, Telegram, and website forms.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About - Dash Dental",
    description:
      "Learn why Dash Dental focuses on missed-message recovery for dental clinics.",
    url: "/about",
  },
};

export default function AboutPage() {
  return <RedesignContentPage {...staticPageContent.about} />;
}
