# `apps/frontend` — Playbook Runner UI

Astro 7 (server output) + React 19 islands, runtime-localized with
`i18next` + `react-i18next` (es + en at launch).

## Internationalization (i18n)

### How locale is resolved

On every request, `src/middleware.ts` reads the `locale` cookie → falls back to
`Accept-Language` → falls back to `DEFAULT_LOCALE = "es"`. The resolved
locale is stored on `Astro.locals.locale` and forwarded to the React islands
through `src/components/providers/app-providers.tsx`. React's `I18nProvider`
initializes the i18next singleton with that locale so the first client render
matches the SSR markup.

```text
┌──────────────┐   ┌─────────────────┐   ┌────────────────────────┐
│  middleware  │ → │  Astro.locals   │ → │  Astro / React island  │
│   resolve    │   │   .locale       │   │  (Layout / Providers)  │
└──────────────┘   └─────────────────┘   └────────────────────────┘
```

The locale cookie is written by the `LanguageSwitcher`
(`src/components/features/global/language-switcher.tsx`) on every user
selection.

### File layout

```
src/
├── lib/i18n/
│   ├── config.ts        # SUPPORTED_LOCALES, NAMESPACES, labels
│   ├── index.ts         # Client-side singleton init
│   ├── server.ts        # getServerT(locale, ns) — used by .astro pages
│   └── resolve.ts       # cookie → Accept-Language → default
└── locales/
    ├── en/<namespace>.json     # Reference locale
    └── es/<namespace>.json     # Spanish translations
```

### Adding a new locale (e.g. `fr`)

1. **`src/lib/i18n/config.ts`** — add `"fr"` to `SUPPORTED_LOCALES` and to
   `LOCALE_LABELS`.
2. **`src/lib/i18n/index.ts`** — import each `fr/<ns>.json` and add a
   `frResources` map; register it under `resources.fr` mirroring `en`/`es`.
3. **`src/lib/i18n/server.ts`** — same: import `fr/<ns>.json` and add the
   `fr` branch to the server `resources` map.
4. **`src/locales/fr/<namespace>.json`** — author translations for each
   namespace (`common`, `nav`, `auth`, `account`, `playbooks`, `jobs`,
   `scripts`, `inventory`, `credentials`, `commands`, `config`, `dashboard`).
5. Run `bun run check:translations` from this directory to verify every
   English key has a French counterpart. The script exits non-zero if any
   keys are missing.

### Adding a new translation key

1. Find the right namespace (`common`, `nav`, `auth`, `account`, `playbooks`,
   `jobs`, `scripts`, `inventory`, `credentials`, `commands`, `config`,
   `dashboard`). One namespace per feature area.
2. Add the key to **`src/locales/en/<namespace>.json`** (English is the
   reference locale).
3. Mirror it in every other locale under `src/locales/<lang>/<namespace>.json`.
   Missing keys are tolerated at runtime via `fallbackLng: "en"` but **fail
   the coverage script** in CI.
4. In the component, `import { useTranslation } from "react-i18next"`, then:

   ```tsx
   const { t } = useTranslation("playbooks")
   <span>{t("page.title")}</span>
   ```

5. In a `.astro` page frontmatter:

   ```astro
   ---
   import { getServerT } from "@/lib/i18n/server"
   const { locale } = Astro.locals
   const t = await getServerT(locale, "playbooks")
   ---
   <Layout title={t("page.title")}>…</Layout>
   ```

### Run the coverage check

```sh
bun run check:translations
```

This compares every key in `en/*` against the keys in every other locale and
exits non-zero if any locale is missing keys.

## Testing

- Unit/integration: Vitest / Astro Check.
- E2E: Playwright (`bun run test:e2e`). Tests pin the locale via the
  `locale` cookie in `tests/helpers.ts` so text matching is deterministic.
