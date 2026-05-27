import type { Metadata } from "next";
import { VerifyEmailResult } from "@/features/auth/components/verify-email-result";

export const metadata: Metadata = {
  title: "Verify Email - Dash Dental",
  description: "Verify your Dash Dental work email.",
};

function readToken(query: { [key: string]: string | string[] | undefined }) {
  const token = query.token;
  return Array.isArray(token) ? token[0] : token;
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const query = await searchParams;
  return <VerifyEmailResult token={readToken(query) ?? ""} />;
}
