import Link from "next/link";
import { ArrowRight, Check, ChevronRight, MessageSquare, Bell, BarChart3, Shield, Zap, Globe } from "lucide-react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

const features = [
  { icon: MessageSquare, color: "#8ab4f8", title: "Unified Recovery Queue", desc: "WhatsApp, Instagram DMs, Telegram, and web forms funneled into one prioritized queue. No tab-switching, no missed leads." },
  { icon: Bell, color: "#fdd663", title: "Response-Time Risk Scoring", desc: "Every unanswered thread gets a risk score based on message age, procedure type, and patient lifetime value." },
  { icon: Zap, color: "#81c995", title: "AI-Assisted Reply Drafts", desc: "Context-aware draft suggestions, clearly labeled for staff review before sending. Never auto-sends." },
  { icon: BarChart3, color: "#c58af9", title: "Owner Recovery Reports", desc: "Weekly reports: money at risk, recovered conversations, avg first-response time by channel and staff member." },
  { icon: Shield, color: "#f28b82", title: "HIPAA-Aware by Default", desc: "PII handling, audit logs, role-based access, and data retention controls built in from day one." },
  { icon: Globe, color: "#8ab4f8", title: "Multi-Location Ready", desc: "Manage multiple clinic locations from one dashboard with per-location reporting and team assignments." },
];

const stats = [
  { value: "4.2×", label: "more leads recovered" },
  { value: "< 8 min", label: "avg first response" },
  { value: "$12k+", label: "recovered per month" },
  { value: "98%", label: "staff adoption" },
];

const channels = [
  { name: "WhatsApp", color: "#81c995" },
  { name: "Instagram", color: "#c58af9" },
  { name: "Telegram", color: "#8ab4f8" },
  { name: "Web Forms", color: "#fdd663" },
];

const testimonials = [
  {
    quote: "We were losing implant consults in Instagram DMs for months. Dash Dental surfaced three high-value leads in the first week alone.",
    name: "Dr. Maria Santos", role: "Owner, Santos Dental Group", initials: "MS", color: "#8ab4f8",
  },
  {
    quote: "The response-time risk score changed how our front desk prioritizes. High-value emergency leads never fall through anymore.",
    name: "James Okello", role: "Practice Manager, BrightSmile Clinics", initials: "JO", color: "#81c995",
  },
  {
    quote: "Setup was one afternoon. The AI drafts are a huge time-saver — we review every one but they are always on-point for our tone.",
    name: "Dr. Leila Ahmadi", role: "Founder, Modern Dental Studio", initials: "LA", color: "#c58af9",
  },
];

const queueRows = [
  { name: "Carlos M.", msg: "Interested in full implant consultation, saw your ad...", tag: "Implant", risk: "HIGH", riskColor: "#f28b82", channel: "WhatsApp", age: "2h" },
  { name: "Priya K.", msg: "Severe tooth pain, need an emergency appointment ASAP", tag: "Emergency", risk: "HIGH", riskColor: "#f28b82", channel: "Instagram", age: "45m" },
  { name: "Tom W.", msg: "How much are veneers? Saw your post last week...", tag: "Veneer", risk: "MED", riskColor: "#fdd663", channel: "Web", age: "4h" },
  { name: "Sofia R.", msg: "Do you do Invisalign? Looking for a consultation", tag: "Ortho", risk: "LOW", riskColor: "#a7adb5", channel: "Telegram", age: "1d" },
];

