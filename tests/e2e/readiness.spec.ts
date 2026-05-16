import { expect, test } from "@playwright/test";
import {
  adminUserId,
  demoOrganizationId,
  expectNoConsoleErrors,
  expectSetupWorkspace,
  expireSubscription,
  loginAs,
  ownerUserId,
  readBrowserSession,
  resetDemoState,
  superAdminUserId,
  trialLengthDays,
} from "./helpers";

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ context }) => {
  await resetDemoState(context);
});

const publicBuyerRoutes = [
  "/",
  "/login",
  "/register",
  "/pricing",
  "/qa",
  "/faq",
  "/demo",
  "/trial",
  "/security",
  "/privacy",
  "/terms",
];

for (const path of publicBuyerRoutes) {
  test(`public route ${path} renders without browser errors on desktop and mobile`, async ({
    page,
  }) => {
    await page.context().clearCookies();

    await expectNoConsoleErrors(page, async () => {
      await page.setViewportSize({ width: 1440, height: 980 });
      const response = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(response?.status(), `${path} should not be forbidden`).not.toBe(403);
      expect(response?.status(), `${path} should be publicly reachable`).toBeLessThan(400);
      await expect(page.locator("body")).toContainText(/Dental Recovery/i);
      await expect(page.locator("body")).not.toHaveText("");

      await page.setViewportSize({ width: 390, height: 844 });
      const mobileResponse = await page.reload();
      expect(mobileResponse?.status(), `${path} mobile should not be forbidden`).not.toBe(403);
      expect(mobileResponse?.status(), `${path} mobile should be reachable`).toBeLessThan(400);
      await expect(page.locator("body")).toContainText(/Dental Recovery/i);
    });
  });
}

test("homepage start trial CTA opens a valid trial route", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/");

  const startTrial = page.getByRole("link", { name: /start 14-day guided trial/i }).first();
  await expect(startTrial).toBeVisible();
  await expect(startTrial).toHaveAttribute("href", /\/(register|trial)/);

  await startTrial.click();
  await expect(page).toHaveURL(/\/(register|trial)/);
  await expect(page.locator("body")).toContainText(/14-day guided trial/i);
});

test("public CTA instrumentation sends a safe launch event", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/");

  const startTrial = page.getByRole("link", { name: /start 14-day guided trial/i }).first();
  const launchEventRequest = page.waitForRequest((request) => {
    return (
      request.url().includes("/api/v1/launch/events") &&
      (request.postData() ?? "").includes("public.home.start_trial_clicked")
    );
  });

  await startTrial.click();

  const request = await launchEventRequest;
  const response = await request.response();
  const postData = request.postData() ?? "";
  const payload = postData.startsWith("{")
    ? (JSON.parse(postData) as {
        event?: string;
        page?: string;
        section?: string;
        target?: string;
      })
    : Object.fromEntries(new URLSearchParams(postData).entries());

  expect(payload).toMatchObject({
    event: "public.home.start_trial_clicked",
    page: "/",
    section: "hero",
    target: "/register",
  });
  expect(JSON.stringify(payload)).not.toMatch(/patient|phone|message|owner@/i);
  expect(response?.status()).toBe(202);
});

test("landing logo stays compact and light theme keeps dental backdrop balanced", async ({
  page,
}) => {
  await page.context().clearCookies();
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const compactMark = page.locator(".recovery-brand-mark-compact").first();
  await expect(compactMark).toBeVisible();
  const desktopBox = await compactMark.boundingBox();
  expect(desktopBox?.width ?? 0).toBeLessThanOrEqual(52);
  await expect(page.locator(".recovery-brand-wordmark").first()).toBeVisible();

  await page.evaluate(() => {
    document.documentElement.dataset.theme = "light";
  });
  const toothOpacity = await page
    .locator(".recovery-dental-backdrop img")
    .first()
    .evaluate((element) => Number(window.getComputedStyle(element).opacity));
  expect(toothOpacity).toBeLessThanOrEqual(0.06);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileBox = await compactMark.boundingBox();
  expect(mobileBox?.width ?? 0).toBeLessThanOrEqual(48);
});

