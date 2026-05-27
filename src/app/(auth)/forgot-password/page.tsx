import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export const metadata: Metadata = {
  title: "Reset Password - Dash Dental",
  description: "Request a secure Dash Dental password reset link.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
