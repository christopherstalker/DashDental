"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, RefreshCw } from "lucide-react";

declare global {
  interface Window {
    Paddle?: {
      Environment?: {
        set(environment: "sandbox"): void;
      };
      Initialize(input: {
        token: string;
        checkout?: {
          settings?: Record<string, unknown>;
        };
        eventCallback?: (event: { name?: string; data?: unknown }) => void;
      }): void;
      Checkout: {
        open(input: {
          transactionId: string;
          settings?: Record<string, unknown>;
        }): void;
      };
    };
  }
}

const paddleScriptUrl = "https://cdn.paddle.com/paddle/v2/paddle.js";

export function PaddleCheckoutLauncher({
  environment,
  returnUrl,
  token,
  transactionId,
}: {
  environment: "sandbox" | "live";
  returnUrl: string;
  token: string;
  transactionId: string;
}) {
  const [status, setStatus] = useState<"loading" | "open" | "complete" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const openedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function openCheckout() {
      try {
        await loadPaddleScript();
        if (cancelled || openedRef.current) {
          return;
        }

        const paddle = window.Paddle;
        if (!paddle) {
          throw new Error("Paddle.js failed to load.");
        }

        if (environment === "sandbox") {
          paddle.Environment?.set("sandbox");
        }

        paddle.Initialize({
          token,
          checkout: {
            settings: {
              displayMode: "overlay",
              theme: "dark",
              variant: "one-page",
              locale: "en",
            },
          },
          eventCallback: (event) => {
            if (event.name === "checkout.completed") {
              setStatus("complete");
              window.setTimeout(() => {
                window.location.assign(returnUrl);
              }, 1000);
            }
            if (event.name === "checkout.error" || event.name === "checkout.payment.error") {
              setStatus("error");
              setError("Paddle could not open checkout. Retry or use the invoice fallback.");
            }
          },
        });
        paddle.Checkout.open({
          transactionId,
          settings: {
            displayMode: "overlay",
            theme: "dark",
            variant: "one-page",
          },
        });
        openedRef.current = true;
        setStatus("open");
      } catch (checkoutError) {
        setStatus("error");
        setError(
          checkoutError instanceof Error
            ? checkoutError.message
            : "Paddle checkout failed to start.",
        );
      }
    }

    void openCheckout();

    return () => {
      cancelled = true;
    };
  }, [environment, returnUrl, token, transactionId]);

  return (
    <div className="billing-value-note">
      {status === "complete" ? (
        <>
          <CheckCircle2 size={18} />
          <strong>Payment completed. Returning to billing...</strong>
        </>
      ) : status === "error" ? (
        <>
          <RefreshCw size={18} />
          <strong>{error ?? "Checkout failed."}</strong>
          <button
            className="secondary-button"
            onClick={() => {
              openedRef.current = false;
              setError(null);
              setStatus("loading");
              window.location.reload();
            }}
            type="button"
          >
            Retry checkout
          </button>
        </>
      ) : (
        <>
          <Loader2 className="spin-icon" size={18} />
          <strong>{status === "open" ? "Checkout is open" : "Opening secure checkout..."}</strong>
          <p>Complete payment in the Paddle overlay. You can return to billing if you close it.</p>
        </>
      )}
    </div>
  );
}

function loadPaddleScript(): Promise<void> {
  if (window.Paddle) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${paddleScriptUrl}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Paddle.js failed to load.")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = paddleScriptUrl;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Paddle.js failed to load."));
    document.head.appendChild(script);
  });
}
