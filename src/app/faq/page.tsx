import type { Metadata } from "next";
import { RedesignContentPage, staticPageContent } from "@/components/marketing/marketing-redesign";
import { faqItems } from "@/features/marketing/content/trust";

export const metadata: Metadata = {
  title: "Q&A - Dash Dental",
  description:
    "Answers for dental clinics evaluating Dash Dental: guided trial, billing, integrations, team seats, AI limitations, privacy, and security posture.",
  alternates: {
    canonical: "/faq",
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

export default function FaqPage() {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        type="application/ld+json"
      />
      <RedesignContentPage {...staticPageContent.faq} />
    </>
  );
}
