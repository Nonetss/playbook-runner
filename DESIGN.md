---
name: playbook-runner
description: A quiet-editorial Ansible ops console on monochrome paper with one warm accent.
colors:
  primary: "oklch(0.6724 0.1308 38.7559)"
  brand-orange: "oklch(0.6724 0.1308 38.7559)"
  neutral-bg: "oklch(0.9818 0.0054 95.0986)"
  neutral-fg: "oklch(0.3438 0.0269 95.7226)"
  neutral-muted: "oklch(0.5341 0.0078 97.4503)"
  neutral-card: "oklch(0.9665 0.0067 97.3521)"
  neutral-card-fg: "oklch(0.1908 0.002 106.5859)"
  neutral-border: "oklch(0.94 0.003 97.3627)"
  neutral-input: "oklch(0.92 0.004 98.3528)"
  popover: "oklch(1 0 0)"
  popover-fg: "oklch(0.2671 0.0196 98.939)"
  destructive: "oklch(0.1908 0.002 106.5859)"
  destructive-fg: "oklch(1 0 0)"
  dark-bg: "oklch(0.2679 0.0036 106.6427)"
  dark-fg: "oklch(0.9576 0.0027 106.4494)"
  dark-muted: "oklch(0.7713 0.0169 99.0657)"
  dark-card: "oklch(0.2928 0.0018 106.5092)"
  dark-popover: "oklch(0.3085 0.0035 106.6039)"
  dark-border: "oklch(0.31 0.004 106.8928)"
  dark-destructive: "oklch(0.6368 0.2078 25.3313)"
typography:
  sans:
    fontFamily: "Outfit Variable, Outfit, sans-serif"
  mono:
    fontFamily: "Geist Mono Variable, Geist Mono, ui-monospace, monospace"
  display:
    fontFamily: "Outfit Variable, Outfit, sans-serif"
    fontSize: "1.5rem"         # text-2xl on ResourcePage titles
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Outfit Variable, Outfit, sans-serif"
    fontSize: "0.875rem"
    lineHeight: 1.5
  label:
    fontFamily: "Outfit Variable, Outfit, sans-serif"
    fontSize: "0.75rem"        # text-xs uppercase tracking-wide
    fontWeight: 600
    letterSpacing: "0.05em"
    textCase: "uppercase"
rounded:
  sm: "calc(0.375rem - 4px)"   # 2px
  md: "calc(0.375rem - 2px)"   # 4px
  lg: "0.375rem"               # 6px (radius base)
  xl: "calc(0.375rem + 4px)"   # 10px
  container: "0.75rem"          # 12px — empty states, list shells
spacing:
  px: "0.25rem"                # Tailwind 1 unit
  gap-section: "1.5rem"        # gap-6 / mb-6 between header and content
  padding-page: "1.5rem"       # p-6
  padding-shell: "2rem"        # lg:px-8
components:
  resource-page:
    padding: "{spacing.padding-page}"
    paddingWide: "{spacing.padding-shell}"
  resource-page-title:
    typography: "{typography.display}"
  resource-empty-state:
    backgroundColor: "{colors.neutral-card}"
    borderRadius: "{rounded.container}"
    padding: "3rem 1.5rem"     # py-12 px-6
  resource-form-modal:
    borderColor: "{colors.neutral-border}"
  field-section-label:
    typography: "{typography.label}"
    textColor: "{colors.neutral-muted}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "oklch(1 0 0)"
    borderRadius: "{rounded.md}"
  toast:
    backgroundColor: "{colors.popover}"
    textColor: "{colors.popover-fg}"
    borderColor: "{colors.neutral-border}"
---

# Design System: Playbook Runner

## Overview

**Creative North Star: "The Run Book: operational datasheet."**

