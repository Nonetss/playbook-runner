import { mock } from "bun:test"

/**
 * Stand-in for Astro's `astro:transitions/client` virtual module, which
 * only exists inside Vite. `tests/unit/setup.ts` installs it; a test asserts
 * client-side navigations through `astroNavigate.mock.calls` and calls
 * `astroNavigate.mockClear()` when it does.
 */
export const astroNavigate = mock((_href: string) => Promise.resolve())
