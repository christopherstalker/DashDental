"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { CreditCard, ShieldCheck } from "lucide-react";
import type { Subscription } from "@/domain/types";
import type { BillingInterval } from "@/server/validation";
import { useCurrentLanguageCode } from "@/features/i18n/translation-store";
import { translate } from "@/features/i18n/translations";

type BillingActionMode = "checkout" | "portal";

export function BillingActionButton({
  className = "secondary-button",
  disabled = false,
  interval,
  label,
  mode,
  organizationId,
  plan,
}: {
  className?: string;
  disabled?: boolean;
  interval?: BillingInterval;
  label: ReactNode;
  mode: BillingActionMode;
  organizationId: string;
  plan?: Subscription["plan"];
}) {
  const languageCode = useCurrentLanguageCode();
  const [isOpening, setIsOpening] = useState(false);
  const [isVerifyingMfa, setIsVerifyingMfa] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function openBillingAction() {
    setIsOpening(true);
    setError(null);

    try {
      const endpoint =
        mode === "portal"
          ? "/api/v1/billing/customer-portal"
          : "/api/v1/billing/checkout-session";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          organizationId,
          ...(plan ? { plan } : {}),
          ...(interval ? { interval } : {}),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        code?: string;
        url?: string;
        error?: string;
      };

      if (!response.ok || !payload.url) {
        if (payload.code === "mfa_required") {
          setMfaRequired(true);
          setError("MFA is enabled, but this session needs a fresh 6-digit code before billing changes.");
          return;
        }

        setError(
          payload.error ??
            (payload.code === "paddle_customer_missing"
              ? "A paid Paddle customer is created after the first successful checkout."
              : translate("billing.action.unavailable", languageCode)),
        );
        return;
      }

      window.location.assign(payload.url);
    } catch {
      setError(translate("billing.action.openError", languageCode));
    } finally {
      setIsOpening(false);
    }
  }

  async function verifyMfaAndRetry() {
    const cleanCode = mfaCode.replace(/\D/g, "").slice(0, 6);
    setError(null);

    if (!/^\d{6}$/.test(cleanCode)) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }

    setIsVerifyingMfa(true);
    try {
      const response = await fetch("/api/v1/auth/mfa/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: cleanCode }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error ?? "Could not verify MFA code.");
        return;
      }

      setMfaRequired(false);
      setMfaCode("");
      await openBillingAction();
    } catch {
      setError("Could not verify MFA code. Try again.");
    } finally {
      setIsVerifyingMfa(false);
    }
  }

  return (
    <div className="billing-action-stack">
      <button
        className={className}
        disabled={disabled || isOpening}
        onClick={openBillingAction}
        type="button"
      >
        <CreditCard size={16} />
        {isOpening ? translate("billing.action.opening", languageCode) : label}
      </button>
      {mfaRequired ? (
        <div className="billing-mfa-challenge">
          <label>
            <span>Authenticator code</span>
            <input
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={6}
              minLength={6}
              onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              value={mfaCode}
            />
          </label>
          <button
            className="secondary-button"
            disabled={isVerifyingMfa || isOpening}
            onClick={() => void verifyMfaAndRetry()}
            type="button"
          >
            <ShieldCheck size={16} />
            {isVerifyingMfa ? "Verifying..." : "Verify and continue"}
          </button>
        </div>
      ) : null}
      {error ? <p className="form-help">{error}</p> : null}
    </div>
  );
}
