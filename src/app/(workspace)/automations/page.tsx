import { Bot, ShieldCheck, ToggleRight, Zap } from "lucide-react";
import { SectionBlueprintPage } from "@/features/app-shell/components/section-blueprint-page";
import { getWorkspaceShellBootstrap } from "@/features/app-shell/data/workspace-bootstrap";
import { LocalizedText } from "@/features/i18n/components/localized-text";

export default async function AutomationsPage() {
  const bootstrap = await getWorkspaceShellBootstrap("admin");
  const activeRules = bootstrap.state.automationRules.filter((rule) => rule.active).length;

  return (
    <SectionBlueprintPage
      description={<LocalizedText k="automations.header.description" />}
      eyebrow={<LocalizedText k="workspace.nav.group.optimize" />}
      metrics={[
        {
          icon: ToggleRight,
          label: <LocalizedText k="automations.metric.active" />,
          value: activeRules,
          subtitle: <LocalizedText k="automations.metric.activeSub" />,
        },
        {
          icon: Zap,
          label: <LocalizedText k="automations.metric.total" />,
          value: bootstrap.state.automationRules.length,
          subtitle: <LocalizedText k="automations.metric.totalSub" />,
        },
        {
          icon: Bot,
          label: <LocalizedText k="automations.metric.aiFlows" />,
          value: bootstrap.state.aiInsights.length,
          subtitle: <LocalizedText k="automations.metric.aiFlowsSub" />,
        },
        {
          icon: ShieldCheck,
          label: <LocalizedText k="automations.metric.guardrails" />,
          value: <LocalizedText k="automations.metric.guardrailsValue" />,
          subtitle: <LocalizedText k="automations.metric.guardrailsSub" />,
        },
      ]}
      panels={[
        {
          eyebrow: <LocalizedText k="automations.panel.rulesEyebrow" />,
          title: <LocalizedText k="automations.panel.scopeTitle" />,
          items: [
            <LocalizedText key="firstReply" k="automations.item.firstReply" />,
            <LocalizedText key="afterHours" k="automations.item.afterHours" />,
            <LocalizedText key="escalation" k="automations.item.escalation" />,
          ],
        },
      ]}
      requiredRole="admin"
      session={bootstrap.session}
      title={<LocalizedText k="automations.header.title" />}
    />
  );
}
