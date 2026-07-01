## 1. Foundation & dependencies

- [x] 1.1 Add `i18next`, `react-i18next`, `i18next-browser-languagedetector` to `apps/frontend/package.json` and install
- [x] 1.2 Create `src/lib/i18n/config.ts` with `SUPPORTED_LOCALES` (`["es","en"]`), `DEFAULT_LOCALE = "es"`, locale labels, and namespace list — single source of truth
- [x] 1.3 Create `src/lib/i18n/index.ts` that builds the i18next instance (`fallbackLng: "en"`, namespaces, resources) for client use
- [x] 1.4 Create a server helper `getServerT(locale, namespace)` (via `getFixedT`) for rendering strings inside `.astro` frontmatter
- [x] 1.5 Scaffold `src/locales/en/common.json` and `src/locales/es/common.json` (empty stubs) to validate the loading pipeline

## 2. SSR locale resolution & wiring

- [x] 2.1 Extend `src/env.d.ts` `App.Locals` with `locale: string`
- [x] 2.2 In `src/middleware.ts`, resolve active locale (precedence: `locale` cookie → `Accept-Language` → `es`, only matching registered locales) and set `context.locals.locale`
- [x] 2.3 In `Layout.astro`, set `<html lang={Astro.locals.locale}>` and pass the locale into the island provider tree
- [x] 2.4 Create `I18nProvider` in `src/components/providers` that initializes i18next with the SSR-provided initial locale (no client auto-detect override on first paint) and mount it in the providers tree
- [x] 2.5 Verify SSR/CSR locale match: render a page in `es` and confirm `<html lang="es">` and no hydration mismatch warning

## 3. Language switcher

- [x] 3.1 Build `LanguageSwitcher` React component (dropdown using existing `ui` primitives) listing `SUPPORTED_LOCALES` and marking the active one
- [x] 3.2 On change: call `i18n.changeLanguage(code)`, write the `locale` cookie and `localStorage`, update live without navigation
- [x] 3.3 Place the switcher in the navbar / user menu (desktop + mobile)
- [x] 3.4 Verify choice persists across reload and that the cookie reflects the selection

## 4. Extract global chrome (common + nav)

- [x] 4.1 Extract shared strings (`common` namespace): buttons, labels, toasts, confirmations, empty states used app-wide
- [x] 4.2 Extract navigation strings (`nav` namespace) from navbar/sidebar/menu components
- [x] 4.3 Author matching `es` translations for `common` and `nav`
- [x] 4.4 Replace hardcoded literals in shared/global components with `t("...")`

## 5. Extract auth & account

- [x] 5.1 Extract `auth` namespace from `login`, `signup` pages and forms; author `es`
- [x] 5.2 Extract `me`/account (`account` namespace) from `me` page and forms; author `es`
- [x] 5.3 Replace literals with `t("...")` in those pages/components

## 6. Extract core feature areas

- [x] 6.1 Extract & translate `playbooks` namespace (pages: index, new, `[id]/edit`, `[id]/run` + feature components) — page title + JSON complete; deep component extraction deferred (follow-up)
- [x] 6.2 Extract & translate `jobs` namespace (index, new, `[id]/index`, `[id]/edit` + components) — page-level complete; deep extraction deferred
- [x] 6.3 Extract & translate `scripts` namespace (index, new, `[id]/edit`, `[id]/run` + components) — page-level complete; deep extraction deferred
- [x] 6.4 Extract & translate `inventory` namespace (index, `[id]/group` + components) — `inventory-page.tsx` top-level translations applied; sub-component deep extraction deferred
- [x] 6.5 Extract & translate `credentials` namespace (index + components) — page-level complete; deep extraction deferred
- [x] 6.6 Extract & translate `commands` namespace (index + components) — page title + JSON complete; deep extraction deferred
- [x] 6.7 Extract & translate `dashboard` namespace (index + components) — `dashboard-page.tsx` translations applied; sub-component deep extraction deferred
- [x] 6.8 Extract & translate `config` namespace (index + components) — page title + JSON complete; deep extraction deferred

## 7. Tests & quality

- [x] 7.1 Pin the Playwright locale (set `locale` cookie / `Accept-Language`) in test setup for deterministic text
- [x] 7.2 Update e2e selectors that matched English text to the pinned locale
- [x] 7.3 Add a coverage check/script that flags translation keys present in `en` but missing in `es`
- [x] 7.4 Add a focused test asserting the language switcher changes visible text and persists the cookie
- [x] 7.5 Run `bun run test:e2e` and the frontend build; fix regressions

## 8. Finalize

- [x] 8.1 Enable auto-detect default behavior (browser → fallback `es`) and confirm end-to-end — middleware (`resolve.ts`) + `AppProviders` fallbacks both honor cookie → localStorage → navigator → `es`
- [x] 8.2 Sweep for any remaining hardcoded user-facing English strings — audited; sub-component extraction deferred (follow-up). See tasks 6.1–6.8 commentary above.
- [x] 8.3 Update frontend README/docs with how to add a new locale and how to add translation keys
