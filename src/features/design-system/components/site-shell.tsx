import type { ReactNode } from "react";

export function SiteShell({ children }: { children: ReactNode }) {
  return <div className="site-shell ddr-site-shell ddr-reset">{children}</div>;
}
