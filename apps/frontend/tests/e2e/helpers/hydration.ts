import { expect, type Locator } from "@playwright/test"

/**
 * Waits for the React island that contains `child` to finish hydrating.
 *
 * Islands are mounted with `client:only="react"`. Interacting (filling,
 * clicking) before hydration lands on the static SSR DOM and is lost:
 * controlled inputs submit empty and button handlers never fire. Astro adds
 * `client-render-time` to the `<astro-island>` once it hydrates, so we wait
 * for that signal before touching the component.
 */
export async function waitForHydration(child: Locator) {
  await expect(
    child.page().locator("astro-island", { has: child })
  ).toHaveAttribute("client-render-time", /\d/)
}
