import type { Metadata } from "next";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata: Metadata = {
  title: "Create New Password - Dash Dental",
  description: "Create a new password for your Dash Dental account.",
};

function readToken(query: { [key: string]: string | string[] | undefined }) {
  const token = query.token;
  return Array.isArray(token) ? token[0] : token;
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const query = await searchParams;
  return <ResetPasswordForm token={readToken(query) ?? ""} />;
}
