import { AlertTriangle, Clock3, Timer, Users } from "lucide-react";
import { SectionBlueprintPage } from "@/features/app-shell/components/section-blueprint-page";
import { getWorkspaceShellBootstrap } from "@/features/app-shell/data/workspace-bootstrap";
import { LocalizedText } from "@/features/i18n/components/localized-text";

export default async function QueuePage() {
  const bootstrap = await getWorkspaceShellBootstrap("manager");
  const queuedLeads = bootstrap.state.leads.filter(
    (lead) => lead.status === "new" || lead.status === "unanswered" || lead.status === "at_risk",
  );

  return (
    <SectionBlueprintPage
      description={<LocalizedText k="queue.header.description" />}
      eyebrow={<LocalizedText k="workspace.nav.group.operate" />}
      metrics={[
        {
          icon: Timer,
          label: <LocalizedText k="queue.metric.queued" />,
          value: queuedLeads.length,
          subtitle: <LocalizedText k="queue.metric.queuedSub" />,
        },
        {
          icon: AlertTriangle,
          label: <LocalizedText k="queue.metric.atRisk" />,
          value: bootstrap.overview.atRisk,
          subtitle: <LocalizedText k="queue.metric.atRiskSub" />,
          tone: "warning",
        },
        {
          icon: Clock3,
          label: <LocalizedText k="queue.metric.avgResponse" />,
          value: (
            <>
              {bootstrap.overview.averageResponseMinutes}{" "}
              <LocalizedText k="dashboard.unit.minuteShort" />
            </>
          ),
          subtitle: <LocalizedText k="queue.metric.avgResponseSub" />,
        },
        {
          icon: Users,
          label: <LocalizedText k="queue.metric.openThreads" />,
          value: bootstrap.summary.openConversations,
          subtitle: <LocalizedText k="queue.metric.openThreadsSub" />,
        },
      ]}
      panels={[
        {
          eyebrow: <LocalizedText k="queue.panel.priorityEyebrow" />,
          title: <LocalizedText k="queue.panel.priorityTitle" />,
          items: [
            <LocalizedText key="critical" k="queue.item.critical" />,
            <LocalizedText key="high" k="queue.item.high" />,
            <LocalizedText key="normal" k="queue.item.normal" />,
          ],
        },
        {
          eyebrow: <LocalizedText k="queue.panel.actionsEyebrow" />,
          title: <LocalizedText k="queue.panel.actionsTitle" />,
          items: [
            <LocalizedText key="openConversation" k="queue.item.openConversation" />,
            <LocalizedText key="reply" k="queue.item.reply" />,
            <LocalizedText key="outcome" k="queue.item.outcome" />,
          ],
        },
      ]}
      requiredRole="manager"
      session={bootstrap.session}
      title={<LocalizedText k="queue.header.title" />}
    />
  );
}
