"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BriefcaseBusiness, LogIn, UserRoundPlus } from "lucide-react";

const authNavItems = [
  { href: "/register", label: "Create account", icon: UserRoundPlus },
  { href: "/login", label: "Sign in", icon: LogIn },
  { href: "/workspaces", label: "Account", icon: BriefcaseBusiness },
] as const;

export function AuthAccountNav() {
  const pathname = usePathname();

  return (
    <nav className="premium-account-tabs" aria-label="Account navigation">
      {authNavItems.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={active ? "active" : ""}
            href={item.href}
            key={item.href}
          >
            <Icon aria-hidden="true" size={15} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
