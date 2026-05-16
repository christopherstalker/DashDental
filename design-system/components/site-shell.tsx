import type { ReactNode } from "react";

export function SiteShell({ children }: { children: ReactNode }) {
  return <div className="site-shell platform-theme">{children}</div>;
}
