"use client";

import { useEffect } from "react";
import type { LaunchEventName } from "@/server/launch-analytics";
import { serializeLaunchEventPayload } from "@/features/launch-analytics/launch-event-serialization";

export type LaunchEventPayload = {
  billingStatus?: string;
  completedGates?: number;
  event: LaunchEventName;
  locale?: string;
  onboardingStep?: string;
  page?: string;
  plan?: string;
  role?: string;
  section?: string;
  setupProgress?: number;
  source?: string;
  target?: string;
  totalGates?: number;
};

function readNumber(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildPayload(element: HTMLElement): LaunchEventPayload | null {
  const event = element.dataset.launchEvent as LaunchEventName | undefined;

  if (!event) {
    return null;
  }

  const anchor = element instanceof HTMLAnchorElement ? element : element.closest("a");

  return {
    billingStatus: element.dataset.launchBillingStatus,
    completedGates: readNumber(element.dataset.launchCompletedGates),
    event,
    locale: document.documentElement.lang || "en",
    onboardingStep: element.dataset.launchOnboardingStep,
    page: element.dataset.launchPage || window.location.pathname,
    plan: element.dataset.launchPlan,
    role: element.dataset.launchRole,
    section: element.dataset.launchSection,
    setupProgress: readNumber(element.dataset.launchSetupProgress),
    source: element.dataset.launchSource,
    target: element.dataset.launchTarget || anchor?.getAttribute("href") || undefined,
    totalGates: readNumber(element.dataset.launchTotalGates),
  };
}

export function sendLaunchEvent(payload: LaunchEventPayload) {
  const body = serializeLaunchEventPayload(payload).toString();

  if (!body) {
    return;
  }

  void fetch("/api/v1/launch/events", {
    body,
    credentials: "same-origin",
    headers: { "content-type": "application/x-www-form-urlencoded;charset=UTF-8" },
    keepalive: true,
    method: "POST",
  }).catch(() => {
    // Launch analytics must never block navigation or workspace actions.
  });
}

export function LaunchEventTracker() {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const element = (event.target as HTMLElement | null)?.closest<HTMLElement>(
        "[data-launch-event]",
      );
      const payload = element ? buildPayload(element) : null;

      if (payload) {
        sendLaunchEvent(payload);
      }
    }

    function handleSubmit(event: SubmitEvent) {
      const element = (event.target as HTMLElement | null)?.closest<HTMLElement>(
        "[data-launch-event]",
      );
      const payload = element ? buildPayload(element) : null;

      if (payload) {
        sendLaunchEvent(payload);
      }
    }

    document.addEventListener("click", handleClick, true);
    document.addEventListener("submit", handleSubmit, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("submit", handleSubmit, true);
    };
  }, []);

  return null;
}

export function LaunchPageEvent({
  billingStatus,
  completedGates,
  event,
  locale,
  onboardingStep,
  page,
  plan,
  role,
  section,
  setupProgress,
  source,
  target,
  totalGates,
}: LaunchEventPayload) {
  useEffect(() => {
    sendLaunchEvent({
      billingStatus,
      completedGates,
      event,
      locale,
      onboardingStep,
      page,
      plan,
      role,
      section,
      setupProgress,
      source,
      target,
      totalGates,
    });
  }, [
    billingStatus,
    completedGates,
    event,
    locale,
    onboardingStep,
    page,
    plan,
    role,
    section,
    setupProgress,
    source,
    target,
    totalGates,
  ]);

  return null;
}
