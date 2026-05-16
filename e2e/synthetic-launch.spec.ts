import { expect, test } from "@playwright/test";
import {
  adminUserId,
  demoOrganizationId,
  expectSetupWorkspace,
  expireSubscription,
  loginAs,
  readBrowserSession,
  resetDemoState,
  trialLengthDays,
} from "./helpers";

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ context }) => {
  await resetDemoState(context);
});

test.describe("synthetic launch monitor: public routes, registration, inbox reply, billing lock, and health secrecy", () => {
  test("public routes and health endpoint stay reachable without leaking secrets", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await page.context().clearCookies();

    for (const path of [
      "/",
      "/pricing",
      "/demo",
      "/trial",
      "/qa",
      "/security",
      "/privacy",
      "/terms",
    ]) {
      const response = await page.goto(path, { waitUntil: "domcontentloaded" });

      expect(response?.status(), `${path} should stay public`).toBeLessThan(400);
      expect(response?.status(), `${path} should not be forbidden`).not.toBe(403);
      await expect(page.locator("body")).toContainText(/Dash Dental|Dental Recovery/i);
    }

    const health = await page.request.get("/api/v1/health/storage");
    expect([200, 503]).toContain(health.status());
    await expect(await health.text()).not.toMatch(
      /postgres:\/\/|password|secret|token|credential/i,
    );
  });

  test("registration creates a 14-day trial workspace", async ({ page }) => {
    test.setTimeout(120_000);

    const unique = Date.now();

    await page.goto("/register");
    await page.getByLabel("Clinic name").fill(`Synthetic Monitor ${unique}`);
    await page.getByLabel("Owner name").fill("Synthetic Owner");
    await page.getByLabel("Work email").fill(`synthetic-${unique}@clinic.example`);
    await page.getByLabel("Password").fill("StrongPass123!");
    await page.getByRole("button", { name: /start 14-day guided trial/i }).click();

    await expectSetupWorkspace(page);

    const session = await readBrowserSession(page);
    const subscription = session.state.subscriptions.find(
      (item) => item.organizationId === session.session.organizationId,
    );

    expect(subscription?.status).toBe("trialing");
    expect(
      trialLengthDays(subscription!.currentPeriodStart, subscription!.currentPeriodEnd),
    ).toBe(14);
  });

  test("staff can recover a synthetic inbox lead", async ({ context, page }) => {
    await loginAs(context, {
      organizationId: demoOrganizationId,
      userId: adminUserId,
    });

    const secret = `synthetic-secret-${Date.now()}`;
    const configResponse = await context.request.post("/api/v1/integrations/web-form/config", {
      data: {
        organizationId: demoOrganizationId,
        webhookSecret: secret,
      },
    });
    expect(configResponse.ok()).toBeTruthy();

    const eventId = `synthetic-web-${Date.now()}`;
    const webhookResponse = await context.request.post("/api/v1/webhooks/web-form", {
      data: {
        email: "synthetic-patient@example.com",
        eventId,
        message: "Can I book a consultation today?",
        name: "Synthetic Monitor Patient",
        organizationId: demoOrganizationId,
        phone: "+15555550111",
      },
      headers: {
        "idempotency-key": eventId,
        "x-webhook-secret": secret,
      },
    });
    expect(webhookResponse.status()).toBe(202);

    await page.goto("/inbox");
    await expect(page.getByRole("link", { name: /Synthetic Monitor Patient/i })).toBeVisible();

    const detailHref = await page.getByRole("link", { name: /Open detail/i }).getAttribute("href");
    await page.goto(detailHref!);

    const replyText = "Yes, we can help today. What time works best?";
    await page.getByLabel(/reply to patient/i).fill(replyText);
    await page.getByRole("button", { name: /queue recovery reply/i }).click();

    await expect(page.locator("body")).toContainText(replyText);
    await expect(page.locator("body")).toContainText(/queued for delivery|pending outbox/i);
  });

  test("expired trial locks paid workspace but leaves billing readable", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const unique = Date.now();

    await page.goto("/register");
    await page.getByLabel("Clinic name").fill(`Synthetic Billing ${unique}`);
    await page.getByLabel("Owner name").fill("Synthetic Billing Owner");
    await page.getByLabel("Work email").fill(`synthetic-billing-${unique}@clinic.example`);
    await page.getByLabel("Password").fill("StrongPass123!");
    await page.getByRole("button", { name: /start 14-day guided trial/i }).click();
    await expectSetupWorkspace(page);

    const session = await readBrowserSession(page);
    await expireSubscription(session.session.organizationId);

    await page.goto("/dashboard");
    await expect(page.locator("body")).toContainText(/Open billing/i);

    await page.goto("/billing");
    await expect(page.locator("body")).toContainText(/Billing/i);
    await expect(page.locator("body")).toContainText(/invoice|Stripe|manual/i);
  });
});
