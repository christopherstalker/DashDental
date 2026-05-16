"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { CreditCard } from "lucide-react";
import type { Subscription } from "@/domain/types";
import { useCurrentLanguageCode } from "@/features/i18n/translation-store";
import { translate } from "@/features/i18n/translations";

type BillingActionMode = "checkout" | "portal";

export function BillingActionButton({
  className = "secondary-button",
  disabled = false,
  label,
  mode,
  organizationId,
  plan,
}: {
  className?: string;
  disabled?: boolean;
  label: ReactNode;
  mode: BillingActionMode;
  organizationId: string;
  plan?: Subscription["plan"];
}) {
  const languageCode = useCurrentLanguageCode();
  const [isOpening, setIsOpening] = useState(false);
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
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };

      if (!response.ok || !payload.url) {
        setError(payload.error ?? translate("billing.action.unavailable", languageCode));
        return;
      }

      window.location.assign(payload.url);
    } catch {
      setError(translate("billing.action.openError", languageCode));
    } finally {
      setIsOpening(false);
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
      {error ? <p className="form-help">{error}</p> : null}
    </div>
  );
}
