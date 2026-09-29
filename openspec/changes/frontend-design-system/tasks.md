## 1. Design contract and tokens

- [x] 1.1 Write `apps/frontend/DESIGN.md` adapted from `/opt/dev/console/DESIGN.md` (one accent, typography roles, surfaces, lists over cards, status language, terminal tokens, primitives catalogue)
- [x] 1.2 Swap fonts: add `@fontsource-variable/space-grotesk` and `@fontsource/space-mono`, remove Outfit and Geist Mono, add a font preload partial to `Layout.astro`
- [x] 1.3 Rewrite typography tokens in `global.css` to console's `--font-size-*`/`--line-height-*` scale mapped as `text-display…text-stat`; remove `--type-*` vars, `type-*` utilities and base `h1/h2/h3` size overrides
- [x] 1.4 Fix tokens: `--primary-foreground` white, dark `--sidebar-border: var(--border)`; delete footer/layout-chrome tokens, `.min-h-main`, serif stack, duplicated `.dark` font/shadow blocks and circular `@theme` entries
- [x] 1.5 Add the `--terminal-*` token set and its `@theme inline` colour mappings
- [x] 1.6 Restyle `components/ui/badge.tsx` variants to neutral tokens and `button.tsx` (drop `text-white`, add `terminal` variant)
- [x] 1.7 Add `components/shared/brand/typography.tsx` (`Text` with variants and tones)

## 2. Surface registry and navigation

- [x] 2.1 Add `src/lib/app-surfaces.ts` with every surface (href, titleKey, descriptionKey, icon, section) and i18n keys for the new Automation section in all locales
- [x] 2.2 Derive `features/app-shell/site-nav.ts` from the registry, adding the Automation section (sub-items `/playbooks`, `/scripts`, `/commands`)
- [x] 2.3 Make the navbar full-width (`px-4 sm:px-6`), unify icon trigger styles into one shared class (drop `nav-trigger.ts` divergence), use `AppLink` for profile/settings
- [x] 2.4 Update `section-nav-overview.tsx` to read from the registry and add `pages/automation/index.astro`

## 3. Shell and page frames

- [x] 3.1 Rewrite `layouts/WithSidebar.astro` with the sidebar as a persisted sibling island and a plain `<main>` scroller with single `p-4 sm:p-6` padding; add a `locked` option
- [x] 3.2 Make `section-sidebar.tsx` read the active path from the location on `astro:after-swap`; move the trigger out of the removed `h-14` bar
- [x] 3.3 Delete `with-sidebar-shell.tsx` and `app-shell.tsx`
- [x] 3.4 Update `PageShell` (no `<main>`, widths `3xl|6xl|full`) and `PageHero` (`surface` prop, `Text` roles, `HeroCount`)
- [x] 3.5 Add `DetailFrame` (back link + hero) and `LockedFrame` components
- [x] 3.6 Switch every section route (lists, detail, form, run) to `WithSidebar` with its owning section; `/`, `/config`, `/admin/users`, `/me` keep `Layout` with `PageShell`

## 4. Shared primitives

- [x] 4.1 Add shadcn `table`, `textarea`, `checkbox`, `tabs` and restyle to tokens
- [x] 4.2 Port `QueryState`, `ResourceOverview`, `EntityList`/`EntityListDefinition`, `MetadataCell`/`MetadataList`, `SurfaceCard` from console; update `StateCard` to console variants
- [x] 4.3 Make `RowActionsMenu` fully visible on coarse pointers
- [x] 4.4 Ensure `FormDialog` matches console (header/body/footer rules, submit spinner) and migrate `ResourceFormModal` onto it
- [x] 4.5 Wire `StatusDot`/`StatusTag` tones and add a `run-status` mapping (ok, partial, failed, running, cancelled) to dot + word

## 5. Resource pages migration

- [x] 5.1 Scripts: definition file + `ResourceOverview`; delete `script-card.tsx`/`script-list.tsx`
- [x] 5.2 Playbooks: folder groups + `EntityList`; delete `playbook-card`, `playbook-folder-card`, `playbook-list`
- [x] 5.3 Inventory devices and groups: definitions + `ResourceOverview`; delete card/list files and legacy empty blocks
- [x] 5.4 Credentials: definition + overview; move `credential-form-modal` to `FormDialog` with `Tabs`/`Textarea`; `provision-script-dialog` to `FormDialog`
- [x] 5.5 Jobs scheduler: definition + overview; `cron-schedule-dialog` to `FormDialog`
- [x] 5.6 History: `ResourceOverview` + shared `Table`, status via `StatusTag`; remove `RunStatusBadge` palette classes
- [x] 5.7 Config API keys and admin users: definitions + overview; `api-key-created-dialog` to `FormDialog`
- [x] 5.8 Remaining dialogs to `FormDialog`: `relations-dialog`, `ping-device-modal`, `move-playbook-dialog`
- [x] 5.9 Delete `ResourcePage`, `ResourceListState`, `ResourceCard`, `SoftCardList` once unused

## 6. Detail, form and utility pages

- [x] 6.1 Group detail on `DetailFrame`, device list via `EntityList` with shared `Checkbox`
- [x] 6.2 Job form, playbook form and script form on `DetailFrame`; editors on `LockedFrame`; error boxes via shared alert pattern
- [x] 6.3 Dashboard: `PageHero` with surface, restyled stat tiles (`text-stat`, no icon wells), recent runs via `EntityList`, empty states via `StateCard`
- [x] 6.4 Profile (`/me`) and login: `Text` roles, remove amber `PendingNotice` palette, `bg-dot-grid` login backdrop as console

## 7. Run console

- [x] 7.1 Create `features/run/components/terminal-frame.tsx` (title bar, prompt, stream banner, result banner, side panel) on terminal tokens
- [x] 7.2 Migrate `playbook-run-console.tsx` and `run-host-console.tsx` to terminal tokens with one shared status-tone map; replace `TERMINAL_FONT_STACK` with `font-terminal`
- [x] 7.3 Migrate `run-stream-status.tsx` terminal variant and "jump to latest" to the `terminal` button variant
- [x] 7.4 Rebuild `commands-page`, `run-script-page`, `run-playbook-page`, `job-detail-page` on `LockedFrame` + `TerminalFrame`
- [x] 7.5 Translate hard-coded console strings (`PLAY`, `PLAY RECAP`, failure count plural) in all locales
- [x] 7.6 Point `code-editor.tsx` at `--terminal-font` and the console size token

## 8. Verification

- [x] 8.0 Switch resource collections to `EntityCardGrid` (user decision: keep cards); open credential writes to every authenticated user

- [x] 8.1 Grep `src/features` and `src/components` for raw palette classes (`zinc|emerald|red|amber|sky|gray|slate|black|white`) and hand-built `calc(100dvh` / `text-2xl` titles; expect zero
- [x] 8.2 Update Playwright selectors affected by list/heading changes and run `bun run test:e2e`
- [x] 8.3 Run `bun run check-types` and `bun run check`
- [ ] 8.4 Manual visual pass of every route in light and dark, mobile and desktop; record findings
- [x] 8.5 Update `AGENTS.md` frontend section (DESIGN.md, app-surfaces registry, layouts, primitives)
