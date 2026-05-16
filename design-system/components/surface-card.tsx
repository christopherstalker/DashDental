import type { ReactNode } from "react";

export function SurfaceCard({
  eyebrow,
  title,
  description,
  children,
  wide = false,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <section className={`${wide ? "wide-panel" : "queue-panel"} ds-surface-card`}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          {description ? <p className="blueprint-copy">{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}
