import Link from "next/link";
import {
  ArrowUpRight,
  Gauge,
  Plug,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { appStructureTree } from "@/features/app-shell/config/app-structure";
import { dataFetchingBlueprint } from "@/features/app-shell/config/data-fetching";
import { appRoutes } from "@/features/app-shell/config/route-map";
import { stateManagementBlueprint } from "@/features/app-shell/config/state-management";
import { dashboardWidgets } from "@/features/dashboard/dashboard-widgets";
import { PageHeader } from "@/features/design-system/components/page-header";
import { SurfaceCard } from "@/features/design-system/components/surface-card";
import { designSystemBasics, designSystemTokens } from "@/features/design-system/tokens";
import { inboxStructure } from "@/features/inbox/inbox-structure";
import { onboardingFlow } from "@/features/onboarding/onboarding-flow";

export default function AppArchitecturePage() {
  return (
    <main className="workspace standalone-workspace">
      <section className="view-grid">
        <PageHeader
          actions={
            <div className="dashboard-command-actions">
              <Link className="secondary-button" href="/dashboard">
                <ArrowUpRight size={16} />
                Open workspace routes
              </Link>
            </div>
          }
          description="Blueprint page for the frontend app structure, route map, layouts, pages, state model, and UI system."
          eyebrow="Blueprint"
          title="Dental SaaS app architecture"
        />

        <div className="metrics-row">
          <div className="metric-block">
            <Gauge size={18} />
            <span>Routes in map</span>
            <strong>{appRoutes.length}</strong>
            <small>Public, auth, workspace, and admin</small>
          </div>
          <div className="metric-block">
            <Sparkles size={18} />
            <span>Widget modules</span>
            <strong>{dashboardWidgets.length}</strong>
            <small>Dashboard composition units</small>
          </div>
          <div className="metric-block">
            <Target size={18} />
            <span>Onboarding steps</span>
            <strong>{onboardingFlow.length}</strong>
            <small>Launch path from register to billing</small>
          </div>
          <div className="metric-block">
            <ShieldCheck size={18} />
            <span>State slices</span>
            <strong>{stateManagementBlueprint.length}</strong>
            <small>Server and client responsibilities</small>
          </div>
        </div>

        <SurfaceCard
          description="Recommended feature split for the current Next App Router codebase."
          eyebrow="App structure"
          title="Folder structure"
          wide
        >
          <div className="event-list">
            {appStructureTree.map((node) => (
              <div className="event-row" key={node.label}>
                <strong>{node.label}</strong>
                <span>{node.detail}</span>
                {node.children?.length ? (
                  <div className="field-chip-list">
                    {node.children.map((child) => (
                      <span key={`${node.label}-${child.label}`}>
                        {child.label} · {child.kind}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard
          description="Concrete URL map and layout ownership."
          eyebrow="Route map"
          title="Pages and layouts"
          wide
        >
          <div className="data-table">
            <div className="table-head table-grid-4">
              <span>Path</span>
              <span>Label</span>
              <span>Layout</span>
              <span>Role</span>
            </div>
            {appRoutes.map((route) => (
              <div className="table-row table-grid-4" key={route.id}>
                <span>{route.href}</span>
                <span>{route.label}</span>
                <span>{route.layout}</span>
                <span>{route.requiredRole}</span>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard
          description="Client versus server responsibility split."
          eyebrow="State"
          title="State management"
        >
          <div className="event-list">
            {stateManagementBlueprint.map((slice) => (
              <div className="event-row" key={slice.name}>
                <strong>{slice.name}</strong>
                <span>{slice.owner}</span>
                <p>{slice.purpose} Lifetime: {slice.lifetime}.</p>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard
          description="Preferred fetching model for Next 16 App Router."
          eyebrow="Data"
          title="Data fetching strategy"
        >
          <div className="event-list">
            {dataFetchingBlueprint.map((stage) => (
              <div className="event-row" key={stage.layer}>
                <strong>{stage.layer}</strong>
                <span>{stage.strategy}</span>
                <p>{stage.implementation} {stage.notes}</p>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard
          description="Reusable primitives and token rules for the app shell."
          eyebrow="Design system"
          title="UI components and basics"
        >
          <div className="event-list">
            {designSystemBasics.map((item) => (
              <div className="event-row" key={item.title}>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
            ))}
          </div>
          <div className="field-chip-list">
            {designSystemTokens.colorRoles.map((token) => (
              <span key={token}>{token}</span>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard
          description="Widget inventory for the overview screen."
          eyebrow="Dashboard"
          title="Dashboard widgets"
        >
          <div className="event-list">
            {dashboardWidgets.map((widget) => (
              <div className="event-row" key={widget.id}>
                <strong>{widget.title}</strong>
                <span>{widget.owner}</span>
                <p>{widget.description}</p>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard
          description="Three-rail inbox information architecture."
          eyebrow="Inbox"
          title="Inbox structure"
        >
          <div className="event-list">
            {inboxStructure.map((rail) => (
              <div className="event-row" key={rail.title}>
                <strong>{rail.title}</strong>
                <span>{rail.purpose}</span>
                <div className="field-chip-list">
                  {rail.contents.map((item) => (
                    <span key={`${rail.title}-${item}`}>{item}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard
          description="Operational sequence from signup to first live sync."
          eyebrow="Onboarding"
          title="Onboarding flow"
          wide
        >
          <div className="event-list">
            {onboardingFlow.map((step) => (
              <div className="event-row" key={step.id}>
                <strong>{step.title}</strong>
                <span>{step.owner}</span>
                <p>
                  Route: {step.route}. Success: {step.successCriteria}
                </p>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard
          description="Layout ownership and shell partitioning."
          eyebrow="Layouts"
          title="Layout map"
        >
          <div className="event-list">
            <div className="event-row">
              <strong>Root layout</strong>
              <p>Owns fonts, globals, and the shared document shell.</p>
            </div>
            <div className="event-row">
              <strong>(auth)/layout.tsx</strong>
              <p>Owns access-entry presentation and keeps auth routes separate from workspace chrome.</p>
            </div>
            <div className="event-row">
              <strong>(workspace)/layout.tsx</strong>
              <p>Owns tenant bootstrap, sidebar navigation, and the workspace state provider.</p>
            </div>
            <div className="event-row">
              <strong>(admin)/layout.tsx</strong>
              <p>Owns super-admin navigation and platform-only context.</p>
            </div>
          </div>
          <div className="field-chip-list">
            <span>PageHeader</span>
            <span>SurfaceCard</span>
            <span>MetricTile</span>
            <span>DetailList</span>
          </div>
        </SurfaceCard>

        <SurfaceCard
          description="High-level page inventory for the MVP app shell."
          eyebrow="Pages"
          title="Page set"
        >
          <div className="event-list">
            <div className="event-row">
              <strong>Access</strong>
              <p>/login, /register</p>
            </div>
            <div className="event-row">
              <strong>Operate</strong>
              <p>/dashboard, /setup, /queue, /alerts, /leads, /inbox, /inbox/[conversationId]</p>
            </div>
            <div className="event-row">
              <strong>Optimize</strong>
              <p>/automations, /integrations, /ai</p>
            </div>
            <div className="event-row">
              <strong>Govern</strong>
              <p>/reports, /billing, /compliance, /platform</p>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard
          description="Channel and billing touchpoints exposed as widgets or admin summaries."
          eyebrow="Modules"
          title="Business modules"
        >
          <div className="field-chip-list">
            <span>Auth</span>
            <span>Dashboard</span>
            <span>Queue</span>
            <span>Inbox</span>
            <span>Leads</span>
            <span>Automations</span>
            <span>Integrations</span>
            <span>AI</span>
            <span>Billing</span>
            <span>Compliance</span>
            <span>Platform admin</span>
            <span>Onboarding</span>
          </div>
          <div className="event-list">
            <div className="event-row">
              <strong>Channel setup</strong>
              <span>Telegram, web form, Clinic DB adapters</span>
            </div>
            <div className="event-row">
              <strong>Commercial layer</strong>
              <span>Stripe checkout, portal, usage guardrails</span>
            </div>
            <div className="event-row">
              <strong>Tenant safety</strong>
              <span>Session scope, RBAC, audit and contract visibility</span>
            </div>
          </div>
          <div className="field-chip-list">
            <span>
              <Plug size={12} /> Integration-driven
            </span>
          </div>
        </SurfaceCard>
      </section>
    </main>
  );
}