Playbook Runner is a quiet-editorial Ansible ops console. Every screen should
read like a typed run book or inventory datasheet: a clear page hero, a
resource list or facts panel, and a calm state column — never a wall of
competing chrome. The personality is **typography-first, monochrome-by-default,
one-accent-by-policy**: hierarchy comes from size, weight, tracking, and
tabular numerals, not from a rainbow of semantic colors. The single warm accent
(Brand Terracotta / `--brand-orange`) is reserved for brand voice, primary CTAs,
and "alive / running" signals. Everything else is the foreground /
muted-foreground / border vocabulary of a printed page.

Density is calm rather than compact. Containers are flat by default (no glows);
depth comes from hairline borders, soft `bg-card` surfaces, and restrained
`rounded-xl` shells for empty states and resource cards. Motion is short and
useful: page fade via Astro transitions, spinner feedback on mutations, and
subtle hover tints — never decorative flourish. Anti-references: "generic
shadcn dashboard with purple gradients", chip clusters in heroes, and surfaces
that invent success/info/warning palettes instead of type + status dots/badges
from the existing token set.

**The Run Book Rule.** Every screen must pass this test: if the design "shows
up" because it adds color, a glow, or a chip cluster, it is almost certainly
out of style. It earns notice by making the eye land on the playbook name, the
host, the cron expression, and the run state — not on the chrome.

**Key Characteristics:**

- Monochrome page; one warm accent reserved for brand / CTA / alive state.
- Hierarchy lives in type, not color.
- Resource pages share one header pattern (`ResourcePage`).
- Hairlines and soft card shells carry structure.
- Live run output is a console surface — denser, mono-forward, still on-token.
- Toasts use popover tokens, never Sonner's default pure black.

## Colors

The palette is a single neutral ramp (paper → ink → mute → border) plus one
warm accent for brand voice and one destructive ramp for irreversible failure.
No freehand semantic colors for success/info/warning beyond what run-status
widgets already encode through existing tokens.

### Primary

- **Brand Terracotta** (`oklch(0.6724 0.1308 38.7559)`): warm, between vermilion
  and ochre, calibrated for daylight paper. Wired as `--brand-orange` and aliased
  to `--primary`, `--ring`, `--sidebar-primary`, `--chart-1`. Reserved for
  (a) brand / hero icons, (b) primary CTAs (`Run`, `Create`, `Save`), and
  (c) "alive / running / enabled" signals.

### Tertiary (Destructive)

- **Editorial Ink** (`oklch(0.1908 0.002 106.5859)`, light theme destructive):
  near-black. Sole use: errors, deletions, irreversible actions. Paired text is
  white (`oklch(1 0 0)`). In dark mode the destructive ramp shifts to a true red
  (`oklch(0.6368 0.2078 25.3313)`) because ink-on-paper invert is otherwise too
  quiet.

### Neutral

- **Paper** (`oklch(0.9818 0.0054 95.0986)`): page background — `--background`.
- **Ink** (`oklch(0.3438 0.0269 95.7226)`): body text — `--foreground`.
- **Mute** (`oklch(0.5341 0.0078 97.4503)`): secondary text, descriptions,
  dates, hints — `--muted-foreground`.
- **Card** (`oklch(0.9665 0.0067 97.3521)`): resource cards, empty shells,
  dashboard panels — `--card`.
- **Card Ink** (`oklch(0.1908 0.002 106.5859)`): high-contrast text on cards.
- **Popover** (`oklch(1 0 0)` light / `oklch(0.3085 0.0035 106.6039)` dark):
  menus, dialogs, and toasts — `--popover`.
- **Border** (`oklch(0.94 0.003 97.3627)`): hairlines — list dividers, dialog
  headers/footers, table rules.
- **Input** (`oklch(0.92 0.004 98.3528)`): resting line of text inputs.

Dark theme mirrors the same roles with a slightly warm dark surface
(`oklch(0.2679 0.0036 106.6427)`) and Brand Terracotta surviving the inversion.

### Named Rules