test("staff can open a patient thread and queue a recovery reply", async ({
  context,
  page,
}) => {
  test.setTimeout(120_000);

  await loginAs(context, {
    organizationId: demoOrganizationId,
    userId: adminUserId,
  });

  const secret = `pw-reply-secret-${Date.now()}`;
  const configResponse = await context.request.post("/api/v1/integrations/web-form/config", {
    data: {
      organizationId: demoOrganizationId,
      webhookSecret: secret,
    },
  });
  expect(configResponse.ok()).toBeTruthy();

  const eventId = `pw-reply-${Date.now()}`;
  const webhookResponse = await context.request.post("/api/v1/webhooks/web-form", {
    data: {
      email: "reply-patient@example.com",
      eventId,
      message: "Can I still book an implant consultation today?",
      name: "Playwright Reply Patient",
      organizationId: demoOrganizationId,
      phone: "+15555550991",
    },
    headers: {
      "idempotency-key": eventId,
      "x-webhook-secret": secret,
    },
  });

  expect(webhookResponse.status()).toBe(202);

  await page.goto("/inbox", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: /Playwright Reply Patient/i })).toBeVisible();
  const detailHref = await page.getByRole("link", { name: /Open detail/i }).getAttribute("href");
  expect(detailHref).toMatch(/\/inbox\/.+/);
  await page.goto(detailHref!, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/inbox\/.+/);
  await expect(
    page.getByRole("heading", { level: 1, name: /Playwright Reply Patient/i }),
  ).toBeVisible();

  const replyText = "Yes, we can help today. What time works best for a quick call?";
  await page.getByLabel(/reply to patient/i).fill(replyText);

  const replyResponse = page.waitForResponse((response) => {
    const request = response.request();

    return (
      response.url().includes("/api/v1/conversations/") &&
      response.url().includes("/messages") &&
      request.method() === "POST"
    );
  });

  await page.getByRole("button", { name: /queue recovery reply/i }).click();
  expect((await replyResponse).status()).toBe(202);

  await expect(page.locator("body")).toContainText(replyText);
  await expect(page.locator("body")).toContainText(/queued for delivery|pending outbox/i);

  const session = await readBrowserSession(page);
  expect(session.state.messages.some((message) => message.text === replyText)).toBe(true);
});

test("pricing cards explain plans and limits without confusion", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/pricing");

  await expect(page.getByRole("heading", { exact: true, name: "Starter" })).toBeVisible();
  await expect(page.getByRole("heading", { exact: true, name: "Growth" })).toBeVisible();
  await expect(page.getByRole("heading", { exact: true, name: "Scale" })).toBeVisible();
  await expect(page.locator("body")).toContainText(/recommended/i);
  await expect(page.locator("body")).toContainText(/messages\/mo/i);
  await expect(page.locator("body")).toContainText(/over-limit/i);
});

test("language selector exposes preview localization without breaking the page", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/");

  await expect(page.getByLabel(/choose interface language/i).first()).toBeVisible();
  const languageSelector = page.locator(".language-switcher select").first();
  const optionCount = await languageSelector.locator("option").count();
  expect(optionCount).toBeGreaterThan(30);
  await expect(languageSelector).toContainText("English");
  await expect(languageSelector).toContainText("Deutsch");
  await expect(languageSelector).not.toContainText("Russian");
  await expect(languageSelector).not.toContainText("Русский");

  await languageSelector.selectOption("de");
  await expect(languageSelector).toHaveValue("de");
});

test("public trust, health, and fallback pages render safely", async ({ page }) => {
  test.setTimeout(120_000);
  await page.context().clearCookies();

  for (const path of ["/security", "/privacy", "/terms", "/qa"]) {
    const response = await page.goto(path);
    expect(response?.status(), `${path} should render`).toBeLessThan(400);
    await expect(page.locator("body")).toContainText(/trial|security|privacy|terms|Q&A/i);
  }

  const healthResponse = await page.request.get("/api/v1/health/storage");
  expect([200, 503]).toContain(healthResponse.status());
  const healthBody = await healthResponse.text();
  expect(healthBody).not.toMatch(/postgres:\/\/|password|secret|token|credential/i);

  const missingResponse = await page.goto("/not-a-real-launch-page");
  expect(missingResponse?.status()).toBe(404);
  await expect(page.locator("body")).toContainText(/Dental Recovery/i);
  await expect(page.locator("body")).toContainText(/page could not be found/i);
});

test("new clinic registration creates exactly a 14-day trial and unlocks dashboard", async ({
  page,
}) => {
  const unique = Date.now();
  const email = `owner-${unique}@clinic.example`;

  await page.goto("/register");
  await page.getByLabel("Clinic name").fill(`Playwright Smile ${unique}`);
  await page.getByLabel("Owner name").fill("Playwright Owner");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password").fill("StrongPass123!");
  await page.getByRole("button", { name: /start 14-day guided trial/i }).click();

  await expectSetupWorkspace(page);

  const session = await readBrowserSession(page);
  const subscription = session.state.subscriptions.find(
    (item) => item.organizationId === session.session.organizationId,
  );

  expect(subscription?.status).toBe("trialing");
  expect(subscription?.plan).toBe("starter");
  expect(
    trialLengthDays(subscription!.currentPeriodStart, subscription!.currentPeriodEnd),
  ).toBe(14);

  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /^Dashboard$/i })).toBeVisible();
  await expect(page.locator(".clinic-console-summary")).toContainText(/Good morning/i);
  await expect(page.locator("body")).not.toContainText(/Activate Dental Recovery/i);
});

