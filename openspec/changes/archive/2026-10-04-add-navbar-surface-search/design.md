## Context

The reference implementation is `stack` (`/home/nonete/code/stack`), built over three archived changes there (`navbar-surface-search`, `search-dynamic-surfaces`, `server-searched-surface-sources`). Its pieces: `SurfaceSearchDialog` (cmdk `CommandDialog`, every-word `matchSurface`, `⌘K` listener, recents), `NavbarSearchTrigger` (`field` / `icon`), `SurfaceSearchLabel` (muted trail › label), `getSearchableSurfaces` in `lib/site-nav.ts`, a typed search-source registry plus `useSurfaceSearchRecords`, and `lib/recent-surfaces.ts` / `lib/fold-text.ts`.

`playbook-runner` differs in ways that shape the port:

- **Registry shape.** `lib/app-surfaces.ts` holds only concrete pages (`href`, `titleKey`, `descriptionKey`, `icon` as a `LucideIcon` component). There is no `parentId`, `path` with `[param]` or `search` flag; sections are declared separately in `appSections` (`inventory`, `ansible`, `bash` → child ids). Dynamic routes (`/playbooks/[id]/edit`, `/jobs/[id]`, …) are not registered at all.
- **i18n.** Titles and descriptions are `nav` namespace keys resolved with `react-i18next` (`es` default, `en`); `stack` hardcodes Spanish.
- **Navbar.** `features/app-shell/components/navbar-authenticated.tsx` is a `client:only` island wrapped in `AppProviders` (i18n + the singleton `QueryClient`), already tracks the path with `useCurrentPath` and receives the full `user`. Section links are centred (`flex-1 justify-center`); actions use `navTriggerClass` icon buttons.
- **Missing building blocks.** No `cmdk`, no `components/ui/command.tsx`, no `Hint` (tooltips are `components/ui/tooltip.tsx`), no `fold-text`. `StatusDot`, `Separator`, `textVariants` (roles include `compact`, `data`, `meta`) and `navigate()` exist.
- **Records.** Every entity with a detail route is listed in full: `playbooks.list`, `scripts.list`, `jobs.list`, `inventory.groups.list` (all `{ id, name, description | null, … }`), already used through `orpc.<feature>.list.queryOptions()` by the list pages and by the navbar's prefetch.

## Goals / Non-Goals

**Goals:**

- Same behavior and look as `stack`'s palette, adapted to this registry, i18n and design tokens.
- A new page in `app-surfaces.ts` becomes searchable with no further declaration; a new record type is one registry entry.
- Record lists share the list pages' query keys (no duplicate cache entries, mutations' invalidations apply).

**Non-Goals:**

- The server-searched source path (`defineServerSearchSource`, `serverSearchQuery`, debounced text, `search` procedures, `pg_trgm`). No paginated entity here has a detail page, so it would ship with no consumer.
- Devices, credentials, commands and runs as records (no detail page to open).
- Actions in the palette ("run playbook", "switch theme"), ranking beyond render order.
- Any role-based filtering: every authenticated user gets the search and every page (decided with the user).

## Decisions

### 1. Projection in `features/app-shell/site-nav.ts`, not in `lib/`

Add `SiteNavSearchItem` (`href`, `labelKey`/`descriptionKey` *or* resolved `label`/`description`, `icon`, `sectionKey?`, `trailKeys?`, `keywords?`) and `getSearchableSurfaces()` next to `siteNavItems`, which already owns every navigation projection here. Grouping follows `appSections`: surfaces not in any section (dashboard, config, me, adminUsers) go in a leading "General" group; each section gets a group headed by its own title, with the section hub first and its children in `appSections` order. Every surface reachable once, so a child appears only in its section group.

The projection stays key-based (no `t()` inside), like `siteNavItems`; the dialog resolves keys with `useTranslation("nav")` at render, so a language switch re-labels and re-matches without rebuilding the projection.

*Alternative:* resolve labels in the projection — rejected, it would need `t` passed in and memoised per locale for no gain.

### 2. No registry flags, no role filtering

`stack`'s `adminOnly` and `search: false` are not ported. Login/signup/404 aren't registered here, and every user gets the search with every registered page; `app-surfaces.ts` doesn't change.

### 3. Record sources: parent surface + href builder, not route templates

`stack` registers dynamic surfaces (`/crons/[id]`) and fills `[param]`s. Here dynamic routes aren't in the registry, and adding them would leak into `siteNavItems`, `PageHero` and the section sidebar. Instead, `features/app-shell/model/surface-search-sources.ts` declares a typed list of sources:

```ts
defineSearchSource({
  id: "playbooks",
  surface: "playbooks",             // SurfaceId: icon, trail and fallback description
  headingKey: "search.groups.playbooks",
  href: (id) => `/playbooks/${encodeURIComponent(id)}/edit`,
  queryOptions: ({ enabled }) =>
    orpc.playbooks.list.queryOptions({
      enabled,
      select: (rows) => rows.map((r) => ({ id: r.id, label: r.name, description: r.description ?? undefined })),
    }),
})
```

