import { expect, type BrowserContext, type Page } from "@playwright/test";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { AppState } from "../../src/domain/types";
import { getInitialAppState } from "../../src/domain/seed-data";

export const demoOrganizationId = "org-smile-studio";
export const superAdminUserId = "user-super";
export const ownerUserId = "user-owner";
export const adminUserId = "user-admin";

export async function expectNoConsoleErrors(
  page: Page,
  action: () => Promise<void>,
) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });

  await action();
  expect(errors).toEqual([]);
}

export async function loginAs(
  context: BrowserContext,
  input: {
    organizationId?: string;
    userId: string;
  },
) {
  const response = await context.request.post("/api/v1/auth/session", {
    data: {
      organizationId: input.organizationId ?? demoOrganizationId,
      userId: input.userId,
    },
  });

  expect(response.ok()).toBeTruthy();
}

export async function resetDemoState(context: BrowserContext) {
  await writeStateFile(getInitialAppState());
  await loginAs(context, {
    organizationId: demoOrganizationId,
    userId: superAdminUserId,
  });
}

export async function readBrowserSession(page: Page) {
  return page.evaluate(async () => {
    const response = await fetch("/api/v1/auth/session");
    if (!response.ok) {
      throw new Error(`Session request failed: ${response.status}`);
    }

    return response.json() as Promise<{
      session: {
        organizationId: string;
        role: string;
      };
      state: AppState;
    }>;
  });
}

export async function expectSetupWorkspace(page: Page) {
  await expect(page.locator("body")).toContainText(
    /Onboarding command center|Launch readiness/i,
    { timeout: 45_000 },
  );
}

export async function readStateFile(): Promise<AppState> {
  const filePath = path.join(process.cwd(), ".data", "dental-recovery-state.json");
  return JSON.parse(await fs.readFile(filePath, "utf8")) as AppState;
}

export async function writeStateFile(state: AppState) {
  const filePath = path.join(process.cwd(), ".data", "dental-recovery-state.json");
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(state, null, 2), "utf8");
}

export async function expireSubscription(organizationId: string) {
  const state = await readStateFile();
  const now = Date.now();
  const expiredStart = new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString();
  const expiredEnd = new Date(now - 24 * 60 * 60 * 1000).toISOString();

  await writeStateFile({
    ...state,
    subscriptions: state.subscriptions.map((subscription) =>
      subscription.organizationId === organizationId
        ? {
            ...subscription,
            currentPeriodEnd: expiredEnd,
            currentPeriodStart: expiredStart,
            status: "trialing",
          }
        : subscription,
    ),
  });
}

export function trialLengthDays(startIso: string, endIso: string) {
  return Math.round(
    (Date.parse(endIso) - Date.parse(startIso)) / (24 * 60 * 60 * 1000),
  );
}
