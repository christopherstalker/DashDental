import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { LanguageRuntime } from "@/features/i18n/components/language-runtime";
import { LaunchEventTracker } from "@/features/launch-analytics/components/launch-event-tracker";
import { PwaRuntime } from "@/features/pwa/components/pwa-runtime";
import { ThemeBootScript } from "@/features/theme/components/theme-boot-script";
import { ThemeRuntime } from "@/features/theme/components/theme-runtime";
import "./globals.css";
import "@/styles/tokens.css";
import "@/styles/components.css";

const inter = Inter({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-inter",
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
    icon: [{ url: "/icon-512.png?v=5", sizes: "512x512", type: "image/png" }],
    shortcut: [{ url: "/icon-192.png?v=5" }],
    apple: [{ url: "/apple-touch-icon.png?v=5", sizes: "180x180", type: "image/png" }],
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
      className={`${inter.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <ThemeBootScript />
        <ThemeRuntime />
        <PwaRuntime />
        <LanguageRuntime />
        <LaunchEventTracker />
        {children}
      </body>
    </html>
  );
}
