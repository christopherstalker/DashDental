export const dynamic = "force-dynamic";

import {
  SettingsScreen,
  type SettingsBilling,
  type SettingsDigest,
  type SettingsIntegration,
  type SettingsTeamMember,
  type SettingsTemplate,
} from "@/components/settings/settings-screen";
import { getWorkspaceShellBootstrap } from "@/features/app-shell/data/workspace-bootstrap";

export default async function DashboardSettingsPage() {
  const bootstrap = await getWorkspaceShellBootstrap("manager");
  const organizationId = bootstrap.organization.id;
  const usersById = new Map(bootstrap.state.users.map((user) => [user.id, user]));
  const team = bootstrap.state.memberships
    .filter(
      (membership) =>
        membership.organizationId === organizationId &&
        membership.status === "active" &&
        membership.role !== "super_admin",
    )
    .reduce<SettingsTeamMember[]>((accumulator, membership) => {
      const user = usersById.get(membership.userId);

      if (!user) {
        return accumulator;
      }

      accumulator.push({
        email: user.email,
        id: user.id,
        name: user.name,
        role: membership.role,
      });

      return accumulator;
    }, []);
  const templates: SettingsTemplate[] = bootstrap.state.replyTemplates
    .filter((template) => template.organizationId === organizationId)
    .map((template) => ({
      category: template.category,
      id: template.id,
      title: template.title,
    }));
  const integrations: SettingsIntegration[] = bootstrap.state.integrations
    .filter((integration) => integration.organizationId === organizationId)
    .map((integration) => ({
      errorState: integration.errorState,
      healthScore: integration.healthScore,
      id: integration.id,
      provider: integration.provider,
      status: integration.status,
    }));
  const latestDigest = bootstrap.state.weeklyDigests
    .filter((digest) => digest.organizationId === organizationId)
    .toSorted(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    )
    .at(0);
  const digest: SettingsDigest = {
    enabled: Boolean(latestDigest && latestDigest.status !== "failed"),
    recipientEmail: latestDigest?.recipientEmail ?? bootstrap.session?.user.email ?? "",
  };
  const billing: SettingsBilling = {
    daysRemaining: bootstrap.billing.daysRemaining,
    plan: bootstrap.subscription?.plan ?? "starter",
    planLabel: bootstrap.billing.planLabel,
    status: bootstrap.billing.status,
  };

  return (
    <SettingsScreen
      billing={billing}
      digest={digest}
      featureFlags={bootstrap.state.featureFlags.filter((flag) => flag.organizationId === organizationId)}
      integrations={integrations}
      organizationId={organizationId}
      organizationName={bootstrap.organization.name}
      team={team}
      templates={templates}
      timezone={bootstrap.organization.timezone}
    />
  );
}
