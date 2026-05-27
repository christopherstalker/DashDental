"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { AnchorHTMLAttributes } from "react";
import { useEffect, useState } from "react";

type AuthState = "unknown" | "guest" | "signed-in";

export function PublicAccountCta({
  className,
  guestLabel = "Create account",
  signedInLabel = "Account hub",
  showArrow = false,
  ...anchorProps
}: {
  className: string;
  guestLabel?: string;
  signedInLabel?: string;
  showArrow?: boolean;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "href">) {
  const [authState, setAuthState] = useState<AuthState>("unknown");

  useEffect(() => {
    let cancelled = false;

    async function readSession() {
      try {
        const response = await fetch("/api/v1/auth/session", {
          credentials: "same-origin",
        });

        if (!response.ok) {
          if (!cancelled) setAuthState("guest");
          return;
        }

        const payload = (await response.json().catch(() => ({}))) as {
          session?: { user?: { id?: string } };
        };

        if (!cancelled) {
          setAuthState(payload.session?.user?.id ? "signed-in" : "guest");
        }
      } catch {
        if (!cancelled) setAuthState("guest");
      }
    }

    void readSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const signedIn = authState === "signed-in";
  const label = signedIn ? signedInLabel : guestLabel;

  return (
    <Link {...anchorProps} className={className} href={signedIn ? "/workspaces" : "/register"}>
      {label}
      {showArrow ? <ArrowRight size={15} /> : null}
    </Link>
  );
}
