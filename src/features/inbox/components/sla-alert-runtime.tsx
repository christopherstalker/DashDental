"use client";

import { useEffect, useMemo, useState } from "react";
import type { FeatureFlag } from "@/domain/types";

function playSlaTone() {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) {
    return;
  }

  const context = new AudioContextCtor();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = 880;
  gain.gain.value = 0.04;
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.18);
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

export function SlaAlertRuntime({
  atRiskCount,
  featureFlags,
}: {
  atRiskCount: number;
  featureFlags: FeatureFlag[];
}) {
  const [armed, setArmed] = useState(false);
  const enabledFlags = useMemo(
    () => new Set(featureFlags.filter((flag) => flag.enabled).map((flag) => flag.key)),
    [featureFlags],
  );
  const pushEnabled = enabledFlags.has("sla_push_alerts");
  const soundEnabled = enabledFlags.has("sound_alerts");

  useEffect(() => {
    function armAlerts() {
      setArmed(true);
      if (pushEnabled && "Notification" in window && Notification.permission === "default") {
        void Notification.requestPermission();
      }
    }

    window.addEventListener("pointerdown", armAlerts, { once: true });
    window.addEventListener("keydown", armAlerts, { once: true });

    return () => {
      window.removeEventListener("pointerdown", armAlerts);
      window.removeEventListener("keydown", armAlerts);
    };
  }, [pushEnabled]);

  useEffect(() => {
    if (!armed || atRiskCount <= 0) {
      return;
    }

    if (soundEnabled) {
      playSlaTone();
    }

    if (pushEnabled && "Notification" in window && Notification.permission === "granted") {
      new Notification("Dash Dental SLA alert", {
        body: `${atRiskCount} patient thread${atRiskCount === 1 ? "" : "s"} need attention.`,
        icon: "/icon-192.png",
        tag: "dash-dental-sla",
      });
    }
  }, [armed, atRiskCount, pushEnabled, soundEnabled]);

  return null;
}
