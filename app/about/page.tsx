import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

const team = [
  { name: "Elena Torres", role: "Co-founder & CEO", color: "#8ab4f8", initials: "ET", bio: "Former practice manager at a 4-location DSO. Built Dash Dental after watching $30k/month disappear into unanswered DMs." },
  { name: "Raj Patel", role: "Co-founder & CTO", color: "#c58af9", initials: "RP", bio: "Previously led messaging infrastructure at a Fortune 500 fintech. Obsessed with < 100ms latency and HIPAA-first architecture." },
  { name: "Mei Lin", role: "Head of Product", color: "#81c995", initials: "ML", bio: "Spent 6 years building healthcare SaaS at Epic Systems. Believes every UI decision must respect clinical workflows." },
];

const values = [
  { title: "Clinics first", desc: "Every feature exists to serve the front desk team, not impress investors." },
  { title: "Never auto-send", desc: "AI drafts are suggestions, not actions. A human must approve every message." },
  { title: "Privacy by default", desc: "HIPAA-awareness is not a feature, it is a baseline requirement." },
  { title: "Honest metrics", desc: "We show you recovered revenue, not vanity engagement numbers." },
];

export default function AboutPage() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0f1011", color: "#f1f3f4", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <Nav />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "120px 24px 80px" }}>
        {/* Mission */}
        <div style={{ textAlign: "center", marginBottom: 72 }}>
          <div style={{ display: "inline-block", fontSize: 11, fontWeight: 600, color: "#8ab4f8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16, backgroundColor: "rgba(138,180,248,0.08)", border: "1px solid rgba(138,180,248,0.2)", borderRadius: 999, padding: "4px 14px" }}>Our mission</div>
          <h1 style={{ fontSize: 40, fontWeight: 700, color: "#f1f3f4", lineHeight: 1.2, letterSpacing: "-0.02em", marginBottom: 20 }}>
            Help every dental clinic<br />recover the revenue hiding in their DMs.
          </h1>
          <p style={{ fontSize: 16, color: "#a7adb5", maxWidth: 600, margin: "0 auto", lineHeight: 1.7 }}>
            Dash Dental was built by a practice manager who watched high-value leads disappear into WhatsApp and Instagram every week. We built the tool we wish existed — a single recovery cockpit that connects every channel, scores every lead, and helps staff respond faster without ever replacing the human touch.
          </p>
        </div>

        {/* Values */}
        <div style={{ marginBottom: 72 }}>
          <h2 style={{ fontSize: 22, fontWeight: 600, color: "#f1f3f4", marginBottom: 24 }}>What we believe</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            {values.map((v) => (
              <div key={v.title} style={{ backgroundColor: "#1b1c1e", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#f1f3f4", marginBottom: 8 }}>{v.title}</div>
                <div style={{ fontSize: 13, color: "#a7adb5", lineHeight: 1.6 }}>{v.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Team */}
        <div style={{ marginBottom: 72 }}>
          <h2 style={{ fontSize: 22, fontWeight: 600, color: "#f1f3f4", marginBottom: 24 }}>The team</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
            {team.map((m) => (
              <div key={m.name} style={{ backgroundColor: "#1b1c1e", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", backgroundColor: m.color, color: "#0f1011", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700 }}>
                  {m.initials}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#f1f3f4" }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: m.color, marginBottom: 8 }}>{m.role}</div>
                  <div style={{ fontSize: 13, color: "#a7adb5", lineHeight: 1.6 }}>{m.bio}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ backgroundColor: "#1b1c1e", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 36, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <h3 style={{ fontSize: 22, fontWeight: 600, color: "#f1f3f4" }}>Join us in the early access</h3>
          <p style={{ fontSize: 14, color: "#a7adb5", maxWidth: 420 }}>We are onboarding dental clinics directly and giving early access teams a permanent discount plus direct input into the roadmap.</p>
          <Link href="/login" style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 24px", backgroundColor: "#8ab4f8", color: "#0f1011", borderRadius: 8, fontSize: 14, fontWeight: 600 }}>
            Apply for early access <ArrowRight size={15} />
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}
