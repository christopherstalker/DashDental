import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

const plans = [
  {
    name: "Starter",
    price: 149,
    desc: "One clinic, one channel. Perfect for starting out.",
    color: "#8ab4f8",
    features: [
      "1 clinic location",
      "2 messaging channels",
      "Priority recovery queue",
      "Basic AI drafts",
      "Weekly recovery report",
      "Email support",
    ],
  },
  {
    name: "Growth",
    price: 299,
    desc: "All channels, all leads. For growing practices.",
    color: "#81c995",
    popular: true,
    features: [
      "1 clinic location",
      "All 4 channels (WhatsApp, Instagram, Telegram, Web)",
      "Risk scoring engine",
      "Advanced AI drafts",
      "Daily + weekly reports",
      "Response-time analytics",
      "Priority support",
    ],
  },
  {
    name: "Practice",
    price: 599,
    desc: "Multi-location control for group practices.",
    color: "#c58af9",
    features: [
      "Up to 5 clinic locations",
      "All channels, all locations",
      "Owner-level recovery dashboard",
      "Staff performance metrics",
      "Custom risk thresholds",
      "API access",
      "Dedicated account manager",
      "SLA guarantee",
    ],
  },
];

const faqs = [
  { q: "Is there a free trial?", a: "Yes — all plans start with a 14-day free trial, no credit card required." },
  { q: "Which channels does Dash Dental support?", a: "WhatsApp, Instagram DMs, Telegram, and website contact forms. SMS coming Q3." },
  { q: "Does the AI send messages automatically?", a: "Never. Every AI draft is clearly labeled and must be reviewed and approved by a staff member before sending." },
  { q: "Is Dash Dental HIPAA-compliant?", a: "We are built with HIPAA-awareness from day one — audit logs, encrypted storage, role-based access, and data retention controls are included." },
  { q: "Can I cancel anytime?", a: "Yes. Monthly plans can be cancelled at any time with no penalty. Annual plans are refunded pro-rata." },
];

export default function PricingPage() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0f1011", color: "#f1f3f4", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <Nav />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "120px 24px 80px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <h1 style={{ fontSize: 40, fontWeight: 700, color: "#f1f3f4", marginBottom: 12, letterSpacing: "-0.02em" }}>Simple, transparent pricing</h1>
          <p style={{ fontSize: 16, color: "#a7adb5", maxWidth: 460, margin: "0 auto" }}>Start recovering missed leads this week. No long-term contracts.</p>
        </div>

        {/* Plans */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 64 }}>
          {plans.map((p) => (
            <div
              key={p.name}
              style={{
                backgroundColor: "#1b1c1e",
                border: p.popular ? `1.5px solid ${p.color}50` : "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                padding: 28,
                display: "flex",
                flexDirection: "column",
                gap: 20,
                position: "relative",
              }}
            >
              {p.popular && (
                <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", backgroundColor: "#81c995", color: "#0f1011", fontSize: 11, fontWeight: 700, padding: "3px 12px", borderRadius: 999 }}>
                  Most popular
                </div>
              )}
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: p.color, marginBottom: 4 }}>{p.name}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
                  <span style={{ fontSize: 36, fontWeight: 700, color: "#f1f3f4" }}>${p.price}</span>
                  <span style={{ fontSize: 13, color: "#a7adb5" }}>/month</span>
                </div>
                <p style={{ fontSize: 13, color: "#a7adb5", lineHeight: 1.5 }}>{p.desc}</p>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                {p.features.map((f) => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Check size={13} style={{ color: p.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: "#a7adb5" }}>{f}</span>
                  </div>
                ))}
              </div>
              <Link
                href="/login"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  padding: "10px 0", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none",
                  backgroundColor: p.popular ? p.color : "rgba(255,255,255,0.06)",
                  color: p.popular ? "#0f1011" : "#f1f3f4",
                  border: p.popular ? "none" : "1px solid rgba(255,255,255,0.1)",
                }}
              >
                Start free trial <ArrowRight size={14} />
              </Link>
            </div>
          ))}
        </div>

        {/* Enterprise callout */}
        <div style={{ backgroundColor: "#1b1c1e", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "28px 32px", display: "flex", flexDirection: "column", gap: 12, marginBottom: 64, alignItems: "center", textAlign: "center" }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: "#f1f3f4" }}>10+ locations? Let&apos;s talk.</h3>
          <p style={{ fontSize: 14, color: "#a7adb5", maxWidth: 480 }}>Custom contracts, SSO, advanced HIPAA BAA, and dedicated support for large DSOs and group practices.</p>
          <Link href="/support" style={{ padding: "8px 20px", backgroundColor: "rgba(138,180,248,0.12)", color: "#8ab4f8", borderRadius: 7, fontSize: 13, fontWeight: 500, border: "1px solid rgba(138,180,248,0.2)" }}>
            Contact sales
          </Link>
        </div>

        {/* FAQ */}
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#f1f3f4", marginBottom: 28, textAlign: "center" }}>Frequently asked questions</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {faqs.map((faq, i) => (
              <div
                key={faq.q}
                style={{ padding: "18px 0", borderBottom: i < faqs.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}
              >
                <div style={{ fontSize: 14, fontWeight: 500, color: "#f1f3f4", marginBottom: 6 }}>{faq.q}</div>
                <div style={{ fontSize: 13, color: "#a7adb5", lineHeight: 1.6 }}>{faq.a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
