"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCw, ShieldAlert } from "lucide-react";

export function RouteErrorFallback({
  backHref,
  backLabel,
  error,
  title,
  unstable_retry,
}: {
  backHref: string;
  backLabel: string;
  error: Error & { digest?: string };
  title: string;
  unstable_retry: () => void;
}) {
  useEffect(() => {
    if (error.digest) {
      console.warn("Dash Dental segment error", { digest: error.digest });
    }
  }, [error.digest]);

  return (
    <main className="safe-fallback-page">
      <section className="safe-fallback-card">
        <div className="safe-fallback-mark danger">
          <ShieldAlert size={22} />
        </div>
        <p className="recovery-kicker">Recoverable page error</p>
        <h1>{title}</h1>
        <p>
          This screen did not load cleanly. Sensitive workspace data is hidden
          while Dash Dental recovers the route.
        </p>
        <div className="safe-fallback-actions">
          <button className="recovery-primary-button" onClick={() => unstable_retry()} type="button">
            <RotateCw size={16} />
            Try again
          </button>
          <Link className="recovery-secondary-button" href={backHref}>
            {backLabel}
          </Link>
        </div>
      </section>
    </main>
  );
}
