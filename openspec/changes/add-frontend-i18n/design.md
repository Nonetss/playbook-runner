## Context

The frontend (`apps/frontend`) is Astro 7 in `output: "server"` mode with the Node standalone adapter, using React 19 islands for interactivity. All user-facing text is hardcoded in English across ~22 `.astro` pages and ~90 React components under `src/components/{features,shared,ui}`. There is an existing auth middleware (`src/middleware.ts`) that resolves the session and writes it to `Astro.locals`, and a providers tree under `src/components/providers` (TanStack Query, etc.) mounted into island roots.

The decision (confirmed with the user) is: support **es + en**, **default = auto-detect from browser with fallback to Spanish**, and **no URL prefixes** — locale is carried by cookie/header, not by route. This keeps `pages/` and the auth middleware untouched structurally.

The critical constraint driving the design: Astro's native `astro:i18n` helpers and `Astro.currentLocale` only exist inside `.astro` files, but the overwhelming majority of text lives in React islands. So the translation engine must be a runtime library that works inside React, fed a locale that Astro resolved on the server.

## Goals / Non-Goals

**Goals:**
- One runtime i18n engine usable from both React islands and `.astro` pages.
- SSR-consistent locale (no hydration flash / mismatch) by resolving locale in middleware and threading it to islands.
- A single locale registry so new languages are add-a-file, not edit-code.
- Persist explicit user choice (cookie + localStorage); auto-detect otherwise.
- Zero URL/route changes; no backend changes.

**Non-Goals:**
- Localized URL routing (`/es/…`), `hreflang`, or per-locale SEO.
- Translating backend messages, emails, or API responses.
- Localizing dates/numbers/currency via ICU beyond what i18next interpolation gives for free (can come later).
- RTL support (not needed for es/en).

## Decisions

### D1: `i18next` + `react-i18next` + `i18next-browser-languagedetector`
The mature standard for React runtime i18n. `react-i18next` gives the `useTranslation()` hook and `<Trans>` for rich text; the language detector handles cookie/localStorage/navigator on the client. **Alternatives considered:** Astro native i18n routing (rejected — doesn't reach React islands, forces URL restructure and auth-middleware rework); a hand-rolled context + JSON (rejected — reinvents pluralization, interpolation, namespaces, fallback). i18next is small enough for this app and the team already ships other runtime libs.

### D2: Server resolves locale in middleware; client receives it as initial value
Extend `src/middleware.ts` to compute the active locale (cookie → `Accept-Language` → `es`) and store it on `Astro.locals.locale` (typed in `src/env.d.ts`). `Layout.astro` reads `Astro.locals.locale`, sets `<html lang>`, and passes the locale as a prop into the island provider tree. The React `I18nProvider` initializes i18next with that exact locale, so the first client render equals the SSR render. The browser language detector is configured to trust this initial value and only take over on explicit user switches. **Alternative:** detect purely client-side (rejected — causes a flash of the wrong language and hydration mismatch on SSR).

### D3: Locale registry as single source of truth
A `src/lib/i18n/config.ts` exports `SUPPORTED_LOCALES` (e.g. `["es", "en"]`), `DEFAULT_LOCALE = "es"`, labels, and the resource map. Middleware, the switcher, and i18next all import from here. Adding `fr` later = add `src/locales/fr/*.json` + one array entry.

### D4: Namespaced JSON resources, colocated by domain
Resources live at `src/locales/<lang>/<namespace>.json`. Namespaces mirror the app's feature areas (e.g. `common`, `nav`, `auth`, `playbooks`, `jobs`, `scripts`, `inventory`, `credentials`, `commands`, `config`, `dashboard`). This keeps files reviewable and lets components load only what they need. English is authored first by extracting current literals verbatim; Spanish is translated from it.

### D5: Access pattern
React components use `const { t } = useTranslation("<namespace>")` then `t("key")`. For text in `.astro` frontmatter, a small `getFixedT(locale, namespace)` helper (from an i18next instance created per-request or a shared server instance) renders strings server-side. Missing keys fall back to `en` via i18next `fallbackLng: "en"`.

### D6: Language switcher
A `LanguageSwitcher` React component (dropdown, reuse existing `ui` primitives) placed in the navbar/user menu. On change it calls `i18n.changeLanguage(code)`, writes the `locale` cookie (so SSR agrees on next load) and localStorage, and updates live — no navigation.

## Risks / Trade-offs

- **[Large mechanical surface — ~90 components + 22 pages]** → Extract incrementally, namespace-by-namespace; keep English keys = current literals so diffs are mechanical and reviewable. Ship in stages (framework first, then per-feature extraction) rather than one giant PR.
- **[Hydration mismatch if provider initial locale drifts from SSR]** → Single source of truth for the initial locale (middleware → locals → prop → provider); disable client-side auto-detection overriding the SSR value on first paint.
- **[Playwright e2e selectors matching English text break]** → Pin the test locale via the `locale` cookie (or `Accept-Language`) in Playwright setup so text is deterministic; update selectors to the pinned locale. See existing e2e memory on hydration timing.
- **[Bundle size from loading all namespaces everywhere]** → Load namespaces per route/island; keep `common`/`nav` global, lazy the rest.
- **[Untranslated Spanish keys ship as English]** → Acceptable interim via `fallbackLng`; track coverage so gaps are visible rather than crashing.

## Migration Plan

1. Add deps + `src/lib/i18n` config and the `I18nProvider`; wire middleware + `Layout.astro`. No visible change yet (English still default via extraction pending).
2. Extract global namespaces (`common`, `nav`) and add the switcher — now switchable on shared chrome.
3. Extract feature namespaces incrementally; author `es` alongside `en`.
4. Pin Playwright locale and fix selectors.
5. Flip default detection on (auto → fallback `es`).

**Rollback:** the layer is additive; reverting the provider/middleware wiring restores hardcoded English. Because English keys equal the original literals, partial rollout is safe.

## Open Questions

- Which namespace granularity per feature is worth the split vs. a single `app` namespace? (Lean toward per-feature for large areas like `playbooks`/`jobs`.)
- Do we want a per-request i18next server instance or a shared one with `getFixedT`? (Shared is fine given stateless string lookup; revisit if concurrency issues appear.)
