import Link from "next/link";
import { MessageSquare, Mail, BookOpen, ArrowRight } from "lucide-react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

const options = [
  { icon: MessageSquare, color: "#8ab4f8", title: "Live chat", desc: "Avg response under 5 minutes during business hours (M–F, 8am–6pm ET).", action: "Start chat", href: "#" },
  { icon: Mail, color: "#81c995", title: "Email support", desc: "Send us a detailed message and we&apos;ll respond within one business day.", action: "Send email", href: "mailto:support@dashdental.com" },
  { icon: BookOpen, color: "#c58af9", title: "Documentation", desc: "Step-by-step guides, API reference, and channel setup walkthroughs.", action: "View docs", href: "#" },
];

const faqs = [
  { q: "How do I connect WhatsApp?", a: "Go to Settings → Channels → WhatsApp and follow the QR code pairing flow. Takes under 2 minutes." },
  { q: "How do I connect Instagram DMs?", a: "Navigate to Settings → Channels → Instagram and authorise your business account via Facebook Login." },
  { q: "Can I assign conversations to specific staff?", a: "Yes. In Recovery Settings on the right panel of the dashboard, set Assigned to any team member." },
  { q: "What happens when I send a draft?", a: "Clicking Edit & Send opens the message in a composer window. You review and make final edits before it is transmitted." },
  { q: "How is the money-at-risk figure calculated?", a: "Each procedure type (implant, veneer, emergency, etc.) has a configurable estimated value. The total is the sum of all unanswered leads multiplied by their procedure values." },
];

export default function SupportPage() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0f1011", color: "#f1f3f4", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <Nav />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "120px 24px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <h1 style={{ fontSize: 38, fontWeight: 700, color: "#f1f3f4", marginBottom: 12, letterSpacing: "-0.02em" }}>How can we help?</h1>
          <p style={{ color: "#a7adb5", fontSize: 15 }}>Find answers, reach the team, or browse documentation.</p>
        </div>

        {/* Contact options */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginBottom: 64 }}>
          {options.map((o) => {
            const Icon = o.icon;
            return (
              <div key={o.title} style={{ backgroundColor: "#1b1c1e", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: `${o.color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={18} style={{ color: o.color }} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#f1f3f4", marginBottom: 6 }}>{o.title}</div>
                  <div style={{ fontSize: 13, color: "#a7adb5", lineHeight: 1.6, marginBottom: 14 }}>{o.desc}</div>
                  <Link href={o.href} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, color: o.color, fontWeight: 500 }}>
                    {o.action} <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <h2 style={{ fontSize: 22, fontWeight: 600, color: "#f1f3f4", marginBottom: 24 }}>Common questions</h2>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {faqs.map((faq, i) => (
              <div key={faq.q} style={{ padding: "18px 0", borderBottom: i < faqs.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
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
