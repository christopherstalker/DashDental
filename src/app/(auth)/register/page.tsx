import type { Metadata } from "next";
import { RegisterForm } from "@/features/auth/components/register-form";
import { getPublicAuthTurnstileSiteKey } from "@/server/public-auth-bot-protection";

export const metadata: Metadata = {
  title: "Create Account - Dash Dental",
  description:
    "Create a Dash Dental account and clinic workspace, then open the dashboard from the account hub.",
};

export default function RegisterPage() {
  return (
    <RegisterForm turnstileSiteKey={getPublicAuthTurnstileSiteKey()} />
  );
}
