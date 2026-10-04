## 1. Primitives and helpers

- [x] 1.1 Add `cmdk` to `apps/frontend/package.json` with `bun add cmdk --cwd apps/frontend` (caret range, not a catalog pin) and verify `bun install --frozen-lockfile` passes with the updated `bun.lock`
- [x] 1.2 Create `apps/frontend/src/components/ui/command.tsx` (shadcn new-york `Command*` parts over `components/ui/dialog.tsx`) with an optional `filter` passthrough from `CommandDialog` to the inner `Command`, tokens only (no raw palette colours); verify `bun run --filter frontend check-types`
- [x] 1.3 Create `apps/frontend/src/lib/fold-text.ts` (`foldText`: NFD + strip diacritics + lowercase) and port `lib/recent-surfaces.ts` from `stack` verbatim (limit 5, `recent-surfaces:<userId>`, `try/catch` around every storage access); verify check-types
- [x] 1.4 Make sure `lib/icon-registry.ts` exposes the search icon (`views.search`) and a chevron-right icon; add the chevron under the fitting group if missing; verify check-types

## 2. Registry and projection

- [x] 2.1 Leave `apps/frontend/src/lib/app-surfaces.ts` unchanged (no `adminOnly`/`search` flags, no role filtering); verify `git diff` shows no change to it
- [x] 2.2 In `features/app-shell/site-nav.ts`, add `SiteNavSearchItem`/`SiteNavSearchGroup` and `getSearchableSurfaces()` (key-based: "General" group first with the surfaces outside `appSections`, then one group per section with its hub first and children in order; `trailKeys` = section title key for children) plus `getCurrentSearchHref(pathname, hrefs)` (longest `isNavLinkActive` match); verify check-types
- [x] 2.3 Add the search copy to `apps/frontend/src/locales/es/nav.json` and `en/nav.json` under `search.*`: trigger label, placeholder, dialog title/description, empty state, "current page" sr text, and headings `general`, `recent`, `playbooks`, `scripts`, `jobs`, `groups`; verify both files have the same keys

## 3. Record sources

- [x] 3.1 Create `features/app-shell/model/surface-search-sources.ts` with `defineSearchSource<TData>` and the four sources of design decision 3 (`playbooks` → `/playbooks/<id>/edit`, `scripts` → `/scripts/<id>/edit`, `jobs` → `/jobs/<id>`, `groups` → `/inventory/<id>/group`), each reusing `orpc.<feature>.list.queryOptions({ enabled, select })` with the list page's unchanged key; verify check-types fails when a `select` reads a field the procedure doesn't return, then revert
- [x] 3.2 Create `features/app-shell/hooks/use-surface-search-records.ts` (`useQueries` over the sources with `enabled: open`; one group per source with data; icon and trail from the source's surface; keywords = surface and section title keys; pending/failed → no group); verify check-types

## 4. Components

- [x] 4.1 Port `SurfaceSearchLabel` to `features/app-shell/components/surface-search-label.tsx` (muted trail crumbs › label via `textVariants`); verify check-types
- [x] 4.2 Port `NavbarSearchTrigger` to `features/app-shell/components/navbar-search-trigger.tsx`: `field` (input-looking outline button, search icon, localized "Search…", `<kbd>` `⌘K`/`Ctrl K`, `aria-keyshortcuts`, ~`w-52`) and `icon` (`navTriggerClass` button with localized `aria-label`, like the other navbar actions); verify check-types and Biome
- [x] 4.3 Port `SurfaceSearchDialog` to `features/app-shell/components/surface-search-dialog.tsx` per design decision 5: every-word `matchSurface` with `foldText`, keys resolved with `useTranslation("nav")`, Recent group (`recent:<href>`, current page excluded, hidden while typing), page groups, record groups only with a non-empty query, current result marked with `StatusDot` + sr text (records included), `⌘K`/`Ctrl+K` listener that skips `Alt` and already `defaultPrevented` events, close-then-`navigate`, recents recorded only for exact page hrefs; verify check-types and Biome

## 5. Navbar wiring and layout

- [x] 5.1 In `navbar-authenticated.tsx`, switch the desktop `<nav>` to `lg:grid lg:grid-cols-[auto_1fr_auto]`: brand `lg:justify-self-start`, then a `hidden lg:flex lg:justify-self-start` block with a vertical `Separator` (`h-5 w-px self-center`) followed by the `NavigationMenu` (no longer centred), then the desktop actions `lg:justify-self-end`; keep the `< lg` flex row unchanged; verify visually at 1024px and 1440px that sections start after the separator, actions sit at the right, and the first section's dropdown doesn't clip the left edge (switch its content to start alignment if it does)
- [x] 5.2 Add one `searchOpen` state, the `icon` trigger right after `UserNav` in the `< lg` actions and the `field` trigger right before `UserNav` in the `lg+` actions, and one `SurfaceSearchDialog` (`currentPath`, `userId = user.id`) for every user, whatever their role; verify check-types and that the guest navbar is untouched

## 5b. Settings as a navbar entry

- [x] 5b.0 Rename the `/config` page to "API keys" (its only content) in `nav:links.config`, `nav:descriptions.config` and `config:page.title`, es and en; keep the `/config` URL
- [x] 5b.1 In `features/app-shell/site-nav.ts`, append the `config` surface to `siteNavItems` as a standalone entry (no `section`, no `subItems`) after the sections; remove `SettingsLink` from both navbar action rows, delete `settings-link.tsx` and its barrel export; verify check-types and that `/config` shows the entry highlighted
- [x] 5b.2 Extend the E2E suite: the desktop navbar shows an "API keys" link after Bash that navigates to `/config` and no settings icon button; the slide-out menu lists "API keys"; verify with `bun run test:e2e`

## 6. Tests and docs

- [x] 6.1 Add `apps/frontend/tests/surface-search.spec.ts` (authenticated project): `Ctrl+K` opens and closes the dialog; "programatico" lists API keys; "ansible historial" lists Historial and no Bash page; selecting a result navigates; "usuarios" lists Usuarios; empty query shows no record groups; a no-match query shows the empty state; Recent lists visited pages; and on mobile the icon trigger opens the dialog. Verify with `bun run test:e2e` (backend running with the seeded admin)
- [x] 6.2 Add to `AGENTS.md` (frontend section) a line on the navbar search: pages come from `app-surfaces.ts`, records from `features/app-shell/model/surface-search-sources.ts` (one entry per record type, reusing the list query key), copy under `nav:search.*`; verify every cited path exists

## 7. Validation

- [x] 7.1 Run `bun run check-types`, `bunx biome ci .`, `bun run test` and `openspec validate add-navbar-surface-search --strict`, and report the results
- [x] 7.2 Ask the user to check in the browser: navbar layout (separator + left-aligned sections, actions at the right) at 1024px and wide, field trigger and `⌘K`/`Ctrl+K`, icon trigger on mobile, accent-insensitive and multi-word search in both languages, records for playbooks/scripts/jobs/groups, Recent after visiting a few pages, and that `Ctrl+K` inside the playbook/script editor still behaves
