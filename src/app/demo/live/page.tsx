import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  decodeDemoSession,
  DEMO_SESSION_COOKIE_NAME,
  isDemoSessionActive,
} from "@/server/demo-session";
import { DemoExpiredState, SelfServeDemo } from "@/components/demo/self-serve-demo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live 15-minute Demo - Dash Dental",
  description:
    "Open an anonymous fake-data Dash Dental workspace for 15 minutes without a support call.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DemoLivePage() {
  const cookieStore = await cookies();
  const payload = decodeDemoSession(cookieStore.get(DEMO_SESSION_COOKIE_NAME)?.value);

  if (!isDemoSessionActive(payload)) {
    return <DemoExpiredState />;
  }

  return <SelfServeDemo expiresAt={new Date(payload.expiresAt).toISOString()} />;
}
