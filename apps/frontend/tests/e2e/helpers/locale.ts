import type { BrowserContext } from "@playwright/test"

/**
 * Locale pinned for deterministic Playwright text matching.
 * The cookie name and value mirror `apps/frontend/src/lib/i18n/config.ts`.
 */
export const TEST_LOCALE = "es"
export const LOCALE_COOKIE_NAME = "locale"

/** Origin the suite runs against (`playwright.config.ts`). */
export const BASE_URL = `http://localhost:${process.env.PLAYWRIGHT_PORT ?? 4321}`

/**
 * Sets the locale cookie on the browser context so every request uses the
 * pinned locale. The shared `test` (`fixtures.ts`) does it for every spec.
 */
export async function pinLocaleTo(context: BrowserContext, locale: string) {
  await context.addCookies([
    { name: LOCALE_COOKIE_NAME, value: locale, url: BASE_URL },
  ])
}