**The One Accent Rule.** Brand Terracotta appears sparingly: brand/hero icon,
primary CTA, alive-state signal. Prefer rarity over decoration.

**The No-Rainbow Rule.** Do not invent standalone success/info/warning
palettes. Run outcomes use the shared status widgets (`RunStatusBadge` and
friends) on existing tokens; failure is the destructive ramp; everything else
is mute.

## Typography

**Display / Sans:** Outfit Variable (Outfit fallback), `font-sans`.
**Body:** Outfit Variable — same family as display, sized down.
**Mono:** Geist Mono Variable (`font-mono`), reserved for YAML, shell output,
cron expressions, hostnames, IDs, durations, API keys, and any value that needs
`tabular-nums`. Never the default for UI copy.

**Character.** A humanist sans with geometric confidence (Outfit) for prose,
paired with a precise monospace (Geist Mono) for Ansible and ops values. There
is no third face — no serif display, no system font masquerading as a choice.

### Hierarchy

- **Display** (`Outfit`, `text-2xl font-bold tracking-tight`): `ResourcePage`
  titles and equivalent page heroes.
- **Headline** (`Outfit`, `font-medium` / `font-semibold`, `text-base`,
  `tracking-tight`): card titles, dialog titles, section names.
- **Body** (`Outfit`, `text-sm`, `line-height: 1.5`): prose, descriptions, form
  values. Dialog descriptions stay `text-xs` / `text-sm` muted.
- **Label** (section micro-caps: `text-xs font-semibold uppercase tracking-wide`,
  color `muted-foreground`): section headers in forms, run panels, dashboard
  blocks, history tables. This is the recurring signature that ties the product
  together.
- **Mono** (`Geist Mono`, typically `text-xs`, `tabular-nums` when aligning):
  playbook YAML, script bodies, cron strings, ISO timestamps, host keys,
  durations, API tokens.

### Named Rules

**The Tabular-Nums Rule.** Any column or list of numeric/ops values rendered
with `font-mono` should include `tabular-nums` so digits line up.

**The Label-Not-Noise Rule.** Section labels and field captions are typeset as
uppercase microcopy, not as decorative chip clusters. Status may use
`Badge` / `RunStatusBadge` when the domain needs a scannable run state — keep
them small and token-bound.

## Layout

Authenticated product pages sit in a full-width content column under the
navbar: `ResourcePage` applies `p-6 lg:px-8` and owns the title / description /
create CTA. Detail and editor flows (playbook edit, job form, run console) keep
the same horizontal padding rhythm and prefer a readable single column or a
split console (output + inventory) rather than inventing a second max-width
system ad hoc.

Vertical rhythm is `mb-6` / `gap-6` between the page header and content,
`gap-4` between sibling form sections, and tight `gap-2` / `gap-3` inside rows.
Resource grids use responsive card columns (`md:grid-cols-2`, etc.). Spacing
stays on the 0.25rem Tailwind unit.

Sticky chrome: `Navbar` height `--navbar-height: 3.6rem`. Footer height
`--footer-height: 13rem` stacked on mobile, `7.6rem` single-row on `sm+`. The
utility `min-h-main` fills remaining vertical space without hardcoding heights.

Primary product surfaces:

| Area | Routes (examples) |
| --- | --- |
| Dashboard | `/`, `/dashboard` |
| Playbooks | `/playbooks`, `/playbooks/new`, `/playbooks/[id]/edit`, `/playbooks/[id]/run` |
| Scripts | `/scripts`, `/scripts/new`, `/scripts/[id]/edit`, `/scripts/[id]/run` |
| Commands | `/commands` |
| Inventory | `/inventory`, `/inventory/[id]/group` |
| Credentials | `/credentials` |
| Jobs | `/jobs`, `/jobs/new`, `/jobs/[id]`, `/jobs/[id]/edit` |
| History | `/history` |
| Config / me | `/config`, `/me` |
| Auth | `/login`, `/signup` |

