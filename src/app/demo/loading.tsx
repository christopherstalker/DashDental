import { Loader2 } from "lucide-react";

export default function DemoLoading() {
  return (
    <main className="safe-fallback-page">
      <section className="safe-fallback-card">
        <div className="safe-fallback-mark">
          <Loader2 className="spin-icon" size={22} />
        </div>
        <p className="recovery-kicker">Starting demo</p>
        <h1>Preparing the live demo workspace.</h1>
      </section>
    </main>
  );
}
