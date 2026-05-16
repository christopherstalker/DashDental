export const dynamic = "force-dynamic";

import { Gauge, Search, TrendingDown, Users } from "lucide-react";
import { SectionBlueprintPage } from "@/features/app-shell/components/section-blueprint-page";
import { getWorkspaceShellBootstrap } from "@/features/app-shell/data/workspace-bootstrap";
import { LocalizedText } from "@/features/i18n/components/localized-text";

export default async function LeadsPage() {
  const bootstrap = await getWorkspaceShellBootstrap("manager");

  return (
    <SectionBlueprintPage
      description={<LocalizedText k="leads.header.description" />}
      eyebrow={<LocalizedText k="workspace.nav.group.operate" />}
      metrics={[
        {
          icon: Users,
          label: <LocalizedText k="leads.metric.records" />,
          value: bootstrap.state.leads.length,
          subtitle: <LocalizedText k="leads.metric.recordsSub" />,
        },
        {
          icon: Search,
          label: <LocalizedText k="leads.metric.sources" />,
          value: new Set(bootstrap.state.leads.map((lead) => lead.source)).size,
          subtitle: <LocalizedText k="leads.metric.sourcesSub" />,
        },
        {
          icon: Gauge,
          label: <LocalizedText k="leads.metric.conversion" />,
          value: `${bootstrap.overview.conversionRate}%`,
          subtitle: <LocalizedText k="leads.metric.conversionSub" />,
        },
        {
          icon: TrendingDown,
          label: <LocalizedText k="leads.metric.lost" />,
          value: bootstrap.overview.lost,
          subtitle: <LocalizedText k="leads.metric.lostSub" />,
          tone: "danger",
        },
      ]}
      panels={[
        {
          eyebrow: <LocalizedText k="leads.panel.pipelineEyebrow" />,
          title: <LocalizedText k="leads.panel.pipelineTitle" />,
          items: [
            <LocalizedText key="identity" k="leads.item.identity" />,
            <LocalizedText key="status" k="leads.item.status" />,
            <LocalizedText key="value" k="leads.item.value" />,
            <LocalizedText key="jump" k="leads.item.jump" />,
          ],
        },
        {
          eyebrow: <LocalizedText k="leads.panel.workflowEyebrow" />,
          title: <LocalizedText k="leads.panel.workflowTitle" />,
          items: [
            <LocalizedText key="filter" k="leads.item.filter" />,
            <LocalizedText key="openInbox" k="leads.item.openInbox" />,
            <LocalizedText key="updateOutcome" k="leads.item.updateOutcome" />,
          ],
        },
      ]}
      requiredRole="manager"
      session={bootstrap.session}
      title={<LocalizedText k="leads.header.title" />}
    />
  );
}

