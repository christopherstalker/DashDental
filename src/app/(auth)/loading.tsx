import { Loader2 } from "lucide-react";

export default function AuthLoading() {
  return (
    <main className="safe-fallback-page">
      <section className="safe-fallback-card">
        <div className="safe-fallback-mark">
          <Loader2 className="spin-icon" size={22} />
        </div>
        <p className="recovery-kicker">Loading account route</p>
        <h1>Preparing secure account access.</h1>
      </section>
    </main>
  );
}
