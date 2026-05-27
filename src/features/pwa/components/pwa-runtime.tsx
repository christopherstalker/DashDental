"use client";

import { useEffect } from "react";

export function PwaRuntime() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const isSecureContext =
      window.isSecureContext ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    if (!isSecureContext) {
      return;
    }

    void navigator.serviceWorker.register("/sw.js").catch(() => {
      // PWA registration must never block the inbox or account flows.
    });
  }, []);

  return null;
}
