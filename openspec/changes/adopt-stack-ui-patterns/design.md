## Context

The frontend already has a durable quiet-editorial visual system, an
`AppProviders` wrapper for each Astro React island, `ResourcePage`,
`ResourceListState`, `ResourceFormModal`, and a flat source of truth for the
top navigation. Those primitives cover the first generation of resource
screens, but feature code still recreates card-list shells, overflow action
menus, state markers, filters, and detail-page load/error/empty states.

The sibling `stack` repository evolved the same Astro/React/Tailwind base into
small composable primitives. This change adopts those patterns while keeping
Playbook Runner's i18n, resource CRUD behaviour, existing QueryClient
singleton, and live Ansible console intact.

## Goals / Non-Goals

**Goals:**

- Establish shared, localized UI primitives for page headers, query states,
  card lists, row actions, status text, search, filters, and form chrome.
- Consolidate navigation metadata so desktop, mobile, and any future section
  navigation derive their labels, descriptions, icons, and active state from
  one localized definition.
- Improve visual continuity through scoped motion, stable scrollbars,
  touch-size affordances, and a reduced-motion-safe theme reveal.
- Migrate the existing resource and history surfaces without changing routes,
  resource operations, API contracts, or Ansible execution semantics.

**Non-Goals:**

- Adding chat, Markdown, agent services, admin domains, Loki, sidebars, or
  dependencies whose only use is a `stack` product feature.
- Replacing `AppProviders`, i18next, the `@playbook-runner/env` package, or
  the existing E2E suite.
- Changing database schema, generating migrations, or editing migrations.
- Replacing the existing design system's palette, typography, or live console
  status colours.

## Decisions

### Composable shared UI, preserving the island provider

Add `PageShell` and `PageHero` as presentation-only components. `PageShell`
will not mount a QueryClient provider because this project also needs i18n and
confirmation context; feature entry points will continue to use
`AppProviders`. `ResourcePage` becomes a compatibility composition over the
new frame/header so the common CRUD pages can migrate incrementally.

`StateCard` and `QueryState` complement rather than replace
`ResourceListState`: the latter remains a convenient array-list facade,
implemented using the shared state visual, while the former accepts a query
shape for details and non-list data. This avoids forcing a list abstraction
onto history, forms, and detail screens.

Alternative considered: copy `stack`'s `QueryProvider`-inside-`PageShell`.
It would bypass `I18nProvider` and `ConfirmProvider` in this repository, so it
is rejected.

### Reuse repeated presentation patterns only

Introduce `SoftCardList`, `RowActionsMenu`, `StatusDot`/`StatusTag`,
`SearchInput`, `CollapsibleFilters`, and a simplified shared form-dialog
shell. Each is based on repeated visual and interaction patterns in the
resource features. Feature-specific cards, inventory relations, run status
badges, and CodeMirror remain feature-owned.

Alternative considered: a universal table/card abstraction. It would hide
meaningful differences between inventory, playbooks, and execution history,
so only the clearly repeated shells are extracted.

### Localized navigation metadata

Extend `site-nav.ts` with stable identifiers, icon components, localized key
paths, optional descriptions, optional sub-items, and an overflow priority.
Navbar consumers resolve all copy through `useTranslation("nav")`; no English
or Spanish UI copy is embedded in the metadata. On large screens primary
sections are visible; lower-priority sections enter an accessible “more” menu
at constrained desktop widths and return at wider widths. Mobile renders all
sections and their sub-items in the existing sheet.

Alternative considered: pass pretranslated labels from Astro to the React
navbar. Icon components and locale changes cannot cross the Astro island
boundary reliably, and this would duplicate nav structure, so the React
consumer reads the shared metadata itself.

### Scoped progressive enhancement for polish

Replace broad global interactive transitions with targeted component and
utility-level transitions. Add stable, thin scrollbars; coarse-pointer hit
area expansion for icon buttons; `dash-enter`/`dash-pop` entrance utilities;
and an optional View Transition theme reveal. All new motion is disabled or
falls back cleanly under `prefers-reduced-motion`; browsers without View
Transitions retain the immediate theme switch.

Existing Astro page transitions remain. The live run console keeps its
deliberately dense console UI and is not given list-entry animation.

## Risks / Trade-offs

- [Shared components can become generic wrappers] → Keep props narrow and
  migrate only patterns observed in three or more feature uses.
- [Navigation overflow can obscure a route] → Preserve every item in the
  mobile menu and use an accessible labelled menu trigger on desktop.
- [New copy can fall out of locale parity] → Add all labels/descriptions to
  both `en` and `es`, then run the existing translation coverage script.
- [Motion may interfere with operational scanning] → Limit it to initial
  entry of ordinary cards and disable it for reduced motion and run output.
- [Broad refactoring can cause visual regressions] → Keep `ResourcePage` and
  `ResourceListState` compatibility APIs while migrating callers in batches.

## Migration Plan

1. Add the new shared components, localized nav metadata, and scoped CSS
   utilities without removing compatibility exports.
2. Move resource list/detail pages and repeated action menus onto the shared
   primitives, retaining existing data hooks and mutation handlers.
3. Replace navbar rendering with the metadata-driven responsive composition.
4. Run translation coverage, frontend type checking, Biome, and the existing
   non-E2E checks. No E2E test files or configuration are changed.
5. Roll back by reverting the frontend-only change; no persisted state or API
   migration is involved.
