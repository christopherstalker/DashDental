"use client";

import { useEffect } from "react";
import { RotateCw, ShieldAlert } from "lucide-react";
import "@/styles/tokens.css";
import "@/styles/components.css";
import "@/app/globals.css";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    if (error.digest) {
      console.warn("Dash Dental global error", { digest: error.digest });
    }
  }, [error.digest]);

  return (
    <html data-theme="dark" lang="en">
      <body>
        <main className="safe-fallback-page">
          <section className="safe-fallback-card">
            <div className="safe-fallback-mark danger">
              <ShieldAlert size={22} />
            </div>
            <p className="recovery-kicker">Application recovery</p>
            <h1>Dash Dental could not load this route.</h1>
            <p>Retry the route. No workspace data is displayed in this recovery screen.</p>
            <div className="safe-fallback-actions">
              <button className="recovery-primary-button" onClick={() => unstable_retry()} type="button">
                <RotateCw size={16} />
                Try again
              </button>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
