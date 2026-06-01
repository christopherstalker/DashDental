import type { Metadata } from "next";
import { DashDentalRedesignLanding } from "@/components/landing/dash-dental-redesign";

export const metadata: Metadata = {
  title: "Dash Dental - AI revenue recovery for dental clinics",
  description:
    "Dash Dental shows where dental clinics are losing patients across WhatsApp, Instagram, Telegram, and website forms, then helps recover revenue with SLA risk, priority queues, and human-reviewed AI drafts.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    description:
      "A premium AI recovery cockpit for dental clinics: money-at-risk visibility, prioritized patient queues, and staff-reviewed AI reply drafts.",
    images: [
      {
        alt: "Dash Dental live patient inbox preview",
        height: 630,
        url: "/social-preview.png?v=20260601-live-inbox",
        width: 1200,
      },
    ],
    title: "Dash Dental - Recover dental revenue before patients disappear",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    description:
      "Recover high-intent dental inquiries from patient DMs and website forms before they disappear.",
    images: ["/social-preview.png?v=20260601-live-inbox"],
    title: "Dash Dental - AI dental revenue recovery cockpit",
  },
};

export default function HomePage() {
  return <DashDentalRedesignLanding />;
}
