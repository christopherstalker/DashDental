import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";

export default function NotFound() {
  return (
    <main className="safe-fallback-page">
      <section className="safe-fallback-card">
        <div className="safe-fallback-mark">
          <ShieldCheck size={22} />
        </div>
        <p className="recovery-kicker">Page not found</p>
        <h1>This Dash Dental / Dental Recovery page could not be found.</h1>
        <p>
          The Dental Recovery public website is available, but this exact route is not
          part of the launch surface. Start from the sample dashboard or homepage.
        </p>
        <div className="safe-fallback-actions">
          <Link className="recovery-primary-button" href="/demo">
            Product tour
            <ArrowRight size={16} />
          </Link>
          <Link className="recovery-secondary-button" href="/">
            Homepage
          </Link>
        </div>
      </section>
    </main>
  );
}
