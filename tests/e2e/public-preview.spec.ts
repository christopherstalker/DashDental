import { expect, test } from "@playwright/test";

const previewBaseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "";
const runsAgainstPublicPreview =
  previewBaseUrl.startsWith("https://") &&
  !/localhost|127\.0\.0\.1/i.test(previewBaseUrl);

test.skip(
  !runsAgainstPublicPreview,
  "Public preview monitor runs against a deployed HTTPS preview, not local e2e.",
);

test.describe("public preview monitor: routes, health secrecy, and trial signup", () => {
  test("public pages and storage health are reachable without auth", async ({ page }) => {
    test.setTimeout(120_000);
    await page.context().clearCookies();

    for (const path of [
      "/",
      "/login",
      "/register",
      "/pricing",
      "/qa",
      "/demo",
      "/trial",
      "/security",
      "/privacy",
      "/terms",
    ]) {
      const response = await page.goto(path, { waitUntil: "domcontentloaded" });

      expect(response?.status(), `${path} should stay public`).toBeLessThan(400);
      expect(response?.status(), `${path} should not be forbidden`).not.toBe(403);
      await expect(page.locator("body")).toContainText(/Dash Dental/i);
    }

    const health = await page.request.get("/api/v1/health/storage");
    expect([200, 503]).toContain(health.status());
    const healthText = await health.text();
    expect(healthText).not.toMatch(
      /postgres:\/\/|password|secret|token|credential|DATABASE_URL/i,
    );
    expect(healthText).toMatch(/storage|database/i);
  });

  test("real preview registration either creates trial or exposes Turnstile gate", async ({
    page,
  }) => {
    const unique = Date.now();

    await page.goto("/register");
    await page.getByLabel("Clinic name").fill(`Preview Monitor ${unique}`);
    await page.getByLabel("Owner name").fill("Preview Owner");
    await page.getByLabel("Work email").fill(`preview-monitor-${unique}@clinic.example`);
    await page.getByLabel("Password").fill("StrongPass123!");
    await page.getByRole("button", { name: /start 14-day guided trial/i }).click();

    const outcome = await expect
      .poll(async () => {
        const text = await page.locator("body").innerText();

        if (/Onboarding command center|Launch readiness/i.test(text)) {
          return "workspace";
        }

        if (/bot protection|challenge/i.test(text)) {
          return "bot_protection";
        }

        return "pending";
      }, { timeout: 20_000 })
      .not.toBe("pending");

    expect(outcome).toBeUndefined();

    const bodyText = await page.locator("body").innerText();
    expect(bodyText).toMatch(/Onboarding command center|Launch readiness|bot protection|challenge/i);

    if (/challenges.cloudflare.com/i.test(await page.content())) {
      const guardedResponse = await page.request.post("/api/v1/auth/register", {
        data: {
          clinicName: `Preview Guard ${unique}`,
          currency: "USD",
          email: `preview-guard-${unique}@clinic.example`,
          ownerName: "Preview Guard",
          password: "StrongPass123!",
          timezone: "Europe/Kiev",
        },
      });
      const guardedBody = (await guardedResponse.json()) as { code?: string };

      expect(guardedResponse.status()).toBe(403);
      expect(guardedBody.code).toBe("bot_protection_required");
    }
  });
});
