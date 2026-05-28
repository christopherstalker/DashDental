"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Building2,
  CreditCard,
  Inbox,
  LayoutDashboard,
  Search,
  Settings,
  Users,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";
import { ThemeColorPicker } from "@/components/ui/theme-color-picker";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/team", label: "Team", icon: Users },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function currentLabel(pathname: string): string {
  const matched = navItems.find(
    (item) => (item.href === "/dashboard" ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)),
  );

  if (matched) {
    return matched.label;
  }

  return "Workspace";
}

export function DashboardShell({
  atRisk,
  children,
  connectedIntegrations,
  openConversations,
  organizationName,
  planLabel,
  setupProgress,
  userName,
}: {
  atRisk: number;
  children: ReactNode;
  connectedIntegrations: number;
  openConversations: number;
  organizationName: string;
  planLabel: string;
  setupProgress: number;
  userName: string;
}) {
  const pathname = usePathname();
  const label = currentLabel(pathname);

  return (
    <div className="ddr-reset ddr-dashboard-shell">
      <aside className="ddr-sidebar" aria-label="Workspace navigation">
        <Link className="ddr-sidebar-brand" href="/dashboard">
          <span className="ddr-logo-mark" aria-hidden="true">
            <Zap size={16} />
          </span>
          <div>
            <strong>Dash Dental</strong>
            <span>{organizationName}</span>
          </div>
        </Link>

        <nav className="ddr-sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/dashboard"
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`ddr-nav-item ${active ? "active" : ""}`}
                href={item.href}
                key={item.href}
                title={item.label}
              >
                <Icon aria-hidden="true" size={16} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="ddr-sidebar-foot">
          <span>Plan</span>
          <strong>{planLabel}</strong>
          <span>{setupProgress}% launch ready</span>
          <span>{connectedIntegrations} connected channels</span>
        </div>
      </aside>

      <div className="ddr-shell-main">
        <header className="ddr-topbar">
          <div className="ddr-topbar-context">
            <div className="ddr-breadcrumb">
              <span>Workspace</span>
              <span>/</span>
              <strong>{label}</strong>
            </div>
            {atRisk > 0 ? <span className="ddr-badge ddr-badge-alert">{atRisk} SLA risk</span> : null}
          </div>

          <div className="ddr-topbar-actions">
            <label className="ddr-input-shell ddr-topbar-search" htmlFor="workspace-search">
              <Search size={15} aria-hidden="true" />
              <input id="workspace-search" placeholder="Search patients, threads, templates" />
            </label>
            <span className="ddr-badge ddr-badge-info">{openConversations} open</span>
            <Link className="ddr-button ddr-button-ghost ddr-topbar-account-link" href="/workspaces">
              <Building2 size={15} />
              <span>Account</span>
            </Link>
            <ThemeColorPicker />
            <ThemeToggle />
            <span className="ddr-user-avatar" title={userName}>
              {initials(userName) || "DD"}
            </span>
          </div>
        </header>

        <main className="ddr-page-scroll">{children}</main>
      </div>
    </div>
  );
}
