## Context

`apps/frontend` (Astro 7 SSR + React islands `client:only`, Tailwind v4,
shadcn `new-york` on Radix) already copies the `console` project's oklch
palette, radius and several primitives (`PageHero`, `StateCard`,
`SoftCardList`, `StatusDot`, `FormDialog`, `dash-enter`). What it lacks is
the discipline around them:

- No written rules. The `type-*` utilities exist, but `type-display` is used
  once while 145 raw `text-xs` and 5 hand-written `text-2xl` titles exist.
- The sidebar shell only wraps `/inventory/*` and `/jobs/*` list pages. It
  nests a React island inside another (`WithSidebarShell` receives the page
  island as a slot), adds a 56px bar containing only the trigger, and doubles
  the padding (`p-3 sm:p-4` + `PageShell p-6 lg:px-8`).
- Full-height screens use `h-[calc(100dvh-3.5rem)]`,
  `h-[calc(100dvh-var(--navbar-height))]` and `fixed top-(--navbar-height)`.
- Resource collections are card grids (`ResourceCard`), except users (loose
  `li` cards) and history (a fake table built on a grid template).
- The run console is its own zinc/emerald/red system (≈130 of the 154 raw
  palette classes), copied across four pages, and mixes theme tokens
  (`text-destructive`, `bg-background` buttons) into an always-dark surface.
- Token bugs: dark `--sidebar-border` equals the light value; `Badge
  secondary` paints text in `--secondary` (near-background on light);
  `--primary-foreground` is near-black while console uses white.

Reference implementation: `/opt/dev/console/apps/frontend` (`DESIGN.md`,
`src/styles/global.css`, `components/shared/{brand,layout,resource,feedback,
data-display,form}`, `layouts/WithSidebar.astro`, `lib/app-surfaces.ts`).

## Goals / Non-Goals

**Goals:**
- One written design system and one token file that match `console`'s visual
  language.
- One shell, one page frame, one list pattern, one dialog frame, one status
  language, one terminal frame.
- Zero raw palette colours in `src/features` and `src/components` outside the
  terminal token definitions.
- Keep every route, API call, i18n key namespace and behaviour intact.

**Non-Goals:**
- Migrating shadcn primitives from Radix to Base UI (`base-nova`).
- Porting `console`'s Ladle stories, virtualised tables or filter sheet
  infrastructure beyond what current pages need.
- Redesigning the playbook/script editors' internal behaviour or the run
  event parsing.
- Merging the React islands into a single SPA or changing data fetching.
- Any backend, API or database change.

## Decisions

### D1. Port `console`'s design contract, not its code wholesale
Write `apps/frontend/DESIGN.md` as an adapted copy of console's rules and copy
individual primitives file by file, adapting imports to this repo (`@/`
alias, `radix-ui`, `react-i18next`).
*Alternative:* extract a shared `packages/ui` used by both repos. Rejected:
they are separate repositories with different primitive libraries (Radix vs
Base UI), so a shared package would force the Base UI migration listed as a
non-goal.

### D2. Typography via tokens + `Text` component
Replace `--type-*` variables and `type-*` utilities with console's
`--font-size-{display,headline,body,meta,meta-sm,label,stat}` tokens mapped
into `@theme inline` as `text-display`, `text-headline`, etc., plus a `Text`
component (`components/shared/brand/typography.tsx`) with variants and tones.
Global `h1/h2/h3` size overrides in `@layer base` are removed so headings no
longer carry implicit sizes. Fonts switch to Space Grotesk Variable + Space
Mono (400/700) via `@fontsource`, with a preload partial in the layout.
*Alternative:* keep Outfit/Geist Mono and only enforce the scale. Rejected:
the typeface is the largest single contributor to the perceived difference.

### D3. Token corrections
- `--primary-foreground: oklch(1 0 0)` (white on terracotta, as console).
- Dark `--sidebar-border: var(--border)`.
- `Badge` returns to neutral variants: `secondary` = `bg-secondary
  text-secondary-foreground`, `outline` = `border text-foreground`; the
  translucent-orange `default` is kept only for counts. Badges are reserved
  for identifiers; status uses `StatusTag` (D6).
- `--destructive` keeps console's value (ink on light, red on dark). This is
  deliberate in console: danger is expressed by position, wording and the
  destructive button, not by red. The mixed red hard-codes that made it look
  inconsistent are removed.
- Delete `--footer-height`, `--layout-chrome-height`, `.min-h-main`,
  `--font-serif`, duplicated font/shadow blocks in `.dark`, and circular
  `@theme` entries.
- Add a terminal token set (D8).

### D4. Page-surface registry
Add `src/lib/app-surfaces.ts` keyed by surface id (`dashboard`, `ansible`, `bash`,
`playbooks`, `scripts`, `commands`, `inventory`, `devices`, `groups`,
`credentials`, `scheduler`, `history`, `config`, `adminUsers`, `me`)
with `href`, `titleKey`, `descriptionKey`, `icon`, and optional `section`.
`features/app-shell/site-nav.ts` derives `siteNavItems` from it, and
`PageHero` accepts `surface="…"` to resolve icon/title/description. `.astro`
pages resolve the `<title>` from the same entry on the server via the existing
i18n server resolver.