test("setup shows an owner-facing launch drop-off review", async ({ context, page }) => {
  await loginAs(context, {
    organizationId: demoOrganizationId,
    userId: adminUserId,
  });

  const setupViewedResponse = page.waitForResponse((response) => {
    const request = response.request();

    return (
      response.url().includes("/api/v1/launch/events") &&
      (request.postData() ?? "").includes("workspace.setup.viewed")
    );
  });

  await page.goto("/setup");

  await expect(page.getByRole("heading", { name: /Launch drop-off review/i })).toBeVisible();
  await expect(page.locator("body")).toContainText(/Next measurable action/i);
  await expect(page.locator("body")).toContainText(/trial|billing|channel|lead/i);
  await expect((await setupViewedResponse).status()).toBe(202);
});

test("expired trial locks paid workspace routes but keeps billing and setup reachable", async ({
  page,
}) => {
  const unique = Date.now();

  await page.goto("/register");
  await page.getByLabel("Clinic name").fill(`Expired Trial ${unique}`);
  await page.getByLabel("Owner name").fill("Expired Owner");
  await page.getByLabel("Work email").fill(`expired-${unique}@clinic.example`);
  await page.getByLabel("Password").fill("StrongPass123!");
  await page.getByRole("button", { name: /start 14-day guided trial/i }).click();
  await expectSetupWorkspace(page);

  const session = await readBrowserSession(page);
  await expireSubscription(session.session.organizationId);

  await page.goto("/dashboard");
  await expect(page.locator("body")).toContainText(/Open billing/i);
  await expect(page.locator("body")).toContainText(/Prepare integrations/i);

  await page.goto("/billing");
  await expect(page.locator("body")).toContainText(/Billing/i);
});

test("web form integration can be activated and produces a visible test lead", async ({
  context,
  page,
}) => {
  await loginAs(context, {
    organizationId: demoOrganizationId,
    userId: adminUserId,
  });

  const secret = `pw-secret-${Date.now()}`;
  const configResponse = await context.request.post("/api/v1/integrations/web-form/config", {
    data: {
      organizationId: demoOrganizationId,
      webhookSecret: secret,
    },
  });
  expect(configResponse.ok()).toBeTruthy();

  const eventId = `pw-web-${Date.now()}`;
  const webhookResponse = await context.request.post("/api/v1/webhooks/web-form", {
    data: {
      email: "patient@example.com",
      eventId,
      message: "I need an implant consultation this week.",
      name: "Playwright Patient",
      organizationId: demoOrganizationId,
      phone: "+15555550123",
    },
    headers: {
      "idempotency-key": eventId,
      "x-webhook-secret": secret,
    },
  });

  expect(webhookResponse.status()).toBe(202);

  await page.goto("/inbox");
  await expect(page.locator("body")).toContainText("Playwright Patient");

  await page.goto("/dashboard");
  await expect(page.locator("body")).toContainText(/Playwright Patient|patients/i);
});

test("platform admin stays hidden from clinic owners and grants plans as super admin", async ({
  context,
  page,
}) => {
  test.setTimeout(120_000);

  await loginAs(context, {
    organizationId: demoOrganizationId,
    userId: ownerUserId,
  });

  await page.goto("/platform");
  await expect(page.locator("body")).toContainText(/required role|super-admin/i);

  await loginAs(context, {
    organizationId: demoOrganizationId,
    userId: superAdminUserId,
  });

  const response = await context.request.post("/api/v1/admin/billing/manual-activation", {
    data: {
      organizationId: demoOrganizationId,
      plan: "growth",
    },
  });
  expect(response.ok()).toBeTruthy();

  const payload = (await response.json()) as {
    subscriptions: Array<{
      organizationId: string;
      plan: string;
      status: string;
    }>;
  };
  const subscription = payload.subscriptions.find(
    (item) => item.organizationId === demoOrganizationId,
  );

  expect(subscription).toMatchObject({
    plan: "growth",
    status: "active",
  });

  const holdResponse = await context.request.post("/api/v1/admin/billing/manual-activation", {
    data: {
      externalReference: "PW-HOLD-001",
      organizationId: demoOrganizationId,
      plan: "growth",
      status: "read_only",
    },
  });
  expect(holdResponse.ok()).toBeTruthy();
  const holdPayload = (await holdResponse.json()) as {
    subscriptions: Array<{
      organizationId: string;
      plan: string;
      status: string;
    }>;
  };
  expect(
    holdPayload.subscriptions.find((item) => item.organizationId === demoOrganizationId),
  ).toMatchObject({
    plan: "growth",
    status: "read_only",
  });

  const unlockResponse = await context.request.post("/api/v1/admin/billing/manual-activation", {
    data: {
      externalReference: "PW-UNLOCK-001",
      organizationId: demoOrganizationId,
      plan: "growth",
      status: "active",
    },
  });
  expect(unlockResponse.ok()).toBeTruthy();

  await page.goto("/platform");
  await expect(page.getByRole("heading", { name: /Support console/i })).toBeVisible();
  await expect(page.locator("body")).toContainText(/Clinics, activity, and subscriptions/i);

  await page.goto("/platform/subscriptions", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /^Subscriptions$/i })).toBeVisible();
  await expect(page.locator("body")).toContainText(/Clinic subscriptions/i);
  await expect(page.getByRole("button", { name: /Grant access/i }).first()).toBeVisible();
  await expect(page.locator("body")).toContainText(/Read-only hold/i);
  await expect(page.locator("body")).toContainText(/Canceled access/i);
  await expect(page.locator(".subscription-admin-search")).toBeVisible();

  await page
    .locator(".subscription-admin-search input")
    .fill(demoOrganizationId);
  await expect(page.locator(".subscription-admin-table")).toContainText(demoOrganizationId);
});

