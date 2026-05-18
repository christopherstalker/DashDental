import type { Metadata } from "next";
import { RegisterForm } from "@/features/auth/components/register-form";
import { getPublicAuthTurnstileSiteKey } from "@/server/public-auth-bot-protection";

export const metadata: Metadata = {
  title: "Start Trial — Dash Dental",
  description:
    "Create a Dash Dental clinic workspace for a 14-day guided trial, or preview the sample dashboard before signup.",
};

export default function RegisterPage() {
  return (
    <RegisterForm turnstileSiteKey={getPublicAuthTurnstileSiteKey()} />
  );
}
