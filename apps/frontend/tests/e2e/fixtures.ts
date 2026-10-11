import { test as base } from "@playwright/test"
import { pinLocaleTo, TEST_LOCALE } from "@test/e2e/helpers/locale"
import { createSeeder, type Seeder } from "@test/e2e/helpers/seed"

type Fixtures = {
  /** Pins the Spanish locale cookie before every test (automatic). */
  pinnedLocale: undefined
  /** Creates records through the API and deletes them after the test. */
  seed: Seeder
}

/**
 * The `test` every spec imports. The signed-in account comes from the
 * project's `storageState` (`playwright.config.ts`): specs under `admin/`
 * run as the seeded admin, under `user/` as the regular E2E user, under
 * `guest/` signed out.
 */
export const test = base.extend<Fixtures>({
  pinnedLocale: [
    async ({ context }, use) => {
      await pinLocaleTo(context, TEST_LOCALE)
      await use(undefined)
    },
    { auto: true },
  ],

  seed: async ({ page }, use, testInfo) => {
    const prefix = `e2e-${testInfo.workerIndex}-${Date.now().toString(36)}`
    const seeder = createSeeder(page.request, prefix)
    await use(seeder)
    await seeder.cleanup()
  },
})

export { expect } from "@playwright/test"
