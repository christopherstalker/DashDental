import { Shield, Lock, Eye, FileText, Server, Users } from "lucide-react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

const controls = [
  { icon: Lock, color: "#8ab4f8", title: "Encryption at rest and in transit", desc: "All data is encrypted using AES-256 at rest and TLS 1.3 in transit. Encryption keys are managed via AWS KMS with automatic rotation." },
  { icon: Shield, color: "#81c995", title: "HIPAA-aware architecture", desc: "We handle PHI with care — limited data collection, role-based access, audit logs for every data touch, and BAA available on request." },
  { icon: Eye, color: "#fdd663", title: "Audit logging", desc: "Every read, write, and delete operation on patient-related data is logged with actor, timestamp, and IP. Logs are retained for 1 year." },
  { icon: Users, color: "#c58af9", title: "Role-based access control", desc: "Granular permissions: owner, manager, and staff roles with configurable access to message threads, reports, and settings." },
  { icon: Server, color: "#f28b82", title: "Infrastructure", desc: "Hosted on AWS in us-east-1 with automated backups every 6 hours. 99.9% uptime SLA on Growth and Practice plans." },
  { icon: FileText, color: "#8ab4f8", title: "Data retention", desc: "Configurable retention policies: delete conversation data after 30, 90, or 365 days. Immediate deletion available on request." },
];

export default function SecurityPage() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0f1011", color: "#f1f3f4", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <Nav />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "120px 24px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, backgroundColor: "rgba(129,201,149,0.08)", border: "1px solid rgba(129,201,149,0.2)", borderRadius: 999, padding: "4px 14px", marginBottom: 18 }}>
            <Shield size={13} style={{ color: "#81c995" }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: "#81c995", textTransform: "uppercase", letterSpacing: "0.08em" }}>Security overview</span>
          </div>
          <h1 style={{ fontSize: 38, fontWeight: 700, color: "#f1f3f4", marginBottom: 14, letterSpacing: "-0.02em" }}>Security and compliance</h1>
          <p style={{ fontSize: 15, color: "#a7adb5", maxWidth: 540, margin: "0 auto", lineHeight: 1.7 }}>
            Patient data is a serious responsibility. Here is exactly how we protect it.
          </p>
        </div>

        {/* Status bar */}
        <div style={{ backgroundColor: "#1b1c1e", border: "1px solid rgba(129,201,149,0.2)", borderRadius: 10, padding: "14px 20px", display: "flex", alignItems: "center", gap: 10, marginBottom: 48 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#81c995", flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: "#81c995", fontWeight: 500 }}>All systems operational</span>
          <span style={{ marginLeft: "auto", fontSize: 12, color: "#a7adb5" }}>Last updated: today</span>
        </div>

        {/* Controls grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14, marginBottom: 56 }}>
          {controls.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.title} style={{ backgroundColor: "#1b1c1e", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 24 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: `${c.color}15`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <Icon size={17} style={{ color: c.color }} />
                </div>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "#f1f3f4", marginBottom: 8 }}>{c.title}</h3>
                <p style={{ fontSize: 13, color: "#a7adb5", lineHeight: 1.6 }}>{c.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Certifications */}
        <div style={{ backgroundColor: "#1b1c1e", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "#f1f3f4", marginBottom: 16 }}>Certifications and compliance</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {["HIPAA-aware (BAA available)", "SOC 2 Type II (in progress)", "TLS 1.3", "AES-256 encryption", "AWS us-east-1"].map((badge) => (
              <span key={badge} style={{ fontSize: 12, padding: "5px 12px", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#a7adb5" }}>
                {badge}
              </span>
            ))}
          </div>
          <p style={{ marginTop: 16, fontSize: 13, color: "#a7adb5" }}>
            Questions or to request our security documentation, contact{" "}
            <a href="mailto:security@dashdental.com" style={{ color: "#8ab4f8" }}>security@dashdental.com</a>
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
