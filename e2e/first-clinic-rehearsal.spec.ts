import { expect, test, type BrowserContext } from "@playwright/test";
import { trialLengthDays } from "./helpers";

const enabled = process.env.FIRST_CLINIC_REHEARSAL_PRODUCTION === "true";
const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "";
const sessionCookie = process.env.FIRST_CLINIC_REHEARSAL_SESSION_COOKIE ?? "";
const superAdminEmail = process.env.FIRST_CLINIC_REHEARSAL_SUPER_ADMIN_EMAIL ?? "";
const superAdminPassword = process.env.FIRST_CLINIC_REHEARSAL_SUPER_ADMIN_PASSWORD ?? "";
const turnstileToken = process.env.FIRST_CLINIC_REHEARSAL_TURNSTILE_TOKEN ?? "";

type SessionPayload = {
  session: {
    organizationId: string;
    role: string;
  };
  state: {
    auditLogs: Array<{
      action: string;
      metadataJson?: Record<string, unknown>;
      organizationId?: string;
    }>;
    conversations: Array<{
      id: string;
      leadId?: string;
      organizationId: string;
    }>;
    leads: Array<{
      id: string;
      name: string;
      organizationId: string;
    }>;
    subscriptions: Array<{
      currentPeriodEnd: string;
      currentPeriodStart: string;
      organizationId: string;
      plan: string;
      status: string;
    }>;
  };
};

async function installSuperAdminSession(context: BrowserContext, target: URL) {
  if (sessionCookie) {
    await context.addCookies([
      {
        domain: target.hostname,
        httpOnly: true,
        name: "dental_recovery_session",
        path: "/",
        sameSite: "Lax",
        secure: target.protocol === "https:",
        value: sessionCookie,
      },
    ]);
    return;
  }

  expect(
    superAdminEmail && superAdminPassword,
    "Set FIRST_CLINIC_REHEARSAL_SESSION_COOKIE or FIRST_CLINIC_REHEARSAL_SUPER_ADMIN_EMAIL/PASSWORD.",
  ).toBeTruthy();

  const response = await context.request.post("/api/v1/auth/session", {
    data: {
      email: superAdminEmail,
      password: superAdminPassword,
      turnstileToken: turnstileToken || undefined,
    },
  });

  expect(response.ok(), await response.text()).toBeTruthy();
}

test.describe.configure({ mode: "serial" });

test.describe("guarded production first-clinic rehearsal", () => {
  test.skip(!enabled, "Set FIRST_CLINIC_REHEARSAL_PRODUCTION=true to create production rehearsal data.");

  test("registers a fake clinic, grants/holds/unlocks Growth, sends a lead, replies, and verifies audit", async ({
    context,
    page,
  }, testInfo) => {
    test.setTimeout(240_000);

    const target = new URL(baseUrl);
    expect(target.protocol).toBe("https:");
    expect(target.hostname).toBe("dashdental.space");

    const stamp = new Date().toISOString().replaceAll(/[-:.TZ]/g, "").slice(0, 14);
    const clinicName = `Dental Recovery Rehearsal Clinic ${stamp}`;
    const email = `synthetic+first-clinic-${stamp}@clinic.example`;
    const password = `Rehearsal-${stamp}!A1`;
    const patientName = `Synthetic Rehearsal Patient ${stamp}`;

    const registerResponse = await context.request.post("/api/v1/auth/register", {
      data: {
        clinicName,
        currency: "USD",
        email,
        ownerName: "Synthetic Rehearsal Owner",
        password,
        timezone: "Europe/Kiev",
        turnstileToken: turnstileToken || undefined,
      },
    });
    expect(registerResponse.ok(), await registerResponse.text()).toBeTruthy();

    const registered = (await registerResponse.json()) as SessionPayload;
    const organizationId = registered.session.organizationId;
    const trial = registered.state.subscriptions.find(
      (item) => item.organizationId === organizationId,
    );

    expect(trial?.status).toBe("trialing");
    expect(trialLengthDays(trial!.currentPeriodStart, trial!.currentPeriodEnd)).toBe(14);

    await page.goto("/setup", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toContainText(/Onboarding|Launch readiness|Setup/i);
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toContainText(/Dental Recovery|Recovery|Dashboard/i);

    await context.clearCookies();
    await installSuperAdminSession(context, target);

    for (const change of [
      { externalReference: `REHEARSAL-GROWTH-${stamp}`, status: "active" },
      { externalReference: `REHEARSAL-HOLD-${stamp}`, status: "read_only" },
      { externalReference: `REHEARSAL-UNLOCK-${stamp}`, status: "active" },
    ]) {
      const response = await context.request.post("/api/v1/admin/billing/manual-activation", {
        data: {
          organizationId,
          periodDays: 30,
          plan: "growth",
          ...change,
        },
      });
      expect(response.ok(), await response.text()).toBeTruthy();
    }

    const webhookSecret = `rehearsal-${stamp}`;
    const configResponse = await context.request.post("/api/v1/integrations/web-form/config", {
      data: {
        organizationId,
        webhookSecret,
      },
    });
    expect(configResponse.ok(), await configResponse.text()).toBeTruthy();

    const eventId = `first-clinic-rehearsal-${stamp}`;
    const webhookResponse = await context.request.post("/api/v1/webhooks/web-form", {
      data: {
        email: "synthetic.patient@example.com",
        eventId,
        message: "I want to book a whitening consultation this week.",
        name: patientName,
        organizationId,
        phone: "+15555550191",
      },
      headers: {
        "idempotency-key": eventId,
        "x-webhook-secret": webhookSecret,
      },
    });
    expect(webhookResponse.status(), await webhookResponse.text()).toBe(202);

    const stateResponse = await context.request.get("/api/v1/auth/session");
    expect(stateResponse.ok(), await stateResponse.text()).toBeTruthy();
    const state = (await stateResponse.json()) as SessionPayload;
    const lead = state.state.leads.find(
      (item) => item.organizationId === organizationId && item.name === patientName,
    );
    expect(lead, "Synthetic lead should be visible in production state.").toBeTruthy();
    const conversation = state.state.conversations.find((item) => item.leadId === lead!.id);
    expect(conversation, "Synthetic conversation should be created.").toBeTruthy();

    const replyResponse = await context.request.post(
      `/api/v1/conversations/${conversation!.id}/messages`,
      {
        data: {
          text: "Thanks for reaching out. We can help this week. What day works best?",
        },
        headers: {
          "idempotency-key": `first-clinic-reply-${stamp}`,
        },
      },
    );
    expect(replyResponse.status(), await replyResponse.text()).toBe(202);

    const finalStateResponse = await context.request.get("/api/v1/auth/session");
    const finalState = (await finalStateResponse.json()) as SessionPayload;
    const auditActions = finalState.state.auditLogs
      .filter((item) => item.organizationId === organizationId)
      .map((item) => item.action);

    expect(auditActions).toContain("subscription.manual_activated");
    expect(auditActions).toContain("subscription.manual_status_changed");

    testInfo.annotations.push({
      type: "rehearsal-report",
      description: [
        `clinic=${clinicName}`,
        `organizationId=${organizationId}`,
        `ownerEmail=${email}`,
        `lead=${patientName}`,
        "leftBehind=synthetic clinic, subscription audit rows, web-form integration, lead, conversation, queued reply",
      ].join("; "),
    });
  });
});
