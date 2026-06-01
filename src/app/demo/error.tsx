"use client";

import { RouteErrorFallback } from "@/features/app-shell/components/route-error-fallback";

export default function DemoError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <RouteErrorFallback
      backHref="/demo"
      backLabel="Back to demo"
      error={error}
      title="The demo route is temporarily unavailable."
      unstable_retry={unstable_retry}
    />
  );
}
