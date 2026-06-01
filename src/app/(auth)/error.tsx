"use client";

import { RouteErrorFallback } from "@/features/app-shell/components/route-error-fallback";

export default function AuthError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <RouteErrorFallback
      backHref="/"
      backLabel="Back to public site"
      error={error}
      title="Account access is temporarily unavailable."
      unstable_retry={unstable_retry}
    />
  );
}
