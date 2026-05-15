import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0f1011",
        color: "#f1f3f4",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 32,
        textAlign: "center",
        padding: 24,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Logo */}
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: "#8ab4f8", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "#0f1011", fontWeight: 700, fontSize: 13 }}>D</span>
        </div>
        <span style={{ color: "#f1f3f4", fontWeight: 600, fontSize: 15 }}>Dash Dental</span>
      </Link>

      {/* 404 */}
      <div>
        <div
          style={{ fontSize: 96, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1, background: "linear-gradient(135deg, #8ab4f8, #c58af9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 16 }}
        >
          404
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: "#f1f3f4", marginBottom: 10 }}>Page not found</h1>
        <p style={{ fontSize: 14, color: "#a7adb5", maxWidth: 360, lineHeight: 1.7 }}>
          This page does not exist or has been moved. Head back to the homepage or open your dashboard.
        </p>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        <Link
          href="/"
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", backgroundColor: "#8ab4f8", color: "#0f1011", borderRadius: 8, fontSize: 14, fontWeight: 600 }}
        >
          <Home size={15} /> Back to home
        </Link>
        <Link
          href="/dashboard"
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", backgroundColor: "rgba(255,255,255,0.06)", color: "#f1f3f4", borderRadius: 8, fontSize: 14, border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <ArrowLeft size={15} /> Open dashboard
        </Link>
      </div>
    </div>
  );
}
