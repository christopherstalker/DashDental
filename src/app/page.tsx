import type { Metadata } from "next";
import { DashDentalHomepage } from "@/features/marketing/components/dash-dental-homepage";

export const metadata: Metadata = {
  title: "Dash Dental - Missed-message recovery cockpit for dental clinics",
  description:
    "Dash Dental helps dental clinics recover high-intent patient leads from WhatsApp, Instagram, Telegram, and website forms with a prioritized recovery queue and human-reviewed AI drafts.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    description:
      "A premium recovery cockpit for dental clinics: money-at-risk visibility, prioritized patient queues, and staff-reviewed AI reply drafts.",
    images: [
      {
        alt: "Dash Dental recovery cockpit preview",
        height: 1080,
        url: "/dashboard-preview.png",
        width: 1600,
      },
    ],
    title: "Dash Dental - Recover missed dental leads before they disappear",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    description:
      "Recover high-intent dental leads from patient DMs and website forms before they disappear.",
    images: ["/dashboard-preview.png"],
    title: "Dash Dental - Missed-message recovery cockpit",
  },
};

export default function HomePage() {
  return <DashDentalHomepage />;
}
