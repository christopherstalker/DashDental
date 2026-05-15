import type { ReactNode } from "react";
import { PlatformLayoutShell } from "@/features/app-shell/layouts/platform-layout-shell";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <PlatformLayoutShell>{children}</PlatformLayoutShell>;
}
