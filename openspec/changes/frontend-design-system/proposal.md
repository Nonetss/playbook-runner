## Why

The frontend already shares its colour palette with the sibling `console`
project, but it has no written design system and applies its own primitives
only partially. The result is visibly incoherent: four page-header styles,
three full-height layout techniques, a sidebar that appears and disappears
between sibling routes, doubled padding, six card-grid variants, seven dialogs
that bypass the shared dialog frame, and 154 hard-coded Tailwind colours
(mostly in the run console). `console` shows that the same palette reads as
calm and organised once a written system, a typographic role scale and
structure-owning primitives are enforced. This change brings playbook-runner
to that standard.

## What Changes

- Add a written design system (`apps/frontend/DESIGN.md`) adapted from
  `console`: one-accent rule, hierarchy through typography, flat surfaces
  structured by 1px rules, lists instead of card grids for resources, and
  `font-mono tabular-nums` for technical values.
- Replace the typefaces (Outfit + Geist Mono → Space Grotesk + Space Mono)
  and the `type-*` utilities with the `console` role scale (`display`,
  `headline`, `body`, `meta`, `label`, `status`, `data`) exposed through a
  shared `Text` component.
- Fix broken tokens: dark `--sidebar-border`, `--primary-foreground`, the
  `Badge` `secondary` variant (invisible on light theme); remove dead tokens
  (footer height, serif stack) and circular `@theme` declarations; add a
  `--terminal-*` token set for the run console.
- Introduce a page-surface registry (`lib/app-surfaces.ts`) as the single
  source of each page's title, icon and description, feeding the navbar,
  sidebar, `<title>`, page hero and section overview cards.
- Unify the application shell: full-width navbar aligned with content; every
  navigation section renders inside the persistent section sidebar, including
  detail, form and run routes; remove the empty 56px trigger bar, nested
  `<main>` elements and doubled padding; one `locked` layout for full-height
  screens; one `Detail` frame with a back link.
- Group Playbooks, Scripts and Commands under a new **Automation** navigation
  section (overview at `/automation`) so every section has the same sidebar
  shape. Existing URLs (`/playbooks`, `/scripts`, `/commands`) are unchanged.
- Add structure-owning primitives ported from `console`: `ResourceOverview`,
  `EntityList` with per-resource row definitions, `QueryState`, `StatusDot` /
  `StatusTag`, plus missing shadcn primitives (`Table`, `Textarea`,
  `Checkbox`, `Tabs`). Every create/edit dialog uses `FormDialog`.
- Resource collections (playbooks, scripts, devices, groups, credentials,
  jobs, API keys, users) render through one shared, definition-driven card
  grid instead of per-feature card components; history uses the shared
  table.
- Status outside the run console is expressed as dot + word (no green, amber
  or blue); status colour is allowed only inside the run console via
  `--terminal-ok/changed/failed/skipped/running` tokens.
- Extract a single `TerminalFrame` for the four run screens (commands, script
  run, playbook run, job detail), driven by terminal tokens and `--font-mono`,
  and translate the remaining hard-coded console strings.
- No backend, API, database or route removals. shadcn primitives stay on
  Radix (`new-york`); only their visual layer is aligned.

## Capabilities

### New Capabilities
- `design-system`: written design rules, tokens, typography role scale,
  status language and page-surface registry that every frontend page follows.
- `run-console-presentation`: shared terminal frame and terminal token set
  for all execution output screens.

### Modified Capabilities
- `section-sidebar-layout`: every navigation section (Inventory, Automation,
  Jobs) uses the persistent sidebar, and the sidebar persists on the
  section's detail, form and run routes.
- `frontend-interface-polish`: shared primitives extend to entity lists with
  row definitions, status dot/tag as the only status marker outside the run
  console, and a single page frame (shell + hero) for every page.
- `ssh-credential-management`: credential writes are no longer admin-only;
  any authenticated, non-pending user can create, edit, delete and generate
  credentials.
- `resource-crud-framework`: resource collections render as single-container
  lists instead of card grids, and every create/edit dialog uses the shared
  dialog frame.

## Impact

- Code: `apps/frontend/src/styles/global.css`, `components/ui/*`,
  `components/shared/*`, `layouts/*`, `features/app-shell/*`, every feature
  page under `features/*`, `pages/*.astro` (layout wiring and new
  `automation/index.astro`), i18n catalogues for new labels.
- Dependencies: add `@fontsource-variable/space-grotesk` and
  `@fontsource/space-mono`; remove `@fontsource-variable/outfit` and
  `@fontsource-variable/geist-mono`. Add shadcn `table`, `textarea`,
  `checkbox`, `tabs`.
- Tests: Playwright E2E selectors that rely on card markup or heading levels
  may need updating.
- No backend, API contract, database schema or migration changes.
