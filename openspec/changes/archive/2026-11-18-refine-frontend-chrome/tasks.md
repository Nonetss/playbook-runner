## 1. Light palette

- [x] 1.1 Compute WCAG contrast for `--muted-foreground`, `--secondary-foreground`, `--foreground` and `--primary` over the proposed new fills (`--background`, `--card`, `--muted`, `--secondary`, `--popover`, `--sidebar`) and record the ratios in the commit message; verify every pair the spec names is at least 4.5:1, adjusting a foreground token (not a fill) if one is not
- [x] 1.2 Update the light `:root` values in `apps/frontend/src/styles/global.css` per the table in `design.md` (background, popover, secondary, accent, muted, border, input, sidebar, sidebar-accent, sidebar-border) leaving `.dark` and `--terminal-*` untouched, and verify `git diff` shows only those lines
- [x] 1.3 Search `src/features` and `src/components` for hard-coded fills that assumed the old near-white page (`bg-white`, raw `oklch(1 0 0)`, `bg-popover` used as a page fill) and verify none remain beyond the theme-safe token rule
- [x] 1.4 Review the dashboard, a resource list, a form dialog, the run console (must be unchanged), the login page and the section sidebar in both themes in the running app, and verify hairlines are visible and the dark theme is identical to before
- [x] 1.5 Run `bun run check-types`, `bun run check` and `bun run test` and verify they pass

## 2. Display role

- [x] 2.1 Set `--font-size-display` to `1.125rem` and list every consumer (`PageHero`, `StateCard` celebrate tone, any `text-display`/`role: "display"`), verifying with a search that the list matches what is rendered
- [x] 2.2 Make the `FormDialog` title use the `display` role and verify with its unit test (`tests/unit/components/form/form-dialog.test.tsx`) that the title still renders with its accessible name and the dialog still opens as a bottom sheet on phones
- [x] 2.3 Check heroes with long entity names and dialogs with two-line titles at phone and desktop width, and verify nothing clips or loses its `1.2` line height
- [x] 2.4 Run `bun run check-types` and `bun run test --filter=frontend` and verify they pass

## 3. Shared navigation primitives

- [x] 3.1 Add `components/shared/navigation/menu-item-text.tsx` (compact medium label over a muted description clamped to two lines) and verify it type-checks and renders through `Text`
- [x] 3.2 Add `components/shared/navigation/navbar-pill.tsx` (`NavbarPillLink`, `NavbarPillTrigger`) carrying the existing pill and active/inactive trigger overrides unchanged, and verify the navbar renders the same pills after it uses them
- [x] 3.3 Add `components/shared/navigation/navbar-action.tsx` (`NavbarAction`, `NavbarActionLink`: `rounded-lg`, `bg-background/60`, no resting shadow, `border-primary/30` on hover or open, `size-11 lg:size-9`) and verify with a type-check that it accepts `DropdownMenuTrigger asChild` and a sheet trigger
- [x] 3.4 Move `theme-toggle.tsx`, `language-switcher.tsx`, `navbar-search-trigger.tsx` (icon variant), `user-nav.tsx` and the mobile menu trigger from `navTriggerClass` to `NavbarAction`, delete `features/app-shell/nav-trigger.ts`, and verify no import of it remains and the navbar renders every action identically sized

## 4. Navigation dropdown

- [x] 4.1 Update `components/ui/navigation-menu.tsx` panel and link styling to the spec (rounded panel, `bg-popover`, light shadow plus `ring-1 ring-foreground/10`, 0.35s ease-out, `primary/10` hover and active tint) and verify the other consumers of the wrapper, if any, still render
- [x] 4.2 Turn the shared viewport on for the section menu in `navbar-authenticated.tsx` (drop `viewport={false}`), give each section's content `w-72`, and verify in the running app that moving between two section triggers morphs one panel
- [x] 4.3 Render the section hub row in the accent colour with a hairline separator and the sub-page rows with a neutral icon that turns primary when active, using `MenuItemText`, and verify the active sub-page, a nested route and `/config` mark the right row and pill
- [x] 4.4 Verify `prefers-reduced-motion` removes the size and position animation of the panel and that keyboard open (Enter, arrows, Escape) still works
- [ ] 4.5 Verify the navbar at exactly 1024px in Spanish and English: every section still fits inline; if one does not, mark the least important section non-primary so the existing overflow rule in `web-navigation` applies, and note the outcome in the task
- [x] 4.6 Update `tests/unit/features/app-shell/site-nav.test.ts` only if navigation data changed, then run the navigation and surface-search E2E specs on demand and verify they pass

