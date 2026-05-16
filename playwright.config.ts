import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  reporter: [["list"], ["html", { open: "never" }]],
  retries: process.env.CI ? 1 : 0,
  testDir: "./tests/e2e",
  timeout: 60_000,
  workers: Number(process.env.PLAYWRIGHT_WORKERS ?? 1),
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
        env: {
          APP_STORAGE_DRIVER: "file",
          ENABLE_DEMO_ACTIONS: "true",
          ENABLE_DEV_LOGIN: "true",
          SESSION_SECRET: "playwright-local-session-secret",
        },
        reuseExistingServer: !process.env.CI,
        timeout: 240_000,
        url: baseURL,
      },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
