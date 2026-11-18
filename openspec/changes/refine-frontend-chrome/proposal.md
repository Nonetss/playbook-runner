## Why

The frontend's chrome and a handful of shared components read flatter and less finished than the design system intends. The light page background is almost white, hairlines (`--border`) are barely visible, popovers are pure white, page titles are oversized next to the rest of the typographic scale, the navigation dropdowns are plain lists with no distinction between "go to the section" and "go to a sub-page", icon-only controls rely on the browser's native `title` (or nothing), and the search dialog gives no hint that it is keyboard-driven. Structure depends on size and weight alone, so the quiet-editorial direction in `DESIGN.md` is only half legible.

## What Changes

**Palette and type**

- **Light palette**: darken the light-theme neutrals so the page reads as paper and hairlines read as hairlines: `--background`, `--popover` (no longer pure white), `--secondary`, `--muted`, `--accent`, `--border`, `--input` and the sidebar tokens (`--sidebar`, `--sidebar-accent`, `--sidebar-border`). The dark theme keeps its values.
- **Display role**: reduce `--font-size-display` from `1.75rem` to `1.125rem`, so page titles lead through weight and tracking instead of size. Dialog titles in `FormDialog` adopt the `display` role so they stay consistent with page titles.

**Navbar**

- **Navigation dropdowns**: a fixed-width panel (`w-72`) with a light shadow plus a `ring-1` hairline; the first row is a section "hub" written in the accent colour and separated from the sub-pages by a hairline; rows use the `primary/10` tint for hover and active, with the icon turning primary only when active; descriptions wrap to two lines instead of forcing one wide line.
- **Shared dropdown panel**: use Radix's shared viewport so moving between sections morphs one panel instead of closing and reopening independent panels.
- **Navbar actions**: language, theme, search (icon variant), account and mobile-menu triggers become one `NavbarAction` primitive: `rounded-lg`, translucent background, no resting shadow, a primary-tinted border on hover or open, `size-11` on touch widths and `size-9` from `lg`.
- **Extraction**: the pill, action and menu-row text styles move out of `navbar-authenticated.tsx` into shared navigation primitives (`NavbarPill`, `NavbarAction`, `MenuItemText`).

**Shared components**

- **`Hint`**: a tooltip wrapper that names an icon-only control (hover and focus, short delay, touch devices never show it). Applied to every navbar action, the back-to-top button (replacing its native `title`), the `StatusTag` explanation and the other icon-only controls found by an audit of `src/features` and `src/components`.
- **`Kbd` / `KbdGroup`**: one keycap primitive replacing the hand-styled `<kbd>` in the search trigger.
- **Search dialog legend**: from `sm`, a footer strip under the results listing the keys (↑↓ navigate, ↵ open, esc close), built from `Kbd`, with localized copy under `nav:search.*`.
- **Toaster**: per-state icons (success, info, warning, error, loading) from the icon registry, and the toaster follows the `dark` class like the rest of the app.

**Documentation**: `apps/frontend/DESIGN.md` (colour values, `display` size, shell, navigation, surfaces, a new "Hints and keycaps" note) and the OpenSpec specs are updated in the same change.

**Not changed**: the page-surface registry, routes, API, database, the sticky positioning of the navbar, the dark palette, the `--terminal-*` run-console tokens, the section sidebar, and the shadcn primitives themselves (buttons, inputs, badges, dialogs, tables, tabs, selects already follow the design rules, with touch targets and i18n that must be kept). No change of component library.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `design-system`: adds the light-theme paper palette contract (page, popover and hairline relationships, and contrast floors), fixes the `display` role size, and adds the requirement that icon-only controls expose a `Hint` and keycaps use one primitive.
- `web-navigation`: adds requirements for the navigation dropdown presentation (section hub row, shared panel, active and hover tint), for the navbar action buttons, and for the search dialog's keyboard legend.
- `interaction-feedback`: adds the requirement that toasts show a state icon and follow the active theme.

## Impact

- `apps/frontend/src/styles/global.css` (light tokens, `--font-size-display`).
- `apps/frontend/src/components/ui/navigation-menu.tsx`, `command.tsx` (footer slot), `sonner.tsx`, new `ui/kbd.tsx`.
- `apps/frontend/src/features/app-shell/components/*` (`navbar-authenticated`, `navbar-guest`, `navbar-mobile-menu`, `navbar-search-trigger`, `surface-search-dialog`, `theme-toggle`, `language-switcher`, `user-nav`) and `features/app-shell/nav-trigger.ts` (replaced by the new action primitive).
- New `apps/frontend/src/components/shared/navigation/` primitives and `components/shared/feedback/hint.tsx`; call sites of `Hint` in `src/features` and `src/components`; `shared/form/form-dialog.tsx`, `shared/data-display/status-dot.tsx`, `shared/layout/scroll-to-top-button.tsx`.
- Locale files `nav.json` and `common.json` (es and en).
- `apps/frontend/DESIGN.md`, `openspec/specs/design-system`, `web-navigation`, `interaction-feedback`.
- Tests: new unit tests for the pure pieces; `tests/e2e/admin/navigation.spec.ts`, `surface-search.spec.ts` and any spec that relies on the dropdown structure or on the native `title` of the back-to-top button need a run; the README and site screenshots (`img/`) will look different and are retaken separately.
- No new runtime dependency, no API, no database and no migration.
