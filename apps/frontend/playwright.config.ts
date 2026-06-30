import { defineConfig, devices } from "@playwright/test"

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 4321)
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: "./tests",
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

  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: { baseURL },
    },
    {
      name: "chromium-guest",
      testMatch: /guest\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL },
      dependencies: ["setup"],
    },
    {
      name: "chromium-auth",
      testMatch: /auth\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        baseURL,
        storageState: "playwright/.auth/admin.json",
      },
      dependencies: ["setup"],
    },
    {
      name: "chromium-mobile",
      testMatch: /mobile-menu\.spec\.ts/,
      use: {
        ...devices["Pixel 7"],
        baseURL,
        storageState: "playwright/.auth/admin.json",
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
