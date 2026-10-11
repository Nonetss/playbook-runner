import { mock } from "bun:test"
import { GlobalRegistrator } from "@happy-dom/global-registrator"
import { astroNavigate } from "@test/unit/fixtures/astro"

/**
 * Preloaded before every test file (`bunfig.toml`). Registers a happy-dom
 * window served from the dev origin, so `history`/`location`/storage behave
 * like the app's and hooks and components render with
 * `@testing-library/react`; pins the timezone so date formatting doesn't
 * depend on the machine; and starts i18n in Spanish, the copy the tests
 * query. i18n is imported after the window exists: it reads the browser's
 * cookie and language when its module loads. Astro's virtual modules only
 * exist inside Vite, so the one the shared components reach is replaced
 * here, once (`mock.module` holds for the whole run).
 */
process.env.TZ = "UTC"
GlobalRegistrator.register({ url: "http://localhost:4321/" })

mock.module("astro:transitions/client", () => ({ navigate: astroNavigate }))

const { initI18n } = await import("@/lib/i18n")
await initI18n("es")
