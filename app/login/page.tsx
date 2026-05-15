"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [showPass, setShowPass] = useState(false);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0f1011", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 32 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: "#8ab4f8", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#0f1011", fontWeight: 700, fontSize: 14 }}>D</span>
          </div>
          <span style={{ color: "#f1f3f4", fontWeight: 600, fontSize: 16 }}>Dash Dental</span>
        </div>

        {/* Card */}
        <div style={{ backgroundColor: "#1b1c1e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 28 }}>
          {/* Tabs */}
          <div style={{ display: "flex", backgroundColor: "#202124", borderRadius: 8, padding: 3, marginBottom: 24 }}>
            {(["login", "register"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1, padding: "7px 0", borderRadius: 6, fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer",
                  backgroundColor: tab === t ? "#1b1c1e" : "transparent",
                  color: tab === t ? "#f1f3f4" : "#a7adb5",
                  boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.4)" : "none",
                }}
              >
                {t === "login" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          {tab === "login" ? (
            <form onSubmit={(e) => { e.preventDefault(); window.location.href = "/dashboard"; }} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#a7adb5", marginBottom: 6 }}>Email</label>
                <input
                  type="email"
                  placeholder="you@clinic.com"
                  defaultValue="demo@dashdental.com"
                  style={{ width: "100%", backgroundColor: "#202124", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "#f1f3f4", outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <label style={{ fontSize: 12, color: "#a7adb5" }}>Password</label>
                  <a href="#" style={{ fontSize: 12, color: "#8ab4f8" }}>Forgot?</a>
                </div>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPass ? "text" : "password"}
                    placeholder="••••••••"
                    defaultValue="demo1234"
                    style={{ width: "100%", backgroundColor: "#202124", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, padding: "9px 36px 9px 12px", fontSize: 13, color: "#f1f3f4", outline: "none", boxSizing: "border-box" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#a7adb5", cursor: "pointer", padding: 0 }}
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                style={{ marginTop: 4, padding: "10px 0", backgroundColor: "#8ab4f8", color: "#0f1011", borderRadius: 7, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              >
                Sign in <ArrowRight size={14} />
              </button>
              <p style={{ fontSize: 11, color: "#a7adb5", textAlign: "center", marginTop: 4 }}>
                Demo credentials are pre-filled above
              </p>
            </form>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); window.location.href = "/dashboard"; }} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "#a7adb5", marginBottom: 6 }}>First name</label>
                  <input placeholder="Maria" style={{ width: "100%", backgroundColor: "#202124", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "#f1f3f4", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "#a7adb5", marginBottom: 6 }}>Last name</label>
                  <input placeholder="Santos" style={{ width: "100%", backgroundColor: "#202124", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "#f1f3f4", outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#a7adb5", marginBottom: 6 }}>Clinic name</label>
                <input placeholder="Santos Dental Group" style={{ width: "100%", backgroundColor: "#202124", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "#f1f3f4", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#a7adb5", marginBottom: 6 }}>Work email</label>
                <input type="email" placeholder="you@clinic.com" style={{ width: "100%", backgroundColor: "#202124", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "#f1f3f4", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#a7adb5", marginBottom: 6 }}>Password</label>
                <input type="password" placeholder="Min 8 characters" style={{ width: "100%", backgroundColor: "#202124", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "#f1f3f4", outline: "none", boxSizing: "border-box" }} />
              </div>
              <button
                type="submit"
                style={{ marginTop: 4, padding: "10px 0", backgroundColor: "#8ab4f8", color: "#0f1011", borderRadius: 7, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              >
                Start free trial <ArrowRight size={14} />
              </button>
              <p style={{ fontSize: 11, color: "#a7adb5", textAlign: "center" }}>
                No credit card required &middot; 14-day free trial
              </p>
            </form>
          )}
        </div>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "#a7adb5" }}>
          <Link href="/" style={{ color: "#8ab4f8" }}>Back to home</Link>
        </p>
      </div>
    </div>
  );
}