test("workspace shell uses compact AI Studio layout and Ask AI opens cleanly", async ({
  context,
  page,
}) => {
  await loginAs(context, {
    organizationId: demoOrganizationId,
    userId: adminUserId,
  });

  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

  const sidebarBox = await page.locator(".sidebar").boundingBox();
  expect(sidebarBox?.width ?? 0).toBeLessThanOrEqual(240);
  await expect(page.locator(".workspace-command-bar")).toBeVisible();

  const mainColumn = await page.locator(".clinic-main-column").boundingBox();
  const sideColumn = await page.locator(".clinic-side-column").boundingBox();
  if (mainColumn && sideColumn) {
    expect(mainColumn.x + mainColumn.width).toBeLessThanOrEqual(sideColumn.x + 2);
  }

  const askAi = page.getByRole("button", { name: /Ask AI/i });
  await expect(askAi).toBeVisible();
  await askAi.click();
  await expect(page.getByRole("region", { name: /Ask AI assistant/i })).toBeVisible();
  const popover = await page.locator(".ask-ai-popover").boundingBox();
  expect(popover?.width ?? 0).toBeLessThanOrEqual(540);
  await page.getByPlaceholder(/Ask what to do first/i).fill("What is at risk today?");
  await page.getByRole("button", { name: /Generate guidance/i }).click();
  await expect(page.locator(".ask-ai-answer")).toContainText(/at-risk conversation/i);

  const themeToggle = page.getByRole("button", { name: /Switch to (light|dark) theme/i }).first();
  await themeToggle.click();
  const theme = await page.evaluate(() => document.documentElement.dataset.theme);
  expect(["light", "dark"]).toContain(theme);
});

test("major workspace navigation links click through to reachable screens", async ({
  context,
  page,
}) => {
  test.setTimeout(300_000);

  await loginAs(context, {
    organizationId: demoOrganizationId,
    userId: adminUserId,
  });

  for (const item of [
    { label: "Dashboard", path: "/dashboard", heading: /^Dashboard$/i },
    { label: "Setup", path: "/setup", heading: /Onboarding command center/i },
    { label: "Work queue", path: "/queue", heading: /Recovery work queue/i },
    { label: "Alerts", path: "/alerts", heading: /Risk and SLA alerts/i },
    { label: "Leads", path: "/leads", heading: /Patient requests/i },
    { label: "Inbox", path: "/inbox", heading: /Unified patient inbox/i },
    { label: "Notes", path: "/notes", heading: /Team notes/i },
    { label: "Automations", path: "/automations", heading: /Automation studio/i },
    { label: "Integrations", path: "/integrations", heading: /Channel health center/i },
    { label: "AI insights", path: "/ai", heading: /AI insight room/i },
    { label: "Team", path: "/team", heading: /Team and seats/i },
    { label: "Compliance", path: "/compliance", heading: /Compliance vault/i },
  ]) {
    const sourcePath = item.path === "/dashboard" ? "/setup" : "/dashboard";
    const sourceHeading =
      item.path === "/dashboard" ? /Onboarding command center/i : /^Dashboard$/i;

    await page.goto(sourcePath, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1, name: sourceHeading })).toBeVisible({
      timeout: 30_000,
    });

    const link = page.getByRole("link", { exact: true, name: item.label });
    await expect(link).toHaveAttribute("href", item.path);
    await link.click();
    await expect(page, item.label).toHaveURL(new RegExp(`${item.path}$`), {
      timeout: 30_000,
    });
    await expect(page.getByRole("heading", { level: 1, name: item.heading })).toBeVisible({
      timeout: 30_000,
    });
  }
});
