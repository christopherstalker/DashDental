"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCw, ShieldAlert } from "lucide-react";

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="safe-fallback-page">
      <section className="safe-fallback-card">
        <div className="safe-fallback-mark danger">
          <ShieldAlert size={22} />
        </div>
        <p className="recovery-kicker">Something went wrong</p>
        <h1>Dash Dental hit a recoverable page error.</h1>
        <p>
          Your workspace data is not shown here. Try reloading this view, or return to a
          stable public page while support checks the issue.
        </p>
        <div className="safe-fallback-actions">
          <button className="recovery-primary-button" onClick={() => unstable_retry()} type="button">
            <RotateCw size={16} />
            Try again
          </button>
          <Link className="recovery-secondary-button" href="/security">
            Security and support
          </Link>
        </div>
      </section>
    </main>
  );
}
