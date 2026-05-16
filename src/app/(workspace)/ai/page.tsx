export const dynamic = "force-dynamic";

import { Bot, CircleDollarSign, Sparkles, Target } from "lucide-react";
import { SectionBlueprintPage } from "@/features/app-shell/components/section-blueprint-page";
import { getWorkspaceShellBootstrap } from "@/features/app-shell/data/workspace-bootstrap";
import { LocalizedText } from "@/features/i18n/components/localized-text";

export default async function AiPage() {
  const bootstrap = await getWorkspaceShellBootstrap("manager");
  const aiRuns = bootstrap.state.usageLimits[0]?.periodUsageJson.aiRuns ?? 0;

  return (
    <SectionBlueprintPage
      description={<LocalizedText k="ai.header.description" />}
      eyebrow={<LocalizedText k="workspace.nav.group.optimize" />}
      metrics={[
        {
          icon: Sparkles,
          label: <LocalizedText k="ai.metric.insights" />,
          value: bootstrap.state.aiInsights.length,
          subtitle: <LocalizedText k="ai.metric.insightsSub" />,
        },
        {
          icon: Bot,
          label: <LocalizedText k="ai.metric.runs" />,
          value: aiRuns,
          subtitle: <LocalizedText k="ai.metric.runsSub" />,
        },
        {
          icon: Target,
          label: <LocalizedText k="ai.metric.topUse" />,
          value: <LocalizedText k="ai.metric.topUseValue" />,
          subtitle: <LocalizedText k="ai.metric.topUseSub" />,
        },
        {
          icon: CircleDollarSign,
          label: <LocalizedText k="ai.metric.cost" />,
          value: <LocalizedText k="ai.metric.costValue" />,
          subtitle: <LocalizedText k="ai.metric.costSub" />,
        },
      ]}
      panels={[
        {
          eyebrow: <LocalizedText k="ai.panel.pipelineEyebrow" />,
          title: <LocalizedText k="ai.panel.jobsTitle" />,
          items: [
            <LocalizedText key="summaries" k="ai.item.summaries" />,
            <LocalizedText key="risk" k="ai.item.risk" />,
            <LocalizedText key="intent" k="ai.item.intent" />,
            <LocalizedText key="surface" k="ai.item.surface" />,
          ],
        },
      ]}
      requiredRole="manager"
      session={bootstrap.session}
      title={<LocalizedText k="ai.header.title" />}
    />
  );
}

