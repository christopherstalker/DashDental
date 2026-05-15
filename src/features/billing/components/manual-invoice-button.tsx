"use client";

import { useState, useTransition } from "react";
import type { ReactNode } from "react";
import { ReceiptText } from "lucide-react";
import type { Subscription } from "@/domain/types";
import { useCurrentLanguageCode } from "@/features/i18n/translation-store";
import { translate } from "@/features/i18n/translations";
import { sendLaunchEvent } from "@/features/launch-analytics/components/launch-event-tracker";

interface ManualInvoiceResponse {
  error?: string;
  amount?: number;
  currency?: string;
  paymentReference?: string;
}

export function ManualInvoiceButton({
  className = "secondary-button",
  disabled = false,
  label = "Request invoice",
  organizationId,
  plan,
}: {
  className?: string;
  disabled?: boolean;
  label?: ReactNode;
  organizationId: string;
  plan: Subscription["plan"];
}) {
  const languageCode = useCurrentLanguageCode();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  function requestInvoice() {
    setFeedback(null);
    sendLaunchEvent({
      event: "workspace.billing.invoice_requested",
      page: "/billing",
      plan,
      section: "manual-invoice",
      target: "/api/v1/billing/manual-invoice",
    });
    startTransition(async () => {
      try {
        const response = await fetch("/api/v1/billing/manual-invoice", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ organizationId, plan }),
        });
        const payload = (await response.json().catch(() => ({}))) as ManualInvoiceResponse;

        if (!response.ok) {
          setFeedback(payload.error ?? translate("billing.action.invoiceUnavailable", languageCode));
          return;
        }

        setFeedback(
          `${translate("billing.action.invoiceRequested", languageCode)}: ${payload.amount} ${payload.currency}. ${translate("billing.action.reference", languageCode)}: ${payload.paymentReference}.`,
        );
      } catch {
        setFeedback(translate("billing.action.invoiceError", languageCode));
      }
    });
  }

  return (
    <div className="billing-action-stack">
      <button
        className={className}
        disabled={disabled || isPending}
        onClick={requestInvoice}
        type="button"
      >
        <ReceiptText size={16} />
        {isPending ? translate("billing.action.requesting", languageCode) : label}
      </button>
      {feedback ? <p className="form-help">{feedback}</p> : null}
    </div>
  );
}
