import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  description: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="topbar blueprint-topbar ds-page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="blueprint-copy">{description}</p>
      </div>
      {actions ? <div className="topbar-actions">{actions}</div> : null}
    </header>
  );
}