### D5. Shell: persistent sidebar as a sibling island
Rewrite `layouts/WithSidebar.astro` following console: the sidebar is its own
`client:only` island wrapped in `transition:persist="section-sidebar"`, and the
page island is a sibling inside a plain Astro `<main>` scroller with the
single padding `p-4 sm:p-6`. `WithSidebarShell` and the nested
`AppShell`/`SidebarInset` wrapper disappear, removing nested islands, nested
`<main>` and the empty `h-14` bar. The `SidebarTrigger` moves into the page
hero row on narrow viewports and into the sidebar footer on desktop.
Sections (revised during apply at the user's request): Inventory (devices,
groups, credentials), Ansible (playbooks, scheduler, history — overview
`/ansible`; job detail/form routes under `/jobs/*` map to it through a section
prefix) and Bash (scripts, commands — overview `/bash`). `/jobs` and
`/automation` redirect to `/ansible`. Detail, form and run routes of a section use
`WithSidebar` too, passing the owning section.
The navbar drops `max-w-6xl` and uses full width with `px-4 sm:px-6`.
*Alternative:* keep Playbooks/Scripts/Commands top-level without a sidebar.
Rejected: it keeps two shell shapes, which is the core inconsistency.
*Alternative:* move them under `/ansible/*` and `/bash/*` URLs. Rejected: breaks links
and E2E tests for no visual gain; `isNavItemActive` already supports
sub-items whose href is outside the parent path.

### D6. Page frames
- `PageShell` keeps widths `3xl | 6xl | full` (drop unused `4xl`, `5xl`,
  compact padding); it no longer renders `<main>` (the layout owns it).
- `PageHero` is mandatory at the top of every page, `gap-6` to content.
- `layouts/Detail.astro`-equivalent: a `DetailFrame` React component with a
  back link in the `status` role (`text-xs uppercase tracking-[0.08em]`)
  followed by `PageHero`. Used by `/jobs/new`, `/jobs/[id]/edit`,
  `/inventory/[id]/group`, playbook and script forms.
- `LockedFrame` for run consoles and editors: layout flag `locked` makes the
  scroller `overflow-hidden` and the page a `flex-1 min-h-0` column, replacing
  all `calc(100dvh-…)` and `fixed` techniques.

### D7. Definition-driven cards (revised)
Port `EntityList` + `EntityListDefinition<T, Ctx>` + `MetadataCell` +
`ResourceOverview` + `QueryState` from console. Each resource gets
`features/<name>/definitions/<resource>.definition.tsx` describing primary,
secondary, metadata, status and actions. `ResourcePage` and
`ResourceListState` are replaced by `ResourceOverview`; `ResourceCard`,
`playbook-folder-card` and the per-feature `*-list.tsx` grids are deleted.
Playbook folders render as grouped sections (accordion header + `EntityList`),
matching console's crons-by-tag pattern. History uses the shared `Table` with
the `label` header style. Section overviews keep `SurfaceCard` grids.
**Revision (user decision during apply):** resource collections keep cards.
`EntityCardGrid` renders the same `EntityListDefinition` as a grid of flat
cards (console's `EntityCard` shape), so the definitions stay and only the
presentation changes. `EntityList` rows remain for activity feeds.

### D8. Run console tokens and frame
Define in `global.css` (same values in both themes, since the terminal stays
dark in both):
`--terminal-bg`, `--terminal-surface`, `--terminal-border`,
`--terminal-fg`, `--terminal-muted`, `--terminal-ok`, `--terminal-changed`,
`--terminal-failed`, `--terminal-skipped`, `--terminal-running` (terracotta), plus `--terminal-font` (native monospace
stack kept because Space Mono lacks box-drawing glyphs used in command
output),
exposed as `bg-terminal`, `text-terminal-ok`, etc. `features/run/components/
terminal-frame.tsx` owns title bar, prompt, stream banner, result banner and
the optional `lg:w-72` side panel; `Button` gains a `terminal` variant. The
four run pages compose `TerminalFrame` inside `LockedFrame`. The fake traffic
light dots are dropped (decorative, adds three more colours).
*Alternative:* make the terminal follow the page theme. Rejected: operators
expect dark output, and a light terminal would need a second status palette.

### D9. Primitives added
`npx shadcn add table textarea checkbox tabs` (new-york), then restyle to the
design tokens. `TEXTAREA_BASE_CLASS`, the span checkbox in group detail and
the button tabs in the credential modal are replaced.

## Risks / Trade-offs

- [Large diff touching every page] → Execute in the task-group order; each
  group leaves the app working and passes `check-types`, Biome and E2E.
- [E2E selectors tied to card markup or heading text] → Update selectors in
  the same task as the page migration; prefer role/label selectors.
- [Ink-coloured destructive on light may read as less alarming] → Destructive
  actions always use the destructive button variant, confirmation dialogs and
  explicit wording; revisit after review (see Open Questions).
- [Persisted sidebar island shows stale active state after navigation] →
  Sidebar reads the path from `astro:after-swap` / `location` instead of a
  prop, as console does.
- [Font swap changes metrics and may overflow tight rows] → Visual pass in
  both themes at mobile and desktop widths per migrated page.
- [Removing card grids loses at-a-glance density for playbook folders] →
  Folder grouping keeps structure; row counts shown in the group header.

## Migration Plan

Frontend-only, shipped as one release. No data migration. Rollback is a
revert of the change's commits.

## Open Questions

- Keep `--destructive` as ink on light (console) or make it red in both
  themes? Default: follow console; revisit after the first visual review.
- Should the dashboard keep `StatCard` tiles or become a `ResourceOverview`
  of recent runs plus `HeroCount` meta? Default: keep tiles restyled with
  the `stat` token, no icon wells.
