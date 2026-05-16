"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type TurnstileAction = "login" | "register";

type TurnstileWidgetId = string;

type TurnstileApi = {
  render: (
    element: HTMLElement,
    options: {
      action: TurnstileAction;
      callback: (token: string) => void;
      "error-callback": () => void;
      "expired-callback": () => void;
      sitekey: string;
      theme: "auto";
    },
  ) => TurnstileWidgetId;
  reset: (widgetId: TurnstileWidgetId) => void;
  remove: (widgetId: TurnstileWidgetId) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export function TurnstileChallenge({
  action,
  resetKey,
  siteKey,
  onError,
  onTokenChange,
}: {
  action: TurnstileAction;
  resetKey: number;
  siteKey?: string;
  onError: (message: string | null) => void;
  onTokenChange: (token: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onErrorRef = useRef(onError);
  const onTokenChangeRef = useRef(onTokenChange);
  const widgetIdRef = useRef<TurnstileWidgetId | null>(null);
  const [scriptReady, setScriptReady] = useState(
    () => typeof window !== "undefined" && Boolean(window.turnstile),
  );

  useEffect(() => {
    onErrorRef.current = onError;
    onTokenChangeRef.current = onTokenChange;
  }, [onError, onTokenChange]);

  useEffect(() => {
    if (!siteKey || !scriptReady || !containerRef.current || widgetIdRef.current) {
      return;
    }

    widgetIdRef.current = window.turnstile!.render(containerRef.current, {
      action,
      callback: (token) => {
        onErrorRef.current(null);
        onTokenChangeRef.current(token);
      },
      "error-callback": () => {
        onTokenChangeRef.current("");
        onErrorRef.current("Bot protection could not be verified. Try the challenge again.");
      },
      "expired-callback": () => {
        onTokenChangeRef.current("");
        onErrorRef.current("Bot protection expired. Complete the challenge again.");
      },
      sitekey: siteKey,
      theme: "auto",
    });

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
      widgetIdRef.current = null;
    };
  }, [action, scriptReady, siteKey]);

  useEffect(() => {
    if (!resetKey || !widgetIdRef.current || !window.turnstile) {
      return;
    }

    window.turnstile.reset(widgetIdRef.current);
    onTokenChangeRef.current("");
  }, [resetKey]);

  if (!siteKey) {
    return null;
  }

  return (
    <div className="bot-challenge" aria-live="polite">
      <Script
        id="cloudflare-turnstile"
        onLoad={() => setScriptReady(true)}
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
      />
      <div ref={containerRef} />
      {!scriptReady ? <span>Loading bot protection...</span> : null}
    </div>
  );
}
