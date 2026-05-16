import type { CSSProperties } from "react";

const particles = [
  { className: "p1", size: 3, x: "8%", y: "18%", duration: "13s", delay: "-1s" },
  { className: "p2", size: 2, x: "18%", y: "68%", duration: "16s", delay: "-7s" },
  { className: "p3", size: 4, x: "32%", y: "24%", duration: "18s", delay: "-4s" },
  { className: "p4", size: 2, x: "43%", y: "78%", duration: "14s", delay: "-10s" },
  { className: "p5", size: 3, x: "57%", y: "14%", duration: "17s", delay: "-6s" },
  { className: "p6", size: 2, x: "66%", y: "58%", duration: "12s", delay: "-3s" },
  { className: "p7", size: 5, x: "79%", y: "30%", duration: "19s", delay: "-11s" },
  { className: "p8", size: 2, x: "88%", y: "74%", duration: "15s", delay: "-5s" },
  { className: "p9", size: 3, x: "11%", y: "44%", duration: "18s", delay: "-12s" },
  { className: "p10", size: 2, x: "51%", y: "42%", duration: "13s", delay: "-8s" },
  { className: "p11", size: 4, x: "72%", y: "86%", duration: "16s", delay: "-2s" },
  { className: "p12", size: 2, x: "93%", y: "16%", duration: "20s", delay: "-14s" },
] as const;

export function MarketingMotionBackdrop({ variant = "home" }: { variant?: "home" | "pricing" }) {
  return (
    <div aria-hidden="true" className={`recovery-motion-field ${variant}`}>
      <span className="motion-prism" />
      <span className="motion-depth-grid" />
      <span className="motion-aurora aurora-one" />
      <span className="motion-aurora aurora-two" />
      <span className="motion-aurora aurora-three" />
      <span className="motion-orbital orbital-one" />
      <span className="motion-orbital orbital-two" />
      <span className="motion-ribbon ribbon-one" />
      <span className="motion-ribbon ribbon-two" />
      <span className="motion-beam beam-one" />
      <span className="motion-beam beam-two" />
      <span className="motion-comet comet-one" />
      <span className="motion-comet comet-two" />
      <span className="motion-pulse pulse-one" />
      <span className="motion-pulse pulse-two" />
      <span className="motion-pulse pulse-three" />
      <div className="motion-particle-field">
        {particles.map((particle) => (
          <span
            className={`motion-particle ${particle.className}`}
            key={particle.className}
            style={
              {
                "--particle-delay": particle.delay,
                "--particle-duration": particle.duration,
                "--particle-size": `${particle.size}px`,
                "--particle-x": particle.x,
                "--particle-y": particle.y,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
