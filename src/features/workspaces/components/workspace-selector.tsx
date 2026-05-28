"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  CreditCard,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import type { AccountSession } from "@/server/session";

export function WorkspaceSelector({
  account,
  mfaEnabled,
}: {
  account: AccountSession;
  mfaEnabled: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [pendingWorkspace, setPendingWorkspace] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [isStartingMfa, setIsStartingMfa] = useState(false);
  const [isVerifyingMfa, setIsVerifyingMfa] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [mfaOtpAuthUrl, setMfaOtpAuthUrl] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaMessage, setMfaMessage] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [mfaActive, setMfaActive] = useState(mfaEnabled);
  const [error, setError] = useState<string | null>(null);
  const emailVerified = Boolean(account.user.emailVerifiedAt);
  const isSuperAdmin = account.workspaces.some((workspace) => workspace.role === "super_admin");
  const hasPrivilegedWorkspace = account.workspaces.some((workspace) =>
    ["owner", "admin", "super_admin"].includes(workspace.role),
  );

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

  function openWorkspace(organizationId: string, destination = "/dashboard") {
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

        window.location.assign(destination);
      } catch {
        setError("Could not open this clinic workspace. Try again.");
      } finally {
        setPendingWorkspace(null);
      }
    });
  }

  async function startMfaSetup() {
    setError(null);
    setMfaMessage(null);
    setRecoveryCodes([]);
    setIsStartingMfa(true);

    try {
      const response = await fetch("/api/v1/auth/mfa/setup", {
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        otpauthUrl?: string;
        secret?: string;
      };

      if (!response.ok || !payload.secret) {
        setError(payload.error ?? "Could not start MFA setup.");
        return;
      }

      setMfaSecret(payload.secret);
      setMfaOtpAuthUrl(payload.otpauthUrl ?? null);
      setMfaMessage("Add this secret to your authenticator app, then enter the 6-digit code.");
    } catch {
      setError("Could not start MFA setup. Try again.");
    } finally {
      setIsStartingMfa(false);
    }
  }

  async function verifyMfaSetup() {
    setError(null);
    setMfaMessage(null);

    if (!/^\d{6}$/.test(mfaCode)) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }

    setIsVerifyingMfa(true);
    try {
      const response = await fetch("/api/v1/auth/mfa/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: mfaCode }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        recoveryCodes?: string[];
      };

      if (!response.ok) {
        setError(payload.error ?? "Could not verify MFA code.");
        return;
      }

      setRecoveryCodes(payload.recoveryCodes ?? []);
      setMfaMessage("MFA is active for this session. Platform billing controls are now available.");
      setMfaActive(true);
      setMfaCode("");
      setMfaSecret(null);
      setMfaOtpAuthUrl(null);
    } catch {
      setError("Could not verify MFA code. Try again.");
    } finally {
      setIsVerifyingMfa(false);
    }
  }

  async function sendVerificationEmail() {
    setError(null);
    setVerificationMessage(null);
    setVerificationUrl(null);
    setIsSendingVerification(true);

    try {
      const response = await fetch("/api/v1/auth/email-verification/request", {
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        alreadyVerified?: boolean;
        devUrl?: string;
        error?: string;
        status?: string;
      };

      if (!response.ok) {
        setError(payload.error ?? "Could not send verification email.");
        return;
      }

      setVerificationUrl(payload.devUrl ?? null);
      setVerificationMessage(
        payload.alreadyVerified
          ? "This work email is already verified."
          : payload.status === "skipped"
            ? "Email provider is not configured locally. Use the local verification link below."
            : "Verification email sent.",
      );
    } catch {
      setError("Could not request email verification. Try again.");
    } finally {
      setIsSendingVerification(false);
    }
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
            <>
              <Link href="/dashboard">
                <LayoutDashboard size={15} />
                Dashboard
              </Link>
              <Link href="/billing">
                <CreditCard size={15} />
                Billing
              </Link>
            </>
          ) : null}
          {isSuperAdmin ? (
            <>
              <Link href="/platform">
                <ShieldCheck size={15} />
                Platform
              </Link>
              <Link href="/platform/subscriptions">
                <CreditCard size={15} />
                Subscriptions
              </Link>
            </>
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

        {!emailVerified ? (
          <section className="account-security-panel">
            <div>
              <p className="eyebrow">Security action</p>
              <h2>Verify your work email</h2>
              <p>
                Release accounts keep dashboard access tied to a verified clinic
                mailbox. Send a secure verification link before go-live.
              </p>
              {verificationMessage ? <strong>{verificationMessage}</strong> : null}
              {verificationUrl ? <Link href={verificationUrl}>Open local verification link</Link> : null}
            </div>
            <button
              className="secondary-button"
              disabled={isSendingVerification}
              onClick={sendVerificationEmail}
              type="button"
            >
              <ShieldCheck size={15} />
              {isSendingVerification ? "Sending..." : "Send verification email"}
            </button>
          </section>
        ) : null}

        {hasPrivilegedWorkspace ? (
          <section className="account-security-panel account-billing-panel">
            <div>
              <p className="eyebrow">{isSuperAdmin ? "Super admin security" : "Billing security"}</p>
              <h2>
                {mfaActive
                  ? "MFA is enabled for protected billing actions"
                  : "Set up MFA before changing subscriptions"}
              </h2>
              <p>
                Dash Dental is free for the first 14 days. After trial expiry,
                workspace data locks until an owner pays or a platform super admin
                grants a paid subscription. Billing, workspaces, and logout stay open.
              </p>
              {mfaMessage ? <strong>{mfaMessage}</strong> : null}
              {mfaSecret ? (
                <div className="account-mfa-setup">
                  <span>Authenticator secret</span>
                  <code>{mfaSecret}</code>
                  {mfaOtpAuthUrl ? <small>{mfaOtpAuthUrl}</small> : null}
                  <label>
                    <span>6-digit code</span>
                    <input
                      inputMode="numeric"
                      maxLength={6}
                      onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="123456"
                      value={mfaCode}
                    />
                  </label>
                </div>
              ) : null}
              {recoveryCodes.length > 0 ? (
                <div className="account-mfa-setup">
                  <span>Recovery codes</span>
                  {recoveryCodes.map((code) => (
                    <code key={code}>{code}</code>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="account-workspace-actions">
              {!mfaSecret ? (
                <button
                  className="secondary-button"
                  disabled={mfaActive || isStartingMfa}
                  onClick={startMfaSetup}
                  type="button"
                >
                  <KeyRound size={15} />
                  {mfaActive ? "MFA enabled" : isStartingMfa ? "Starting..." : "Set up MFA"}
                </button>
              ) : (
                <button
                  className="primary-button"
                  disabled={isVerifyingMfa}
                  onClick={verifyMfaSetup}
                  type="button"
                >
                  <ShieldCheck size={15} />
                  {isVerifyingMfa ? "Verifying..." : "Verify MFA"}
                </button>
              )}
              {account.selectedOrganizationId ? (
                <Link className="secondary-button" href="/billing">
                  <CreditCard size={15} />
                  Open billing
                </Link>
              ) : null}
              {isSuperAdmin ? (
                <Link className="secondary-button" href="/platform/subscriptions">
                  <CreditCard size={15} />
                  Subscription admin
                </Link>
              ) : null}
            </div>
          </section>
        ) : null}

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
                      {workspace.role.replaceAll("_", " ")} access - clinic is{" "}
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
                  <div className="account-workspace-card-actions">
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
                    {["owner", "admin", "super_admin"].includes(workspace.role) ? (
                      <button
                        className="secondary-button"
                        disabled={isPending || isInvited}
                        onClick={() => openWorkspace(workspace.organizationId, "/billing")}
                        type="button"
                      >
                        <CreditCard size={15} />
                        Billing & payment
                      </button>
                    ) : null}
                    {workspace.role === "super_admin" ? (
                      <button
                        className="secondary-button"
                        disabled={isPending || isInvited}
                        onClick={() => openWorkspace(workspace.organizationId, "/platform/subscriptions")}
                        type="button"
                      >
                        <ShieldCheck size={15} />
                        Super admin panel
                      </button>
                    ) : null}
                  </div>
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
