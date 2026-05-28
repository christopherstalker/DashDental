export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { ShieldCheck } from "lucide-react";
import { readAppState } from "@/server/data-store";
import {
  type AccountSession,
  decodeSession,
  resolveAuthenticatedUser,
  SESSION_COOKIE_NAME,
  toAccountSession,
} from "@/server/session";
import { readUserCredentialRecord } from "@/server/user-credentials";
import { WorkspaceSelector } from "@/features/workspaces/components/workspace-selector";

export const metadata: Metadata = {
  title: "Clinic Workspaces | Dash Dental",
  description: "Choose a clinic workspace after signing in to Dash Dental.",
};

export default async function WorkspacesPage() {
  const state = await readAppState();
  const cookieStore = await cookies();
  const sessionPayload = decodeSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  let account: AccountSession | null = null;
  let mfaEnabled = false;

  try {
    const user = resolveAuthenticatedUser(state, sessionPayload);
    account = toAccountSession(state, user, sessionPayload?.organizationId);
    const credential = await readUserCredentialRecord(user.id);
    mfaEnabled = Boolean(credential?.totpEnabledAt);
  } catch {
    account = null;
  }

  if (!account) {
    return (
      <main className="account-workspace-shell">
        <section className="account-no-workspace account-workspace-panel">
          <ShieldCheck size={34} />
          <h1>Sign in before choosing a clinic workspace.</h1>
          <p>
            Dash Dental separates your user account from clinic data. Sign in
            first, then open only the clinic workspaces where your email has an
            active membership.
          </p>
          <Link className="primary-button" href="/login">
            Go to login
          </Link>
        </section>
      </main>
    );
  }

  return <WorkspaceSelector account={account} mfaEnabled={mfaEnabled} />;
}
