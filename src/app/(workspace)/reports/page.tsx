export const dynamic = "force-dynamic";

import { CalendarDays, CircleDollarSign, Gauge, TrendingDown } from "lucide-react";
import { SectionBlueprintPage } from "@/features/app-shell/components/section-blueprint-page";
import { getWorkspaceShellBootstrap } from "@/features/app-shell/data/workspace-bootstrap";
import { LocalizedText } from "@/features/i18n/components/localized-text";

export default async function ReportsPage() {
  const bootstrap = await getWorkspaceShellBootstrap("owner");

  return (
    <SectionBlueprintPage
      description={<LocalizedText k="reports.header.description" />}
      eyebrow={<LocalizedText k="workspace.nav.group.govern" />}
      metrics={[
        {
          icon: Gauge,
          label: <LocalizedText k="reports.metric.conversion" />,
          value: `${bootstrap.overview.conversionRate}%`,
          subtitle: <LocalizedText k="reports.metric.conversionSub" />,
        },
        {
          icon: CircleDollarSign,
          label: <LocalizedText k="reports.metric.lostRevenue" />,
          value: `$${bootstrap.overview.lostRevenue}`,
          subtitle: <LocalizedText k="reports.metric.lostRevenueSub" />,
          tone: "danger",
        },
        {
          icon: CalendarDays,
          label: <LocalizedText k="reports.metric.horizon" />,
          value: <LocalizedText k="reports.metric.horizonValue" />,
          subtitle: <LocalizedText k="reports.metric.horizonSub" />,
        },
        {
          icon: TrendingDown,
          label: <LocalizedText k="reports.metric.lostLeads" />,
          value: bootstrap.overview.lost,
          subtitle: <LocalizedText k="reports.metric.lostLeadsSub" />,
        },
      ]}
      panels={[
        {
          eyebrow: <LocalizedText k="reports.panel.truthEyebrow" />,
          title: <LocalizedText k="reports.panel.modulesTitle" />,
          items: [
            <LocalizedText key="funnel" k="reports.item.funnel" />,
            <LocalizedText key="reasons" k="reports.item.reasons" />,
            <LocalizedText key="sources" k="reports.item.sources" />,
            <LocalizedText key="managerLoad" k="reports.item.managerLoad" />,
          ],
        },
      ]}
      requiredRole="owner"
      session={bootstrap.session}
      title={<LocalizedText k="reports.header.title" />}
    />
  );
}

