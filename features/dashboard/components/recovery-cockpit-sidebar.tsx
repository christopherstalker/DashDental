"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

export type CockpitNavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
};

export function RecoveryCockpitSidebar({
  activeChannels,
  items,
  sampleMode,
  userLabel,
  workspaceName,
}: {
  activeChannels: string;
  items: readonly CockpitNavItem[];
  sampleMode: boolean;
  userLabel: string;
  workspaceName: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="dd-cockpit-sidebar" aria-label="Dashboard navigation">
      <div className="dd-cockpit-brand">
        <span className="dd-cockpit-brand-mark" aria-hidden="true">
          <Image alt="" height={160} src="/dental-recovery-mark.svg" unoptimized width={160} />
        </span>
        <div>
          <strong>Dash Dental</strong>
          <small>{workspaceName}</small>
        </div>
      </div>

      <nav className="dd-cockpit-nav" aria-label="Dashboard sections">
        {items.map((item) => {
          const target = sampleMode ? "/demo" : item.href;
          const active = sampleMode ? pathname === "/demo" && item.href === "/dashboard" : pathname === item.href;

          return (
            <Link className={active ? "active" : ""} href={target} key={item.label}>
              <item.icon size={16} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="dd-cockpit-sidebar-footer">
        {sampleMode ? (
          <span className="dd-cockpit-chip sample">Sample data</span>
        ) : (
          <span className="dd-cockpit-chip active">Live workspace</span>
        )}
        <div className="dd-cockpit-user">
          <span>{userLabel}</span>
          <strong>{workspaceName}</strong>
          <small>{activeChannels} active channels watched</small>
        </div>
      </div>
    </aside>
  );
}
