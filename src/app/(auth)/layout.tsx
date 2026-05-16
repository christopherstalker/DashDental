import type { ReactNode } from "react";
import { AuthLayoutShell } from "@/features/app-shell/layouts/auth-layout-shell";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthLayoutShell>{children}</AuthLayoutShell>;
}
