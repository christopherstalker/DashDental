import { AlertTriangle, Bell, Plug, ShieldCheck } from "lucide-react";
import { SectionBlueprintPage } from "@/features/app-shell/components/section-blueprint-page";
import { getWorkspaceShellBootstrap } from "@/features/app-shell/data/workspace-bootstrap";
import { LocalizedText } from "@/features/i18n/components/localized-text";

export default async function AlertsPage() {
  const bootstrap = await getWorkspaceShellBootstrap("manager");
  const failedEvents = bootstrap.state.integrationEvents.filter(
    (event) => event.status === "failed",
  ).length;

  return (
    <SectionBlueprintPage
      description={<LocalizedText k="alerts.header.description" />}
      eyebrow={<LocalizedText k="workspace.nav.group.operate" />}
      metrics={[
        {
          icon: Bell,
          label: <LocalizedText k="alerts.metric.backlog" />,
          value: bootstrap.overview.atRisk + failedEvents,
          subtitle: <LocalizedText k="alerts.metric.backlogSub" />,
        },
        {
          icon: AlertTriangle,
          label: <LocalizedText k="alerts.metric.failed" />,
          value: failedEvents,
          subtitle: <LocalizedText k="alerts.metric.failedSub" />,
          tone: "danger",
        },
        {
          icon: Plug,
          label: <LocalizedText k="alerts.metric.degraded" />,
          value: bootstrap.state.integrations.filter((integration) => integration.status === "degraded").length,
          subtitle: <LocalizedText k="alerts.metric.degradedSub" />,
          tone: "warning",
        },
        {
          icon: ShieldCheck,
          label: <LocalizedText k="alerts.metric.contracts" />,
          value: bootstrap.state.dataAccessContracts.filter((contract) => contract.status === "approved").length,
          subtitle: <LocalizedText k="alerts.metric.contractsSub" />,
        },
      ]}
      panels={[
        {
          eyebrow: <LocalizedText k="alerts.panel.routingEyebrow" />,
          title: <LocalizedText k="alerts.panel.routingTitle" />,
          items: [
            <LocalizedText key="sla" k="alerts.item.sla" />,
            <LocalizedText key="sync" k="alerts.item.sync" />,
            <LocalizedText key="usage" k="alerts.item.usage" />,
            <LocalizedText key="contracts" k="alerts.item.contracts" />,
          ],
          wide: true,
        },
      ]}
      requiredRole="manager"
      session={bootstrap.session}
      title={<LocalizedText k="alerts.header.title" />}
    />
  );
}
