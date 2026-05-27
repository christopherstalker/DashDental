"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, ShieldAlert } from "lucide-react";

type VerifyState = "checking" | "success" | "error";

export function VerifyEmailResult({ token }: { token: string }) {
  const [state, setState] = useState<VerifyState>(token ? "checking" : "error");
  const [message, setMessage] = useState(
    token ? "Checking verification link..." : "Verification token is missing.",
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    let active = true;
    async function verify() {
      try {
        const response = await fetch("/api/v1/auth/email-verification/confirm", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };

        if (!active) {
          return;
        }
        if (!response.ok) {
          setState("error");
          setMessage(payload.error ?? "This verification link is invalid or expired.");
          return;
        }

        setState("success");
        setMessage("Your work email is verified.");
      } catch {
        if (active) {
          setState("error");
          setMessage("Verification request did not reach Dash Dental. Try the link again.");
        }
      }
    }

    void verify();
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <section className="auth-card">
      <div className="auth-card-heading">
        <p className="eyebrow">Email verification</p>
        <h2>{state === "success" ? "Email verified" : "Verify your work email"}</h2>
        <p>{message}</p>
      </div>

      <div className={`auth-success-panel ${state === "error" ? "error" : ""}`}>
        {state === "checking" ? (
          <Loader2 className="login-spin" size={18} />
        ) : state === "success" ? (
          <CheckCircle2 size={18} />
        ) : (
          <ShieldAlert size={18} />
        )}
        <div>
          <strong>
            {state === "checking"
              ? "Checking link"
              : state === "success"
                ? "Account security updated"
                : "Verification failed"}
          </strong>
          <p>
            {state === "success"
              ? "Return to the account hub to continue release setup."
              : "You can request a fresh verification link from the account hub."}
          </p>
          <Link href="/workspaces">Open account hub</Link>
        </div>
      </div>
    </section>
  );
}
