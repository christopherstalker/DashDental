import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { LanguageRuntime } from "@/features/i18n/components/language-runtime";
import { LaunchEventTracker } from "@/features/launch-analytics/components/launch-event-tracker";
import { ThemeRuntime } from "@/features/theme/components/theme-runtime";
import "./globals.css";
import "@/styles/tokens.css";
import "@/styles/components.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://dashdental.space"),
  title: {
    default: "Dash Dental - Recover missed dental leads from WhatsApp, Instagram & website forms",
    template: "%s | Dash Dental",
  },
  description:
    "Dash Dental helps dental clinics prioritize unanswered patient messages, estimate money at risk, and recover missed consults across WhatsApp, Instagram, Telegram, and website forms.",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [{ url: "/favicon.svg?v=4", sizes: "any", type: "image/svg+xml" }],
    shortcut: [{ url: "/favicon.svg?v=4" }],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "Dash Dental",
    description:
      "Missed-message recovery for dental clinics across WhatsApp, Instagram, Telegram, and website forms.",
    images: [
      {
        alt: "Dash Dental dashboard preview",
        height: 1080,
        url: "/dashboard-preview.png",
        width: 1600,
      },
    ],
    locale: "en_US",
    siteName: "Dash Dental",
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    description:
      "Prioritize unanswered patient messages, estimate money at risk, and recover missed consults.",
    images: ["/dashboard-preview.png"],
    title: "Dash Dental",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      data-theme="dark"
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <ThemeRuntime />
        <LanguageRuntime />
        <LaunchEventTracker />
        {children}
      </body>
    </html>
  );
}
