import type { ReactNode } from "react";
import { ShieldCheck, type LucideIcon } from "lucide-react";
import { canAccess } from "@/domain/business-rules";
import type { Role } from "@/domain/types";
import type { ClientSession } from "@/server/session";
import { DetailList } from "@/features/design-system/components/detail-list";
import { MetricTile } from "@/features/design-system/components/metric-tile";
import { PageHeader } from "@/features/design-system/components/page-header";
import { SurfaceCard } from "@/features/design-system/components/surface-card";
import { LocalizedText } from "@/features/i18n/components/localized-text";
import type { TranslationKey } from "@/features/i18n/translations";

interface BlueprintMetric {
  icon: LucideIcon;
  label: ReactNode;
  value: ReactNode;
  subtitle?: ReactNode;
  tone?: "neutral" | "warning" | "danger";
}

interface BlueprintPanel {
  eyebrow: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  items?: ReactNode[];
  details?: Array<{ label: ReactNode; value: ReactNode }>;
  wide?: boolean;
}

const roleLabelKeys: Record<Role, TranslationKey> = {
  admin: "workspace.role.admin",
  manager: "workspace.role.manager",
  owner: "workspace.role.owner",
  super_admin: "workspace.role.superAdmin",
};

export function SectionBlueprintPage({
  children,
  eyebrow,
  title,
  description,
  requiredRole,
  session,
  metrics,
  panels,
}: {
  children?: ReactNode;
  eyebrow: ReactNode;
  title: ReactNode;
  description: ReactNode;
  requiredRole: Role;
  session: ClientSession | null;
  metrics: BlueprintMetric[];
  panels: BlueprintPanel[];
}) {
  const hasAccess = session ? canAccess(requiredRole, session.role) : false;

  return (
    <section className="view-grid ddr-workspace-page">
      <PageHeader
        actions={
          <div className="notice">
            <ShieldCheck size={16} />
            <span>
              {session ? (
                <>
                  {session.user.name} -{" "}
                  <LocalizedText k={roleLabelKeys[session.role]} />
                </>
              ) : (
                <>
                  <LocalizedText k="workspace.access.requires" />{" "}
                  <LocalizedText k={roleLabelKeys[requiredRole]} />{" "}
                  <LocalizedText k="workspace.access.access" />
                </>
              )}
            </span>
          </div>
        }
        description={description}
        eyebrow={eyebrow}
        title={title}
      />

      {!hasAccess ? (
        <section className="empty-state">
          <ShieldCheck size={34} />
          <h2>
            <LocalizedText k="workspace.access.permissionRequired" />
          </h2>
          <p>
            <LocalizedText k="workspace.access.requiresRolePrefix" />{" "}
            <strong>
              <LocalizedText k={roleLabelKeys[requiredRole]} />
            </strong>{" "}
            <LocalizedText k="workspace.access.requiresRoleSuffix" />
          </p>
        </section>
      ) : (
        <>
          <div className="metrics-row">
            {metrics.map((metric, index) => (
              <MetricTile
                icon={metric.icon}
                key={index}
                label={metric.label}
                subtitle={metric.subtitle}
                tone={metric.tone}
                value={metric.value}
              />
            ))}
          </div>

          {panels.map((panel, index) => (
            <SurfaceCard
              description={panel.description}
              eyebrow={panel.eyebrow}
              key={index}
              title={panel.title}
              wide={panel.wide}
            >
              {panel.items ? (
                <div className="event-list">
                  {panel.items.map((item, index) => (
                    <div className="event-row" key={index}>
                      <strong>{item}</strong>
                    </div>
                  ))}
                </div>
              ) : null}
              {panel.details ? <DetailList items={panel.details} /> : null}
            </SurfaceCard>
          ))}
          {children}
        </>
      )}
    </section>
  );
}