Sources: `playbooks` (→ `/playbooks/<id>/edit`, git playbooks open read-only there), `scripts` (→ `/scripts/<id>/edit`), `jobs` (→ `/jobs/<id>`), `groups` (→ `/inventory/<id>/group`). The record's trail is derived from its surface: its section title (if any) and the surface title (`Ansible › Playbooks › <name>`), and those titles are its match keywords, so typing "playbooks" lists every playbook. `defineSearchSource<TData>` keeps `select` typed against the procedure output and erases the type in one place, as in `stack`. `queryOptions` keeps the list page's exact key (no input, no extra options besides `enabled`/`select`), so `select` runs per observer and the cache stays the raw list.

*Alternative:* register the dynamic routes in `app-surfaces.ts` with a `searchSource` key, as `stack` does — rejected for the leak above; revisit if detail pages ever join the registry.

### 4. Loading hook

`features/app-shell/hooks/use-surface-search-records.ts` runs `useQueries` over the sources with `enabled: open` and returns record groups (one per source with data, `href` from the source, icon from the surface). Pending or failed queries yield no group. The default `staleTime` (60 s) and shared keys mean an already-loaded list (or the navbar's hover prefetch) costs no request. No `useDebouncedValue`: nothing is queried per keystroke.

### 5. Dialog and matching (ported as-is, plus i18n)

`features/app-shell/components/surface-search-dialog.tsx` ports `stack`'s component: `CommandDialog` with `filter={matchSurface}`, controlled `CommandInput`, sr-only title/description, `CommandEmpty`, Recent group (values `recent:<href>`, hidden while typing), page groups, record groups only while the query is non-empty, `StatusDot` + sr-only "(current page)" on the current result, `⌘K`/`Ctrl+K` document listener (ignores `Alt`, `preventDefault`), close-then-`navigate` on select. Each `CommandItem` gets `value = href` and `keywords` = resolved label, description, section title, trail titles and extra keywords. `matchSurface` folds the query with `foldText`, splits on whitespace and returns 1 only when every word is contained in some folded keyword (binary score so cmdk keeps render order). The current result is the most specific matching href (same rule as `isNavLinkActive`, longest wins), including record hrefs. All copy lives in `nav.json` under `search.*` (`es` and `en`).

`SurfaceSearchLabel` is ported for the `Section › Title` rendering, using `textVariants({ role: "compact", tone: "muted" })` and the registry's chevron icon.

### 6. Command primitive and dependency

Add `cmdk` to `apps/frontend/package.json` (plain caret range, like `radix-ui`; not a catalog pin) and the shadcn new-york `components/ui/command.tsx` built on the existing `components/ui/dialog.tsx`, with `stack`'s additive `filter` passthrough on `CommandDialog`. Only tokens, no raw palette colours (DESIGN.md).

### 7. Triggers and navbar layout

`features/app-shell/components/navbar-search-trigger.tsx` ports `stack`'s two variants: `field` (outline button reading as an input, search icon, muted "Search…" via `textVariants`, `<kbd>` with `⌘K`/`Ctrl K` detected client-side, `aria-keyshortcuts`, fixed compact width ~`w-52`) and `icon` (a `navTriggerClass` button with a localized `aria-label`, like `SettingsLink` and `ThemeToggle`, which carry no tooltip).

The navbar adopts `stack`'s desktop arrangement: at `lg+` the `<nav>` becomes a `grid-cols-[auto_1fr_auto]` grid — brand (`justify-self-start`), then a left-aligned block holding a vertical `Separator` (`h-5 w-px self-center`) and the `NavigationMenu`, then the actions (`justify-self-end`): language, theme, search field and account, so the search sits next to the account button. Below `lg` the layout stays the current flex row and the `icon` trigger goes right after the account button, before the mobile menu, as in `stack`. Settings stops being an action: `siteNavItems` appends the `config` surface as a standalone entry (no `section`, no `subItems`) after the sections, which `NavSection` already renders as a plain pill link and the slide-out menu as a top-level link; `SettingsLink` is deleted. `config` stays out of `appSections`, so it gets no section sidebar and stays in the search's General group.

`NavbarAuthenticatedInner` owns one `searchOpen` state and renders one `SurfaceSearchDialog` (already inside `AppProviders`, so no extra provider).

### 8. Recents

`lib/recent-surfaces.ts` is ported verbatim (limit 5, key `recent-surfaces:<userId>`, every access in `try/catch`). The dialog records `currentPath` only when it is exactly a listed page href.

## Risks / Trade-offs

- [Section dropdowns anchored at the left edge] → `NavigationMenuContent` is centred under its trigger (`left-1/2 -translate-x-1/2`); with the sections now near the brand, the first dropdown can cross the viewport's left edge. Checked at 1024px and 1440px: the centred Inventario dropdown starts at x ≈ 112px, so the dropdowns stay centred under their trigger.
- [Desktop field crowds the bar at exactly `lg`] → Three sections plus five actions fit with the field at `w-52`; fall back to the icon variant until `xl` if the visual check says otherwise.
- [`⌘K` collides with another shortcut] → None exists in `src`; the code editor (CodeMirror/Monaco) may bind `Ctrl+K` chords — the listener runs on `document`, so check the playbook/script editor still behaves and stop the shortcut when the event was already `defaultPrevented`.
- [Whole lists loaded client-side] → Fine at current volumes; the dropped server-search path in `stack` is the documented way out if an entity grows.
- [Locale switch while open] → Labels resolve at render via `t`, so the dialog re-renders with the new language.

## Migration Plan

Frontend-only and additive (one new npm dependency). No API, database or migration changes. Rollback = revert the commit.