## Elevation & Depth

**Flat by default. Borders carry structure.** Shadows exist in the token system
because shadcn/ui needs them, but they are not the everyday vocabulary.
Resource cards and empty states use border + soft card fill; dialogs and
dropdowns may use the small shadow ramp as interaction chrome.

**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadows appear as a
response to state (dialog overlay, dropdown, toast) — not as decoration on
every row.

Depth instead comes from:

1. **Hairlines.** `border-b` on table headers, dialog header/footer rules,
   fact rows.
2. **Tonal layering.** `bg-card`, `bg-muted/40` hover, `bg-primary/10` icon
   wells used sparingly.
3. **Dashed empty.** Empty states use `border-dashed` to read as placeholder.
4. **Focus ring.** Brand Terracotta ring on keyboard focus only.

## Shapes

Containers and empty shells use `rounded-xl` (~12px). Inline controls (button,
input) use the `--radius` step (`0.375rem` base). Icon wells on cards may use
`rounded-md`. Borders are 1px hairlines. `border-dashed` is reserved for empty
/ placeholder blocks.

No decorative clipping (no blob masks, wave dividers, or SVG ornaments).

## Components

Shared product chrome lives under `apps/frontend/src/components/shared/`.
shadcn/ui (`components/ui/**`) provides primitives (Button, Input, Dialog,
Card, Badge, Sonner, …). Feature UI lives under `features/<name>/`.

### Resource Page (`ResourcePage`)

- **Frame:** `<main>` with `p-6 lg:px-8`, full width, `min-w-0`.
- **Header:** title `text-2xl font-bold tracking-tight`, optional muted
  `text-sm` description, one primary create CTA (`Button` + `Plus`).
- **CTA modes:** `onCreate` callback, `createHref` link, or `hideCreate` when
  the feature owns its own actions.
- **Used by:** inventory, credentials, playbooks, scripts, jobs, config lists.

### Resource List State (`ResourceListState`)

- **Loading:** muted inline spinner + copy.
- **Error:** `rounded-xl border border-destructive/30 bg-destructive/5` with
  optional retry.
- **Empty:** `rounded-xl border border-dashed bg-card px-6 py-12 text-center`,
  optional icon in a soft primary well, title, description, one CTA.
- **Ready:** renders `children(items)` — callers own the grid/list layout.

### Resource Form Modal (`ResourceFormModal`)

- **Frame:** shadcn `Dialog` driven by a `ResourceFormDefinition`.
- **Header / body / footer:** standard dialog composition; submit disabled
  while pending.
- **Mono fields:** YAML / key textareas use `TEXTAREA_BASE_CLASS` (`font-mono
  text-xs`).
- **Toasts:** success/error live in the caller via `useResourceMutation` /
  `notifySuccess` / `notifyError` — not inside the modal.

### Resource Cards (feature cards)

Playbook, device, group, credential, script, and job cards compose shadcn
`Card` with:

- Soft icon well (`bg-primary/10 text-primary`, `rounded-md`) — allowed here as
  the card's single accent mark.
- Truncated title + muted meta.
- Actions in a dropdown (`MoreHorizontal`), not a chip cluster.
- Optional small `Badge` for folder / schedule / enabled state — keep compact.

Prefer one consistent card rhythm over mixing free-floating shadow cards and
divide-y lists on the same page.

The shared `ResourceCard` shell in
`apps/frontend/src/components/shared/data-display/resource-card.tsx` owns the
repeated icon-well, title/meta, action slot, and card spacing. Feature cards
keep their domain-specific body content and action menu items as children and
slots; do not recreate the header shell locally.

### Run Console (`features/run`)

- Split operational surface: streaming output + inventory / host scope.
- Output is mono-forward; host rows stay scannable with status tokens.
- Alive/running uses Brand Terracotta. Execution outcomes use domain colors:
  ok (success) = emerald (green), changed (partial) = amber (yellow),
  failed (failure) = red. These colors are Ansible-domain semantics, not invented.
