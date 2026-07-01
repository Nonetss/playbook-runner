## Why

The frontend is written entirely in hardcoded English strings spread across ~22 Astro pages and ~90 React island components. This blocks Spanish-speaking users (the primary audience) and any future international adoption. Adding a proper internationalization (i18n) layer now — before the UI grows further — lets us ship Spanish immediately and add new languages by dropping in a translation file, without touching component code again.

## What Changes

- Introduce a runtime i18n layer based on `i18next` + `react-i18next`, wired into the React islands and readable from `.astro` pages.
- Add locale detection: auto-detect from the browser `Accept-Language` header in Astro middleware, with a fallback to Spanish, and persist the user's explicit choice in a cookie (`locale`) plus `localStorage`.
- Ship two locales at launch — **Spanish (`es`)** and **English (`en`)** — with English seeded from the current hardcoded strings. The architecture supports adding more locales (`fr`, `pt`, `de`, …) by adding a translation file only.
- Extract all user-facing strings from pages, layouts, and feature/shared components into namespaced translation resource files (`src/locales/<lang>/<namespace>.json`).
- Add a language switcher UI component (in the navbar / user menu) that changes the active locale live and persists it.
- Pass the resolved locale from Astro (`Astro.locals`) into the island providers so server-rendered and client-rendered text stay consistent (no hydration flash).
- No URL changes: routes stay as-is (`/dashboard`, `/playbooks`, …). This is a deliberate choice to avoid restructuring `pages/` and the existing auth middleware.

## Capabilities

### New Capabilities
- `frontend-i18n`: Runtime internationalization for the frontend — locale detection and persistence, translation resource loading, a translation API for React components and Astro pages, and a user-facing language switcher.

### Modified Capabilities
<!-- None: no existing specs in openspec/specs/. -->

## Impact

- **Dependencies (new):** `i18next`, `react-i18next`, `i18next-browser-languagedetector` in `apps/frontend`.
- **Astro:** `src/middleware.ts` gains locale resolution (`Accept-Language` + `locale` cookie) written to `Astro.locals.locale`; `src/env.d.ts` extends `App.Locals`. `Layout.astro` sets `<html lang>` and injects the initial locale into the island provider tree.
- **Providers:** the existing React providers tree (`src/components/providers`) gains an `I18nProvider` that initializes `i18next` with the SSR-resolved locale.
- **Components:** ~22 pages + ~90 React components have their hardcoded English text replaced with `t("namespace:key")` calls. This is the bulk of the mechanical work.
- **New files:** `src/lib/i18n.ts` (i18next config), `src/locales/en/*.json`, `src/locales/es/*.json`, a `LanguageSwitcher` component, and a `useLocale`/`t` access pattern.
- **Tests:** existing Playwright e2e selectors that match on English text may need updates or locale-pinning; the default test locale should be pinned to avoid `Accept-Language` flakiness.
- **No backend changes.**
