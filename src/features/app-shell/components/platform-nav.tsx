"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Building2, CreditCard, LayoutDashboard } from "lucide-react";

const platformLinks = [
  {
    href: "/platform",
    icon: LayoutDashboard,
    label: "Support console",
  },
  {
    href: "/platform/subscriptions",
    icon: CreditCard,
    label: "Subscriptions",
  },
  {
    href: "/app-architecture",
    icon: BarChart3,
    label: "Architecture",
  },
  {
    href: "/dashboard",
    icon: Building2,
    label: "Workspace",
  },
];

export function PlatformNav() {
  const pathname = usePathname();

  return (
    <nav className="nav-list">
      {platformLinks.map((link) => {
        const Icon = link.icon;
        const isActive =
          pathname === link.href ||
          (link.href !== "/platform" && pathname.startsWith(`${link.href}/`));

        return (
          <Link
            className={`nav-item ${isActive ? "active" : ""}`}
            href={link.href}
            key={link.href}
          >
            <Icon aria-hidden="true" size={17} />
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
