import type { Metadata } from "next";
import { MarketingShell } from "@/features/marketing/components/landing-system";
import { SupportHubContent } from "@/features/marketing/components/trust-support-pages";

export const metadata: Metadata = {
  title: "Support Center - Dash Dental",
  description:
    "Get Dash Dental support for onboarding, WhatsApp, Instagram, Telegram, website forms, billing, AI drafts, privacy requests, incidents, and clinic team workflows.",
  alternates: {
    canonical: "/support",
  },
  openGraph: {
    title: "Support Center - Dash Dental",
    description:
      "Operational support hub for Dash Dental onboarding, integrations, billing, AI drafts, and incident reporting.",
    url: "/support",
  },
};

function readQueryValue(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const initialRequest = {
    category: readQueryValue(query, "category"),
    channel: readQueryValue(query, "channel"),
    clinic: readQueryValue(query, "clinic"),
    email: readQueryValue(query, "email"),
    message: readQueryValue(query, "message"),
    name: readQueryValue(query, "name"),
    urgency: readQueryValue(query, "urgency"),
  };

  return (
    <MarketingShell launchPage="/support">
      <SupportHubContent initialRequest={initialRequest} />
    </MarketingShell>
  );
}
