"use client";

import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Bot,
  CreditCard,
  FileCheck2,
  FileText,
  Gauge,
  Inbox,
  ListChecks,
  Plug,
  Settings2,
  ShieldCheck,
  Users,
  UserRoundPlus,
  type LucideIcon,
} from "lucide-react";
import { canAccess } from "@/domain/business-rules";
import type { Role } from "@/domain/types";
import { LocalizedText } from "@/features/i18n/components/localized-text";
import type { TranslationKey } from "@/features/i18n/translations";
import type { AppRouteDefinition } from "../config/route-map";

const routeIcons: Record<string, LucideIcon> = {
  ai: Bot,
  alerts: Bell,
  automations: Settings2,
  billing: CreditCard,
  compliance: ShieldCheck,
  dashboard: Gauge,
  inbox: Inbox,
  integrations: Plug,
  leads: UserRoundPlus,
  notes: FileText,
  queue: ListChecks,
  reports: BarChart3,
  setup: FileCheck2,
  team: Users,
};

const routeLabelKeys: Record<string, TranslationKey> = {
  ai: "workspace.nav.ai",
  alerts: "workspace.nav.alerts",
  automations: "workspace.nav.automations",
  billing: "workspace.nav.billing",
  compliance: "workspace.nav.compliance",
  dashboard: "workspace.nav.dashboard",
  inbox: "workspace.nav.inbox",
  integrations: "workspace.nav.integrations",
  leads: "workspace.nav.leads",
  notes: "workspace.nav.notes",
  queue: "workspace.nav.queue",
  reports: "workspace.nav.reports",
  setup: "workspace.nav.setup",
  team: "workspace.nav.team",
};

const groupLabelKeys: Record<string, TranslationKey> = {
  Govern: "workspace.nav.group.govern",
  Operate: "workspace.nav.group.operate",
  Optimize: "workspace.nav.group.optimize",
};

export function WorkspaceNav({
  currentRole,
  routes,
}: {
  currentRole: Role;
  routes: AppRouteDefinition[];
}) {
  const pathname = usePathname();
  const visibleRoutes = routes.filter(
    (route) =>
      route.pageKind === "page" && canAccess(route.requiredRole, currentRole),
  );
  const groups = [...new Set(visibleRoutes.map((route) => route.group))];

  return (
    <div className="nav-cluster">
      {groups.map((group) => (
        <div className="sidebar-group" key={group}>
          <p className="eyebrow">
            <LocalizedText fallback={group} k={groupLabelKeys[group] ?? "workspace.nav.group.operate"} />
          </p>
          <nav className="nav-list">
            {visibleRoutes
              .filter((route) => route.group === group)
              .map((route) => {
                const isActive =
                  pathname === route.href || pathname.startsWith(`${route.href}/`);
                const Icon = routeIcons[route.id] ?? Gauge;

                return (
                  <a
                    className={`nav-item ${isActive ? "active" : ""}`}
                    href={route.href}
                    key={route.id}
                    title={route.description}
                  >
                    <Icon aria-hidden="true" size={17} />
                    <LocalizedText
                      fallback={route.label}
                      k={routeLabelKeys[route.id] ?? "workspace.nav.dashboard"}
                    />
                  </a>
                );
              })}
          </nav>
        </div>
      ))}
    </div>
  );
}
