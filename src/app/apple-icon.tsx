import { ImageResponse } from "next/og";

export const size = { height: 180, width: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "linear-gradient(145deg, #202124, #0f1011)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 40,
          color: "#8ab4f8",
          display: "flex",
          fontSize: 88,
          fontWeight: 760,
          height: "100%",
          justifyContent: "center",
          letterSpacing: "-0.06em",
          width: "100%",
        }}
      >
        D
      </div>
    ),
    size,
  );
}
