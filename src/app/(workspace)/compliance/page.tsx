export const dynamic = "force-dynamic";

import { FileWarning, Plug, ShieldCheck, Users } from "lucide-react";
import { SectionBlueprintPage } from "@/features/app-shell/components/section-blueprint-page";
import { getWorkspaceShellBootstrap } from "@/features/app-shell/data/workspace-bootstrap";
import { LocalizedText } from "@/features/i18n/components/localized-text";

export default async function CompliancePage() {
  const bootstrap = await getWorkspaceShellBootstrap("admin");

  return (
    <SectionBlueprintPage
      description={<LocalizedText k="compliance.header.description" />}
      eyebrow={<LocalizedText k="workspace.nav.group.govern" />}
      metrics={[
        {
          icon: ShieldCheck,
          label: <LocalizedText k="compliance.metric.contracts" />,
          value: bootstrap.state.dataAccessContracts.filter((contract) => contract.status === "approved").length,
          subtitle: <LocalizedText k="compliance.metric.contractsSub" />,
        },
        {
          icon: FileWarning,
          label: <LocalizedText k="compliance.metric.audit" />,
          value: bootstrap.state.auditLogs.length,
          subtitle: <LocalizedText k="compliance.metric.auditSub" />,
        },
        {
          icon: Plug,
          label: <LocalizedText k="compliance.metric.events" />,
          value: bootstrap.state.integrationEvents.length,
          subtitle: <LocalizedText k="compliance.metric.eventsSub" />,
        },
        {
          icon: Users,
          label: <LocalizedText k="compliance.metric.approvers" />,
          value: <LocalizedText k="compliance.metric.approversValue" />,
          subtitle: <LocalizedText k="compliance.metric.approversSub" />,
        },
      ]}
      panels={[
        {
          eyebrow: <LocalizedText k="compliance.panel.artifactsEyebrow" />,
          title: <LocalizedText k="compliance.panel.outputsTitle" />,
          items: [
            <LocalizedText key="contract" k="compliance.item.contract" />,
            <LocalizedText key="auditExport" k="compliance.item.auditExport" />,
            <LocalizedText key="timeline" k="compliance.item.timeline" />,
            <LocalizedText key="revocation" k="compliance.item.revocation" />,
          ],
        },
      ]}
      requiredRole="admin"
      session={bootstrap.session}
      title={<LocalizedText k="compliance.header.title" />}
    />
  );
}

