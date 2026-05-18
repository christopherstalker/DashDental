import type { Metadata } from "next";
import { readAppState } from "@/server/data-store";
import { getTeamInvitePreview } from "@/server/team-invites";
import { InviteAcceptForm } from "@/features/invites/components/invite-accept-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Accept Invite - Dash Dental",
  description: "Accept a Dash Dental clinic workspace invitation.",
};

function readToken(searchParams: Record<string, string | string[] | undefined>) {
  const token = searchParams.token;
  return Array.isArray(token) ? token[0] : token;
}

export default async function InviteAcceptPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const token = readToken(query) ?? "";
  const state = await readAppState();
  const preview = getTeamInvitePreview(state, token);

  return <InviteAcceptForm preview={preview} token={token} />;
}
