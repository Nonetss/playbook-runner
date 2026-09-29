# Design System: Playbook Runner

Adapted from the sibling `console` project. This file is normative: new or
changed frontend code follows it, and a deviation is a bug in either the code
or this document.

## Overview

A quiet-editorial operations console on monochrome paper with one warm accent.
Every page reads like a typeset datasheet: one hero, then one collection of
flat cards, a form or a console. Hierarchy comes from type size, weight,
tracking and tabular numerals, not from colour. Surfaces are flat; structure
comes from 1px hairlines (`divide-y`, `border-y`, dialog `border-b`/`border-t`).
Motion is short and useful: `dash-enter` (0.3s, ~40ms stagger) and `dash-pop`.

**The Marginalia Rule.** If a screen "shows up" because it adds colour, a
card, a glow or a chip cluster, it is out of style. The eye must land on the
name, the value and the state — not on the chrome.

## Colour

All tokens live in `src/styles/global.css` and keep their meaning in both
themes.

- **Brand Terracotta** (`--primary`, `oklch(0.6724 0.1308 38.7559)`), white
  foreground. Reserved for three jobs: the hero icon, the primary action and
  the live/active status dot.
- **Neutrals**: `background` (paper), `foreground` (ink), `muted-foreground`
  (secondary text), `card` (used as `bg-card/40` for list containers and
  state blocks), `border` (every hairline), `input`, `muted`/`accent` (hover
  washes: `bg-muted/40` on rows and tiles, `bg-accent` on buttons and menus).
- **Destructive** (`--destructive`): editorial ink on light, true red on dark.
  Errors, deletions, irreversible actions only.
- **Charts** (`--chart-*`): only inside chart canvases.
- **Terminal** (`--terminal-*`): see Run Console. The only place where
  ok/changed/failed colours exist.

**The One Accent Rule.** Terracotta appears on at most three elements per
screen. Never on badges, success markers or info.

**The No-Green-No-Blue-No-Amber Rule.** Outside the run console no semantic
colours are invented. Success is a `foreground` dot plus the word "ok";
failure is `destructive`; everything else is muted. Raw Tailwind palette
classes (`zinc`, `emerald`, `red`, `amber`, `sky`, `gray`, `slate`, `black`,
`white`) never appear in `src/features` or `src/components`.

## Typography

- **Sans**: Space Grotesk Variable (`font-sans`) for all interface text.
- **Mono**: Space Mono (`font-mono`) for technical values; tabular numerals
  are applied at the base layer.
- **Terminal**: `font-terminal` (native OS monospace stack) only for raw
  command output, because it needs box-drawing glyphs the brand mono lacks.

Roles are chosen through `Text` (`components/shared/brand/typography.tsx`) or
the matching `text-<role>` utility — never by rebuilding size + weight +
tracking by hand.

| Role | Spec | Use |
| --- | --- | --- |
| `display` | 1.75rem semibold, tight | Page title in `PageHero` |
| `stat` | 1.5rem | Lone dashboard number |
| `headline` | 1rem medium, tight | Row names, dialog and tile titles |
| `body` | 0.875rem | Prose, form values |
| `meta` | 0.8125rem | Hero descriptions, hints, counters |
| `label` | 11px medium caps, 0.12em | Field labels, table heads, section heads |
| `status` | 12px caps, 0.08em | `StatusTag`, back link |
| `data` | Space Mono 12px tabular | IPs, ids, cron, durations, timestamps |

11px is the legibility floor. Headings carry no implicit size.

## Layout

- **Shell**: sticky full-width navbar (`--navbar-height: 3.6rem`) whose
  section menus open on hover (Radix `NavigationMenu`, panel centred under
  its trigger). Every
  navigation section (Inventory, Ansible, Bash) renders inside
  `WithSidebar.astro`: a persisted section sidebar island plus a plain `<main>`
  scroller that owns the only page padding (`px-4 py-6 sm:px-6`).
  Top-level pages without a section (dashboard, config, admin, profile) use
  `Layout.astro` with the same padding through `PageShell`.
- **Width**: `PageShell` inherits the layout width through
  `--page-max-width`: `6xl` in `Layout.astro`, full width in `WithSidebar.astro`. Pages override with `maxWidth`: `4xl`/`3xl` for
  single-column forms and profile, `full` for tables, editors and consoles,
  `6xl`/`80%` explicitly when needed.
- **Layout options** (both layouts): `padding="compact"` for dense tables,
  `scrollToTop` for the floating back-to-top button (mounted once, shown past
  400px of scroll). `WithSidebar` adds `boundedContent` (page owns its own
  scroll region from `sm` up), `persistScroll` (restore the inset offset
  across navigations; `false` snaps to top, `"owned"` leaves it to the page)
  and `locked`.
