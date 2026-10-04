## Why

Reaching a page today means opening a section menu in the navbar (or the slide-out menu on small viewports) and, to open one playbook, script, job or group, also scanning its list. The sibling `stack` project already solved this with a `⌘K` command palette driven by its surface registry; `lib/app-surfaces.ts` here already knows every page's title, description and icon, so the same search can be ported with no per-page declarations.

## What Changes

- Port the `stack` navbar search ("surface search") to the authenticated navbar: a search-field-looking trigger on large viewports and an icon-only trigger below them, both opening one command palette dialog. `⌘K` / `Ctrl+K` toggles it from any authenticated page.
- The palette lists every page registered in `app-surfaces.ts`, grouped like the navigation (a "General" group for the pages outside a section, then one group per section: Inventory, Ansible, Bash, hub first). Every user sees every page: the search applies no role filtering. Labels, descriptions and headings come from the `nav` i18n namespace, so the palette follows the active language.
- Matching is case- and accent-insensitive, and every word of the query must match some text of the result (its label, description, section and trail), so "configuracion" finds "Configuración" and "ansible historial" finds the run history.
- Once the user types, the palette also lists records the user can open, loaded from the existing list procedures while the dialog is open and sharing their TanStack Query cache: playbooks (→ `/playbooks/<id>/edit`), scripts (→ `/scripts/<id>/edit`), scheduled jobs (→ `/jobs/<id>`) and inventory groups (→ `/inventory/<id>/group`). Typing a section's name ("playbooks") lists its records.
- A "Recent" group, stored per user in `localStorage`, suggests the last five pages visited while the query is empty.
- Selecting a result closes the dialog and navigates with the View Transitions–aware `navigate()`; the current page is marked.
- Align the desktop navbar like `stack`: the section links move from the centre to the left, right after the brand and divided from it by a vertical hairline separator, and the actions (search field, language, theme, settings, account) stay at the right. This also leaves room for the search field.
- Not ported from `stack`: the server-searched source mechanism (`defineServerSearchSource`, debounced `search` procedures, trigram recipe). Every searchable entity here is listed in full; run history is paginated but has no detail page.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `web-navigation`: adds the navbar surface search (triggers, shortcut, which pages are listed, record results, recent pages, matching and navigation) and the desktop navbar arrangement (brand, separator, left-aligned sections, actions at the right).

## Impact

- `apps/frontend/package.json` + `bun.lock`: new `cmdk` dependency (the palette primitive behind shadcn's `Command`).
- `apps/frontend/src/components/ui/command.tsx`: new shadcn (new-york) `Command` primitive, with a `filter` passthrough on `CommandDialog`.
- `apps/frontend/src/features/app-shell/`: search projection, record sources, records hook, trigger, dialog and label components; `navbar-authenticated.tsx` mounts them.
- `apps/frontend/src/lib/fold-text.ts` and `lib/recent-surfaces.ts`: new helpers.
- `apps/frontend/src/locales/{es,en}/nav.json`: search copy and group headings.
- `apps/frontend/tests/`: a Playwright spec for the palette.
- `AGENTS.md`: one line on the search and how a record source is added.
- No backend, API, database or migration changes; the record sources reuse `playbooks.list`, `scripts.list`, `jobs.list` and `inventory.groups.list` as they are.
