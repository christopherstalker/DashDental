import { Loader2 } from "lucide-react";

export default function PlatformLoading() {
  return (
    <main className="safe-fallback-page">
      <section className="safe-fallback-card">
        <div className="safe-fallback-mark">
          <Loader2 className="spin-icon" size={22} />
        </div>
        <p className="recovery-kicker">Loading platform data</p>
        <h1>Preparing operator controls.</h1>
      </section>
    </main>
  );
}
