import type { ReactNode } from "react";
import Image from "next/image";
import { PlatformNav } from "../components/platform-nav";

export function PlatformLayoutShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell premium-app-shell platform-app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark">
            <Image
              alt=""
              height={160}
              src="/dental-recovery-mark.svg"
              unoptimized
              width={160}
            />
          </div>
          <div>
            <strong className="brand-name">Dental Recovery</strong>
            <p className="brand-subtitle">Platform operations</p>
          </div>
        </div>
        <PlatformNav />
      </aside>
      <main className="workspace">{children}</main>
    </div>
  );
}
