import type { ReactNode } from "react";
import { getWorkspaceShellBootstrap } from "@/features/app-shell/data/workspace-bootstrap";
import { WorkspaceLayoutShell } from "@/features/app-shell/layouts/workspace-layout-shell";

export default async function WorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const bootstrap = await getWorkspaceShellBootstrap();

  return <WorkspaceLayoutShell bootstrap={bootstrap}>{children}</WorkspaceLayoutShell>;
}
