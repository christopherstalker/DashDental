import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { LanguageRuntime } from "@/features/i18n/components/language-runtime";
import { LaunchEventTracker } from "@/features/launch-analytics/components/launch-event-tracker";
import { ThemeRuntime } from "@/features/theme/components/theme-runtime";
import "./globals.css";
import "./premium-system.css";

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
  const themeBootScript = `
    try {
      var raw = localStorage.getItem("dental-recovery:theme:v3") || localStorage.getItem("dental-recovery:theme:v2");
      var mode = raw ? JSON.parse(raw).mode : "dark";
      if (mode !== "light" && mode !== "dark" && mode !== "system") mode = "dark";
      var resolved = mode === "system" ? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark") : mode;
      document.documentElement.dataset.themePreference = mode;
      document.documentElement.dataset.theme = resolved;
    } catch (_) {}
  `;
  const launchTrackerBootScript = `
    (function () {
      function readNumber(value) {
        if (!value) return undefined;
        var parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
      }

      function append(body, key, value) {
        if (typeof value === "string" && value.trim()) {
          body.set(key, value.trim());
          return;
        }

        if (typeof value === "number" && Number.isFinite(value)) {
          body.set(key, String(value));
        }
      }

      function track(element) {
        var eventName = element && element.dataset ? element.dataset.launchEvent : "";
        if (!eventName) return;

        var anchor = element instanceof HTMLAnchorElement ? element : element.closest("a");
        var body = new URLSearchParams();
        append(body, "event", eventName);
        append(body, "billingStatus", element.dataset.launchBillingStatus);
        append(body, "completedGates", readNumber(element.dataset.launchCompletedGates));
        append(body, "locale", document.documentElement.lang || "en");
        append(body, "onboardingStep", element.dataset.launchOnboardingStep);
        append(body, "page", element.dataset.launchPage || window.location.pathname);
        append(body, "plan", element.dataset.launchPlan);
        append(body, "role", element.dataset.launchRole);
        append(body, "section", element.dataset.launchSection);
        append(body, "setupProgress", readNumber(element.dataset.launchSetupProgress));
        append(body, "source", element.dataset.launchSource);
        append(body, "target", element.dataset.launchTarget || (anchor && anchor.getAttribute("href")));
        append(body, "totalGates", readNumber(element.dataset.launchTotalGates));

        if (!body.toString()) return;

        fetch("/api/v1/launch/events", {
          body: body.toString(),
          credentials: "same-origin",
          headers: { "content-type": "application/x-www-form-urlencoded;charset=UTF-8" },
          keepalive: true,
          method: "POST"
        }).catch(function () {});
      }

      function handleEvent(event) {
        var target = event.target && event.target.closest ? event.target.closest("[data-launch-event]") : null;
        if (!target) return;
        event.__dashLaunchTracked = true;
        track(target);
      }

      document.addEventListener("click", handleEvent, true);
      document.addEventListener("submit", handleEvent, true);
    })();
  `;

  return (
    <html
      data-theme="dark"
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <script dangerouslySetInnerHTML={{ __html: launchTrackerBootScript }} />
        <ThemeRuntime />
        <LanguageRuntime />
        <LaunchEventTracker />
        {children}
      </body>
    </html>
  );
}