- **Locked pages**: editors and run consoles pass `locked` to the layout;
  on `split` viewports (`md` wide **and** 34rem tall, custom variant in
  `global.css`) the scroller becomes `overflow-hidden` and the page fills the
  remaining height with `flex-1 min-h-0`. Everywhere else (`stacked`: phones
  in either orientation) the page scrolls normally and the editor/terminal
  keep a minimum height (`60dvh`/`65dvh`), so stacked fields and side panels
  stay reachable. Run screens pass `setupFirst` to `TerminalFrame`: when
  stacked, the panel (inventory, options, run button) comes before the
  console and the console scrolls into view once a run starts. Never compute
  `calc(100dvh - …)` by hand.
- **Responsive**: phones (`< sm`), tablet portrait (`md`–`lg`: the section
  sidebar starts as the icon rail), desktop (`lg`+). Collapse by the
  container, not the viewport, wherever the sidebar changes the width
  (`@container` on tables, fact rows). `FormDialog` is a bottom sheet below
  `sm` (fixed header/footer, scrolling body). Touch pointers
  (`pointer-coarse:`) get ≥ 40px controls, 16px input text (no iOS focus
  zoom) and widened hit areas on checkboxes, switches and text links; the
  visual size on mouse screens does not change. Long labels in a
  `SegmentedPicker` give a `shortLabel` for phones instead of wrapping.
- **Detail and form pages**: `DetailFrame` renders the back link (status
  role, `size-3` arrow) and the `PageHero`.
- **Rhythm**: `gap-6` between hero and content, `gap-2.5` icon → title,
  `space-y-4` in dialog bodies, `gap-x-6 gap-y-5 py-5` in fact rows.

## Surfaces

- Flat by default. Shadows only respond to state (focus, overlays, menus,
  navbar scroll cue).
- Cards are flat: `bg-card/40`, 1px border, no shadow, no icon box.
- Containers `rounded-xl` (10px); controls `rounded-md` (4px); badges
  `rounded-lg`; `rounded-full` only for dots and bars.
- `border-dashed` only for empty/error/loading blocks.

## Components

The editorial chrome lives in `components/shared/`; `components/ui/` holds
shadcn primitives (Radix, `new-york`) restyled to the tokens.

- **App surfaces** (`lib/app-surfaces.ts`): single registry of page identity
  (href, title/description keys, icon, section). The navbar, sidebar,
  `<title>`, `PageHero` and section overview cards read from it.
- **`PageShell` / `PageHero` / `HeroCount`**: every page starts with the hero:
  flat `size-5` terracotta icon (no box), display title, meta description,
  right-aligned `meta`/`status`/`action` slots.
- **`ResourceOverview`**: shell + hero + optional filters + the
  `QueryState` loading/error/empty cascade. `children` renders success only.
- **`EntityCardGrid` + `EntityListDefinition`**: resource collections
  (playbooks, scripts, devices, groups, credentials, jobs, API keys, users)
  are a responsive grid (`cardGridClass`: 1 column, 2 from `sm`, 3 from
  `lg`, 4 from `xl`, 5 from 1920px — shared with `SurfaceCardGrid`) of flat `rounded-xl border
  bg-card/40 p-5` cards: headline name + meta description with the
  `RowActionsMenu` top-right, fact rows (`MetadataCell`) under a hairline,
  and status tag + quick action at the bottom. Fact rows switch from one to
  two columns with the card's own width (container query), so narrow cards
  never truncate IPs or labels. Hover firms the border; no
  shadow, no icon wells. One definition file per resource under
  `features/<name>/definitions/`. `EntityList` renders the same definition
  as `divide-y` rows and is used for activity feeds (dashboard).
- **`StateCard` / `QueryState`**: dashed placeholder blocks for loading,
  empty, error and filtered-empty states.
- **`StatusDot` / `StatusTag`**: the only way state is drawn outside the run
  console. Tones: `primary` (running/active), `foreground` (ok), `border`
  (inactive/paused), `muted` (skipped), `destructive` (failed).
- **`MetadataList` / `MetadataCell`**: label over value fact rows.
- **`FormDialog`**: every create/edit/manage dialog. `p-0`; header
  `border-b px-6 py-5`; body `space-y-4 px-6 py-5`; footer `border-t px-6
  py-4` with outline cancel and primary submit (spinner while pending).
- **`FormField` / `FieldLabel`**: label role caps over the control.
- **`SurfaceCard`**: only for section overview tiles.
- **Badges**: identifiers only (e.g. a language or a list of hosts in mono),
  never for status or counts.
- **Buttons**: primary terracotta with white text; outline; ghost;
  destructive; `terminal` for controls inside the run console. Disabled is
  `opacity-50 grayscale`.

## Run Console

The command, script run, playbook run and job detail screens share
`features/run/components/terminal-frame.tsx`: title bar, prompt, stream
banner, result banner and optional side panel. The terminal is dark in both
themes and uses only `--terminal-*` tokens (`bg-terminal-bg`,
`text-terminal-ok`, …) and `font-terminal`. Status tones are shared by every
console: `ok`, `changed`, `failed` (also unreachable), `skipped`, `running`
(terracotta).

## Icons

Lucide through `lib/icon-registry.ts` (`getIcon(group, key)`). One canonical
icon per concept, used identically in the navbar, sidebar, hero and rows.
