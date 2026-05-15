import Link from "next/link";
import { Building2 } from "lucide-react";
import { SectionBlueprintPage } from "@/features/app-shell/components/section-blueprint-page";
import { getWorkspaceShellBootstrap } from "@/features/app-shell/data/workspace-bootstrap";
import { PageHeader } from "@/features/design-system/components/page-header";
import { SubscriptionsAdminPanel } from "@/features/platform-admin/components/subscriptions-admin-panel";
import { getPlatformCommercialOverviewData } from "@/features/platform-admin/data/commercial-admin";

export const dynamic = "force-dynamic";

export default async function PlatformSubscriptionsPage() {
  const bootstrap = await getWorkspaceShellBootstrap("super_admin");

  if (!bootstrap.session || bootstrap.session.role !== "super_admin") {
    return (
      <SectionBlueprintPage
        description="Only super-admin operators can grant or extend paid clinic subscriptions."
        eyebrow="Platform"
        metrics={[
          {
            icon: Building2,
            label: "Organizations",
            value: bootstrap.state.organizations.length,
            subtitle: "Visible to platform operator",
          },
        ]}
        panels={[
          {
            eyebrow: "Admin",
            title: "Subscription responsibilities",
            items: [
              "Confirm payment outside the product",
              "Grant the correct plan and period",
              "Keep invoice references in audit metadata",
              "Never expose cross-tenant data to clinic users",
            ],
          },
        ]}
        requiredRole="super_admin"
        session={bootstrap.session}
        title="Subscription admin blueprint"
      />
    );
  }

  const overview = await getPlatformCommercialOverviewData();

  return (
    <section className="view-grid admin-grid subscription-admin-page">
      <PageHeader
        actions={
          <Link className="secondary-button compact-button" href="/platform">
            Support console
          </Link>
        }
        description="Give clinics paid access after manual invoice confirmation. This is the founder-friendly panel for beta and early paid customers."
        eyebrow="Platform billing"
        title="Subscriptions"
      />
      <SubscriptionsAdminPanel overview={overview} />
    </section>
  );
}