## 5. Hints

- [x] 5.1 Add `components/shared/feedback/hint.tsx` (`label`, `side`, `align`, 300ms delay, its own `TooltipProvider`) and a unit test under `tests/unit/components/feedback/` that asserts the hint opens on focus, shows the label and leaves the control's `aria-label` intact
- [x] 5.2 Wrap every navbar action in `Hint` and verify the language and account menus still open from keyboard and pointer and that the hint closes when the menu opens
- [x] 5.3 Remove the native `title` from the back-to-top button, wrap it in `Hint`, and verify it keeps its `aria-label`
- [x] 5.4 Render the `StatusTag` `title` through `Hint` and verify its existing unit coverage (if any) still passes and a banned-user reason shows on hover
- [x] 5.5 Audit `src/features` and `src/components` for icon-only controls (`size="icon"`, `icon-sm`, `icon-xs`, button with only an `aria-label` and an icon) and wrap them in `Hint`, listing the files changed in the commit message and verifying with the same search that no unwrapped icon-only control remains
- [x] 5.6 Verify no touch-only flow depends on a hint (search the audited controls for ones with no other visible cue) and run `bun run check-types`

## 6. Keycaps and the search legend

- [x] 6.1 Add `components/ui/kbd.tsx` (`Kbd`, `KbdGroup`) and verify with a unit test that a key renders inside a `<kbd>` and a group lists several keys
- [x] 6.2 Replace the hand-styled `<kbd>` in `navbar-search-trigger.tsx` with `Kbd` and verify the `⌘K` / `Ctrl K` text is unchanged
- [x] 6.3 Add a `CommandFooter` slot to `components/ui/command.tsx` and render the arrows / enter / escape legend in `surface-search-dialog.tsx` with `hidden sm:flex` and `aria-hidden`, and verify the legend is absent below `sm` and present from it
- [x] 6.4 Add the legend labels to `nav:search.*` in `src/locales/es/nav.json` and `src/locales/en/nav.json` and verify both locales render and the existing i18n key-parity check passes
- [x] 6.5 Run the surface-search E2E spec on demand and verify it passes, including opening with `⌘K`/`Ctrl+K`, typing, `Enter` and `Esc`

## 7. Toaster

- [x] 7.1 Add success, info, warning, error and loading icons to `components/ui/sonner.tsx` from the icon registry, adding a registry key only if one is missing, and verify `tests/unit/lib/icon-registry.test.ts` passes
- [x] 7.2 Verify in the running app that a toast keeps the new icon and switches theme while visible (the existing `useTheme` observer should already do it), and that the loading icon spins

## 8. Documentation and specs

- [x] 8.1 Update `apps/frontend/DESIGN.md`: the light colour values, the `display` size in the typography roles, the Layout/shell paragraph (shared dropdown panel), the Navigation subsection (pill, dropdown with hub row, `NavbarAction`), and a short "Hints and keycaps" subsection; verify with a search that no remaining text still says `1.75rem` for display or "panel centred under its trigger"
- [x] 8.2 Update the `Shell` and `Surfaces` bullets in `AGENTS.md` only where they state superseded facts (navbar structure, shadows), and verify with `git diff` that nothing else changed
- [x] 8.3 Run `openspec validate refine-frontend-chrome --strict` and verify it passes
- [ ] 8.4 Run the full gate: `bunx biome ci .`, `bun run check-types`, `bun run test`, then the Playwright suite on demand (`bun run test:e2e`), and verify every command finishes green
- [x] 8.5 Tell the user which README and site screenshots (`img/`) are now stale so they can retake them; do not regenerate them in this change
