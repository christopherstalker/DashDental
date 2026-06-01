"use client";

import { RouteErrorFallback } from "@/features/app-shell/components/route-error-fallback";

export default function SupportError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <RouteErrorFallback
      backHref="/support"
      backLabel="Back to support"
      error={error}
      title="Support intake is temporarily unavailable."
      unstable_retry={unstable_retry}
    />
  );
}
