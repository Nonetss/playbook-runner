import { defineConfig, devices } from "@playwright/test"
import { ADMIN_STATE, USER_STATE } from "./tests/e2e/helpers/auth"

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 4321)
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",

  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  expect: {
    timeout: 5_000,
  },

  // One project per signed-in account, matched by folder: `admin/` runs as
  // the seeded admin, `user/` as the regular E2E user, `guest/` signed out,
  // `mobile/` as the admin on a phone. `auth.setup.ts` writes both states.
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: { baseURL },
    },
    {
      name: "chromium-guest",
      testMatch: /\/guest\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL },
      dependencies: ["setup"],
    },
    {
      name: "chromium-admin",
      testMatch: /\/admin\/.*\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        baseURL,
        storageState: ADMIN_STATE,
      },
      dependencies: ["setup"],
    },
    {
      name: "chromium-user",
      testMatch: /\/user\/.*\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        baseURL,
        storageState: USER_STATE,
      },
      dependencies: ["setup"],
    },
    {
      name: "chromium-mobile",
      testMatch: /\/mobile\/.*\.spec\.ts/,
      use: {
        ...devices["Pixel 7"],
        baseURL,
        storageState: ADMIN_STATE,
      },
      dependencies: ["setup"],
    },
  ],

  webServer: {
    command: `astro dev --port ${PORT}`,
    url: baseURL,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    stdout: "ignore",
    stderr: "pipe",
  },
})
