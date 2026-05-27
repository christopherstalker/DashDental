"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import type { AccountSession } from "@/server/session";

export function WorkspaceSelector({ account }: { account: AccountSession }) {
  const [isPending, startTransition] = useTransition();
  const [pendingWorkspace, setPendingWorkspace] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    setError(null);
    setIsSigningOut(true);

    try {
      await fetch("/api/v1/auth/session", { method: "DELETE" });
      window.location.assign("/login");
    } catch {
      setError("Could not sign out. Try again.");
      setIsSigningOut(false);
    }
  }

  function openWorkspace(organizationId: string) {
    setError(null);
    setPendingWorkspace(organizationId);
    startTransition(async () => {
      try {
        const response = await fetch("/api/v1/auth/workspace", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ organizationId }),
        });
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };

        if (!response.ok) {
          setError(payload.error ?? "Could not open this clinic workspace.");
          return;
        }

        window.location.assign("/dashboard");
      } catch {
        setError("Could not open this clinic workspace. Try again.");
      } finally {
        setPendingWorkspace(null);
      }
    });
  }

  return (
    <main className="account-workspace-shell">
      <header className="account-workspace-topbar">
        <Link className="account-workspace-brand" href="/">
          <span>
            <MessageCircle size={17} />
          </span>
          <strong>Dash Dental</strong>
        </Link>
        <nav className="account-workspace-nav" aria-label="Account navigation">
          <Link aria-current="page" className="active" href="/workspaces">
            <Building2 size={15} />
            Workspaces
          </Link>
          {account.selectedOrganizationId ? (
            <Link href="/dashboard">
              <LayoutDashboard size={15} />
              Dashboard
            </Link>
          ) : null}
        </nav>
        <button
          className="secondary-button account-signout-button"
          disabled={isSigningOut}
          onClick={signOut}
          type="button"
        >
          <LogOut size={15} />
          {isSigningOut ? "Signing out..." : "Sign out"}
        </button>
      </header>

      <section className="account-workspace-panel">
        <header className="account-workspace-header">
          <div>
            <p className="eyebrow">Account hub</p>
            <h1>Choose a clinic workspace</h1>
            <p>
              Signed in as {account.user.email}. Open dashboard access from a
              verified workspace instead of the public marketing header.
            </p>
          </div>
          <Link className="secondary-button" href="/">
            Public site
          </Link>
        </header>

        {account.workspaces.length > 0 ? (
          <div className="account-workspace-grid">
            {account.workspaces.map((workspace) => {
              const isInvited = workspace.membershipStatus === "invited";
              const isCurrent =
                account.selectedOrganizationId === workspace.organizationId;

              return (
                <article className="account-workspace-card" key={workspace.membershipId}>
                  <div className="account-workspace-card-head">
                    <span className="account-workspace-icon">
                      <Building2 size={19} />
                    </span>
                    <span className={`status-dot ${isInvited ? "pending" : "active"}`}>
                      {isInvited ? "Pending invite" : isCurrent ? "Current" : "Active"}
                    </span>
                  </div>
                  <div>
                    <h2>{workspace.organizationName}</h2>
                    <p>
                      {workspace.role.replaceAll("_", " ")} access · clinic is{" "}
                      {workspace.organizationStatus}
                    </p>
                  </div>
                  <div className="account-workspace-proof">
                    <span>
                      <ShieldCheck size={15} />
                      Tenant-scoped
                    </span>
                    <span>
                      {isInvited ? <Clock3 size={15} /> : <CheckCircle2 size={15} />}
                      {isInvited ? "Activates after first sign-in" : "Membership verified"}
                    </span>
                  </div>
                  <button
                    className="primary-button"
                    disabled={isPending || isInvited}
                    onClick={() => openWorkspace(workspace.organizationId)}
                    type="button"
                  >
                    {pendingWorkspace === workspace.organizationId
                      ? "Opening..."
                      : isInvited
                        ? "Invite pending"
                        : isCurrent
                          ? "Open dashboard"
                          : "Select and open dashboard"}
                    <ArrowRight size={16} />
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <section className="account-no-workspace">
            <ShieldCheck size={34} />
            <h2>You do not have access to a clinic workspace yet.</h2>
            <p>
              Ask your clinic owner or admin to add this email address to the
              clinic team and assign a role. Signing in alone does not grant
              clinic dashboard access.
            </p>
            <div className="account-workspace-actions">
              <Link
                className="primary-button"
                href="/support?category=Demo%20or%20onboarding%20call&message=Please%20help%20my%20clinic%20set%20up%20workspace%20access.#request"
              >
                Contact support
              </Link>
              <Link className="secondary-button" href="/register">
                Create clinic workspace
              </Link>
            </div>
          </section>
        )}

        {error ? <p className="login-error">{error}</p> : null}
      </section>
    </main>
  );
}
