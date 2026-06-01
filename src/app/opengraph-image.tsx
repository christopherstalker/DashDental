import { ImageResponse } from "next/og";

export const alt = "Dash Dental live patient inbox preview";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

const threads = [
  ["EP", "Eva P.", "Emergency tooth pain", "22m"],
  ["MK", "Mila K.", "Veneers pricing", "1h"],
  ["ON", "Oleh N.", "Implant consult", "2h"],
  ["SL", "Sara L.", "Whitening inquiry", "46m"],
] as const;

function ThreadRow({
  accent,
  row,
}: {
  accent: string;
  row: (typeof threads)[number];
}) {
  return (
    <div
      style={{
        alignItems: "center",
        background: "rgba(255,255,255,0.045)",
        borderLeft: `4px solid ${accent}`,
        borderRadius: 18,
        display: "flex",
        gap: 14,
        padding: "14px 16px",
        width: "100%",
      }}
    >
      <div
        style={{
          alignItems: "center",
          background: accent,
          borderRadius: 999,
          color: "#fff",
          display: "flex",
          fontSize: 18,
          fontWeight: 800,
          height: 48,
          justifyContent: "center",
          width: 48,
        }}
      >
        {row[0]}
      </div>
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <strong style={{ color: "#f0fdf4", fontSize: 24, lineHeight: 1.1 }}>{row[1]}</strong>
        <span style={{ color: "rgba(240,253,244,0.56)", fontSize: 18 }}>{row[2]}</span>
      </div>
      <span style={{ color: "rgba(240,253,244,0.45)", fontSize: 18, marginLeft: "auto" }}>
        {row[3]}
      </span>
    </div>
  );
}

function Message({ children, outgoing = false }: { children: React.ReactNode; outgoing?: boolean }) {
  return (
    <div
      style={{
        alignSelf: outgoing ? "flex-end" : "flex-start",
        background: outgoing ? "#22c55e" : "rgba(255,255,255,0.06)",
        border: outgoing ? "1px solid rgba(34,197,94,0.7)" : "1px solid rgba(255,255,255,0.1)",
        borderRadius: 22,
        color: "#f0fdf4",
        display: "flex",
        fontSize: 20,
        fontWeight: 700,
        lineHeight: 1.25,
        maxWidth: 230,
        padding: "14px 18px",
      }}
    >
      {children}
    </div>
  );
}

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background:
            "radial-gradient(circle at 88% 18%, rgba(34,197,94,0.22), transparent 30%), linear-gradient(135deg, #07150f 0%, #0a1a12 52%, #07100d 100%)",
          color: "#f0fdf4",
          display: "flex",
          fontFamily: "Inter, Arial, sans-serif",
          height: "100%",
          overflow: "hidden",
          padding: 64,
          position: "relative",
          width: "100%",
        }}
      >
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 34,
            inset: 22,
            position: "absolute",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 28, justifyContent: "center", width: 520 }}>
          <div style={{ alignItems: "center", display: "flex", gap: 16 }}>
            <div
              style={{
                alignItems: "center",
                background: "rgba(34,197,94,0.13)",
                border: "1px solid rgba(34,197,94,0.34)",
                borderRadius: 18,
                color: "#22c55e",
                display: "flex",
                fontSize: 30,
                fontWeight: 900,
                height: 54,
                justifyContent: "center",
                width: 54,
              }}
            >
              DD
            </div>
            <strong style={{ fontSize: 28 }}>Dash Dental</strong>
          </div>

          <h1
            style={{
              color: "#f0fdf4",
              display: "flex",
              flexDirection: "column",
              fontSize: 78,
              fontWeight: 900,
              letterSpacing: "-0.05em",
              lineHeight: 0.94,
              margin: 0,
            }}
          >
            Never miss
            <span>another</span>
            <span style={{ color: "#22c55e" }}>patient inquiry</span>
          </h1>

          <p style={{ color: "#86efac", fontSize: 25, lineHeight: 1.35, margin: 0 }}>
            One live inbox for WhatsApp, Instagram, Telegram, missed calls, and web leads.
          </p>
        </div>

        <div
          style={{
            background: "rgba(255,255,255,0.035)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 30,
            boxShadow: "0 38px 90px rgba(0,0,0,0.35)",
            display: "flex",
            gap: 22,
            height: 440,
            marginLeft: "auto",
            padding: 22,
            transform: "rotateX(5deg) rotateY(-8deg) rotateZ(1deg)",
            width: 560,
          }}
        >
          <div style={{ borderRight: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", gap: 14, paddingRight: 18, width: 260 }}>
            <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, height: 42 }} />
            {threads.map((thread, index) => (
              <ThreadRow
                accent={index === 0 ? "#ef4444" : index === 1 ? "#f97316" : index === 2 ? "#22c55e" : "#3b82f6"}
                key={thread[1]}
                row={thread}
              />
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 18 }}>
            <div style={{ alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 12, paddingBottom: 18 }}>
              <strong style={{ fontSize: 24 }}>Mila K.</strong>
              <span style={{ background: "rgba(239,68,68,0.16)", borderRadius: 999, color: "#ef4444", fontSize: 16, fontWeight: 800, padding: "7px 11px" }}>
                SLA 12 min
              </span>
            </div>
            <Message>Veneer consult slots this week?</Message>
            <Message outgoing>Today 16:30 or tomorrow morning.</Message>
            <div
              style={{
                background: "rgba(249,115,22,0.12)",
                border: "1px solid rgba(249,115,22,0.3)",
                borderRadius: 20,
                color: "#f0fdf4",
                display: "flex",
                flexDirection: "column",
                fontSize: 18,
                fontWeight: 800,
                gap: 8,
                marginTop: "auto",
                padding: 15,
              }}
            >
              <span style={{ color: "#f97316", fontSize: 14, textTransform: "uppercase" }}>Team-only note</span>
              Mention financing.
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