export default function HomePage() {
  return (
    <div style={{ backgroundColor: "#0f1011", color: "#f1f3f4", minHeight: "100vh", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <Nav />

      {/* ── Hero ── */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center gap-6">
          <div
            className="flex items-center gap-2 px-3 py-1 rounded-full text-xs"
            style={{ border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "#1b1c1e", color: "#a7adb5" }}
          >
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: "#81c995" }} />
            Now in early access — dental clinics only
          </div>

          <h1
            className="text-4xl md:text-6xl font-bold leading-tight"
            style={{ color: "#f1f3f4", letterSpacing: "-0.02em" }}
          >
            Stop losing implant, veneer, and{" "}
            <span style={{ color: "#8ab4f8" }}>emergency leads</span> in DMs.
          </h1>

          <p className="text-lg md:text-xl max-w-2xl leading-relaxed" style={{ color: "#a7adb5" }}>
            Dash Dental gives your front desk one prioritized recovery queue across WhatsApp, Instagram, Telegram, and website forms — with response-time risk, safe AI-assisted reply drafts, and owner-level recovery reports.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              style={{ backgroundColor: "#8ab4f8", color: "#0f1011" }}
            >
              Start free trial <ArrowRight size={15} />
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm transition-colors"
              style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#a7adb5" }}
            >
              View live demo <ChevronRight size={15} />
            </Link>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mt-2">
            {channels.map((c) => (
              <span
                key={c.name}
                className="px-3 py-1 text-xs rounded-full"
                style={{ border: `1px solid ${c.color}30`, backgroundColor: `${c.color}10`, color: c.color }}
              >
                {c.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Dashboard Preview ── */}
      <section className="px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-xl overflow-hidden shadow-2xl" style={{ border: "1px solid rgba(255,255,255,0.06)", backgroundColor: "#1b1c1e" }}>
            {/* Chrome bar */}
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", backgroundColor: "#202124" }}>
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#f28b82" }} />
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#fdd663" }} />
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#81c995" }} />
              <span className="ml-3 text-xs font-mono" style={{ color: "#a7adb5" }}>app.dashdental.com/dashboard</span>
              <span
                className="ml-auto text-[10px] px-2 py-0.5 rounded"
                style={{ color: "#fdd663", border: "1px solid rgba(253,214,99,0.3)", backgroundColor: "rgba(253,214,99,0.08)" }}
              >
                Sample data
              </span>
            </div>

            {/* Mock layout */}
            <div className="flex h-80 md:h-96">
              {/* Sidebar */}
              <div className="w-24 md:w-36 flex flex-col gap-1 p-3 shrink-0" style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}>
                {["Queue", "Channels", "Reports", "Settings"].map((item, i) => (
                  <div
                    key={item}
                    className="px-2 py-1.5 rounded text-xs"
                    style={{
                      backgroundColor: i === 0 ? "rgba(138,180,248,0.1)" : "transparent",
                      color: i === 0 ? "#8ab4f8" : "#a7adb5",
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>

              {/* Center */}
              <div className="flex-1 p-4 flex flex-col gap-3 min-w-0">
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "Money at risk", value: "$3,840", color: "#f28b82" },
                    { label: "Unanswered", value: "14", color: "#fdd663" },
                    { label: "Avg response", value: "6.2m", color: "#8ab4f8" },
                    { label: "Recovered", value: "8", color: "#81c995" },
                  ].map((m) => (
                    <div key={m.label} className="rounded-lg p-2.5" style={{ backgroundColor: "#202124", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="text-[10px] mb-1" style={{ color: "#a7adb5" }}>{m.label}</div>
                      <div className="text-sm font-bold" style={{ color: m.color }}>{m.value}</div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-1.5 flex-1">
                  {queueRows.map((row) => (
                    <div
                      key={row.name}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg"
                      style={{ backgroundColor: "#202124", border: "1px solid rgba(255,255,255,0.04)" }}
                    >
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                        style={{ backgroundColor: "rgba(138,180,248,0.15)", color: "#8ab4f8" }}
                      >
                        {row.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium" style={{ color: "#f1f3f4" }}>{row.name}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "#a7adb5" }}>{row.tag}</span>
                        </div>
                        <div className="text-[10px] truncate" style={{ color: "#a7adb5" }}>{row.msg}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[9px] font-medium" style={{ color: row.riskColor }}>{row.risk}</span>
                        <span className="text-[9px]" style={{ color: "#a7adb5" }}>{row.age}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right panel */}
              <div className="w-44 md:w-52 shrink-0 p-3 flex flex-col gap-3" style={{ borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="text-[10px] uppercase tracking-widest" style={{ color: "#a7adb5" }}>AI Draft</div>
                <div className="rounded-lg p-2.5 flex flex-col gap-2 flex-1" style={{ backgroundColor: "#202124", border: "1px solid rgba(138,180,248,0.2)" }}>
                  <div
                    className="text-[10px] rounded px-2 py-1"
                    style={{ color: "#8ab4f8", border: "1px solid rgba(138,180,248,0.2)", backgroundColor: "rgba(138,180,248,0.08)" }}
                  >
                    Draft only — staff review required
                  </div>
                  <div className="text-[10px] leading-relaxed" style={{ color: "#f1f3f4" }}>
                    Hi Carlos! Thanks for reaching out about dental implants. We&apos;d love to help — our consultations are complimentary. Are you free this week?
                  </div>
                  <div className="mt-auto flex gap-1.5">
                    <div className="flex-1 rounded py-1 text-center text-[9px]" style={{ backgroundColor: "rgba(138,180,248,0.12)", color: "#8ab4f8" }}>Edit &amp; Send</div>
                    <div className="flex-1 rounded py-1 text-center text-[9px]" style={{ backgroundColor: "rgba(255,255,255,0.05)", color: "#a7adb5" }}>Discard</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0" style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: "0.75rem", overflow: "hidden" }}>
          {stats.map((s) => (
            <div key={s.label} className="p-6 text-center" style={{ backgroundColor: "#1b1c1e" }}>
              <div className="text-3xl font-bold mb-1" style={{ color: "#8ab4f8" }}>{s.value}</div>
              <div className="text-sm" style={{ color: "#a7adb5" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3" style={{ color: "#f1f3f4" }}>Everything your front desk needs</h2>
            <p className="max-w-xl mx-auto" style={{ color: "#a7adb5" }}>Built specifically for dental practices recovering revenue from missed messages.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="rounded-xl p-5 transition-colors"
                  style={{ backgroundColor: "#1b1c1e", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center mb-4"
                    style={{ backgroundColor: `${f.color}15` }}
                  >
                    <Icon size={18} style={{ color: f.color }} />
                  </div>
                  <h3 className="text-sm font-semibold mb-2" style={{ color: "#f1f3f4" }}>{f.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#a7adb5" }}>{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold" style={{ color: "#f1f3f4" }}>Trusted by dental teams</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="rounded-xl p-5 flex flex-col gap-4"
                style={{ backgroundColor: "#1b1c1e", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <p className="text-sm leading-relaxed flex-1" style={{ color: "#a7adb5" }}>&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ backgroundColor: t.color, color: "#0f1011" }}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <div className="text-xs font-medium" style={{ color: "#f1f3f4" }}>{t.name}</div>
                    <div className="text-xs" style={{ color: "#a7adb5" }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-6 pb-24">
        <div
          className="max-w-3xl mx-auto text-center rounded-2xl p-12 flex flex-col items-center gap-5"
          style={{ backgroundColor: "#1b1c1e", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <h2 className="text-3xl font-bold" style={{ color: "#f1f3f4" }}>
            Every unanswered DM is a lead walking to your competitor.
          </h2>
          <p style={{ color: "#a7adb5", maxWidth: "28rem" }}>
            Set up Dash Dental in one afternoon. No IT required. No long-term contract.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/login"
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              style={{ backgroundColor: "#8ab4f8", color: "#0f1011" }}
            >
              Start free trial <ArrowRight size={15} />
            </Link>
            <Link
              href="/pricing"
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm transition-colors"
              style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#a7adb5" }}
            >
              See pricing
            </Link>
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-xs" style={{ color: "#a7adb5" }}>
            {["14-day free trial", "No credit card required", "Cancel anytime"].map((t) => (
              <span key={t} className="flex items-center gap-1">
                <Check size={12} style={{ color: "#81c995" }} /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