- Shared by playbooks, scripts, and commands — do not fork execution UI into
  those features.

`InventorySelectionList` is the shared group/device selector for run consoles,
commands, run modals, and job scheduling. It owns search filtering, collapsible
sections, selection rows, keyboard interaction, and empty/no-match states;
callers provide translated labels and controlled selection sets.

### Dashboard

- Overview composition: `StatCard` metrics + recent jobs/activity lists.
- Section labels use the uppercase micro-caps signature.
- Quick actions link into playbooks, inventory, credentials, jobs — typographic
  / button CTAs, not promo tiles.

### Toasts (`components/ui/sonner`)

- Position `bottom-right`.
- Map Sonner vars to design tokens: `--normal-bg: var(--popover)`,
  `--normal-text: var(--popover-foreground)`, `--normal-border: var(--border)`.
- Never leave Sonner's dark default `#000` visible.

### Navigation (`features/app-shell`)

- **Navbar:** flat, `bg-background`, height `--navbar-height`.
- Active route via text weight / primary tint — no badge clusters.
- Theme toggle and language switcher stay quiet chrome.
- Guest vs authenticated navbars share the same brand mark ("Playbook Runner").

### Buttons / Inputs

- **Primary:** Brand Terracotta fill, dark ink foreground (WCAG AAA 11:1 contrast), `--radius` corners.
- **Outline / Ghost:** hairline or flat; hover `bg-muted/40` or `bg-accent`.
- **Destructive:** editorial ink (light) / red (dark).
- **Inputs:** border `var(--input)`; focus ring Brand Terracotta.

## Do's and Don'ts

### Do

- **Do** frame list surfaces with `ResourcePage` so title, description, and
  create CTA stay consistent.
- **Do** wrap loading / error / empty through `ResourceListState`.
- **Do** reserve Brand Terracotta for brand marks, primary CTAs, and alive /
  running signals.
- **Do** use Outfit for UI copy and Geist Mono for YAML, cron, hosts, IDs,
  durations, and streamed logs.
- **Do** typeset section headers as uppercase microcopy
  (`text-xs font-semibold uppercase tracking-wide text-muted-foreground`).
- **Do** keep create/edit dialogs on `ResourceFormModal` (or the same dialog
  hairline pattern) unless the flow is a full page form.
- **Do** stream execution through `@/features/run` primitives shared by
  playbooks, scripts, and commands.
- **Do** style toasts with popover tokens via the shared `Toaster`.
- **Do** keep credentials server-side in UX copy and flows — never surface
  private key material in the browser beyond intentional provision scripts.

### Don't

- **Don't** invent purple / blue / green semantic themes for success/info /
  warning outside the existing status widgets.
- **Don't** decorate every icon with a loud colored chip stack; one soft icon
  well per card is enough.
- **Don't** use gradients, glow, or heavy `shadow-xl` on product chrome.
- **Don't** fork run-console UI into playbooks/scripts/commands features.
- **Don't** leave Sonner on its default black dark surface.
- **Don't** add a second page-shell abstraction beside `ResourcePage` without
  need — extend the shared header instead.
- **Don't** put private SSH key contents into client-visible success toasts or
  list rows.
- **Don't** treat `/scalar` or OpenAPI as a product marketing surface — it is
  API documentation chrome.

### Exceptions (per PRODUCT.md)

The style applies to product surfaces (lists, detail, forms, settings, run
console chrome). It does **not** rigidly apply to:

- `components/ui/**` (shadcn base primitives — available building blocks).
- `features/app-shell` chrome (navbar, theme toggle, language switcher) —
  small adjustments permitted.
- Live ansible output panes — denser mono console treatment is expected.
- `/login`, `/signup` — auth forms may stay as focused form surfaces.
- `/scalar`, `/openapi.json` — API documentation tooling, not product UI.
