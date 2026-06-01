"use client";

import { RouteErrorFallback } from "@/features/app-shell/components/route-error-fallback";

export default function WorkspaceError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <RouteErrorFallback
      backHref="/workspaces"
      backLabel="Back to account hub"
      error={error}
      title="Workspace data is temporarily unavailable."
      unstable_retry={unstable_retry}
    />
  );
}
