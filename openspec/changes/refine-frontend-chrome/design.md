## Context

See `proposal.md` for the motivation. Current state that shapes the approach:

- The light palette lives in `:root` of `apps/frontend/src/styles/global.css`; the dark palette is a separate `.dark` block and is not touched.
- The navbar (`features/app-shell/components/navbar-authenticated.tsx`) already has the right structure (brand, separator, section pills, actions) and uses the shadcn `NavigationMenu` over Radix with `viewport={false}`, so each dropdown is an independent absolutely-positioned panel. The pill styles, the dropdown row styles and the section/sub-item rendering are inlined in that one file.
- Every navbar action shares `navTriggerClass` (`features/app-shell/nav-trigger.ts`): `size-9 rounded-md border bg-background shadow-xs`. There is no tooltip on any of them; the back-to-top button uses the native `title`.
- `components/ui/tooltip.tsx` exists (used only by the sidebar). The navbar, the toaster and the back-to-top button are separate React islands (`client:only="react"`), so any tooltip inside them needs its own provider.
- The shadcn primitives (button, input, badge, dialog, table, tabs, select, switch...) already follow `DESIGN.md` and carry things this change must not lose: `pointer-coarse` hit areas, `required`/`error` on `FormField`, the bottom-sheet `FormDialog` on phones and i18n.
- `apps/frontend/DESIGN.md` is normative and `openspec/specs/design-system` and `web-navigation` are the behavior contracts that change.

## Goals / Non-Goals

**Goals:**

- Make the light theme read as paper with visible hairlines without touching the dark theme.
- Make section dropdowns scannable (hub row, tint, wrapped descriptions) and animate as one panel.
- Give every icon-only control a hint, give shortcuts one keycap look, and tell search users which keys work.
- Keep every change independently shippable and independently revertible, in an order where the first step already changes how the whole app looks.

**Non-Goals:**

- Changing the component library of the shadcn primitives (Radix stays). The primitives are not where the gap is, and a swap would add a runtime dependency and rewrite every `asChild` call site for no visible gain.
- Moving the navbar from `sticky` to `fixed`. Locked pages, the section sidebar's `top-(--navbar-height)` offset and the `min-h-0` flex chains are all built around the sticky bar; overlaying content under the blur is not worth re-plumbing them.
- Changing sections, routes or the page-surface registry, the sidebar, the run console, or any API or database.
- A dark-theme palette pass.

## Decisions

### D1. Palette: change values, not structure

Only the light values of existing tokens change, so no component needs to know:

| Token | Before | After |
|---|---|---|
| `--background` | `0.9818 0.0054 95.1` | `0.95 0.009 95.1` |
| `--popover` | `1 0 0` | `0.985 0.004 97.35` |
| `--secondary`, `--accent` | `0.9245 0.0138 93.0` | `0.91 0.0138 93.0` |
| `--muted` | `0.9341 0.0153 90.2` | `0.92 0.0153 90.2` |
| `--border` | `0.94 0.003 97.4` | `0.89 0.006 97.4` |
| `--input` | `0.92 0.004 98.4` | `0.87 0.007 98.4` |
| `--sidebar` | `0.9663 0.008 98.9` | `0.935 0.01 98.9` |
| `--sidebar-accent` | `0.9245 0.0138 93.0` | `0.9 0.0138 93.0` |
| `--sidebar-border` | `0.955 0.003 98` | `0.9 0.006 98` |

`--card` stays, so `bg-card/40` boxes now sit on a darker page and read as lifted. Rationale for values, not tokens: DESIGN.md already commits to a paper look and hairlines; the tokens were simply too close to white. Alternative considered: add an extra `--paper` token and migrate surfaces to it. Rejected, because it creates a second way to say "page background" and every `bg-background` consumer (navbar translucency, inputs, dialogs) would need a decision.

Contrast is a gate, not a hope: the new values are checked by computing WCAG ratios for `--muted-foreground` and `--secondary-foreground` over the new fills before the step is considered done, and the secondary badge scenario in `design-system` stays true.

### D2. `display` role to `1.125rem`

One token change (`--font-size-display`). It reaches `PageHero`, `StateCard` (celebrate tone) and, newly, `FormDialog`'s title, which today only sets `tracking-tight` on top of the dialog's `text-lg`. The `stat` role (`1.5rem`) is the only larger text left, which is what lets a number lead a dashboard card. The change is deliberately separate from D1 so it can be judged, and reverted, on its own.

### D3. Dropdown: Radix shared viewport, not a library swap

The local `NavigationMenu` wrapper already supports `viewport` (default `true`); the navbar opts out. The change turns it on for the section menu so Radix morphs one panel between sections (size via `--radix-navigation-menu-viewport-width/height`, content slides via `data-motion`). The wrapper's panel styling moves to the visual contract in the spec: `rounded-lg`, `bg-popover`, a light shadow and `ring-1 ring-foreground/10`, 0.35s ease-out. Content width is a fixed `w-72` per section so the morph is between heights rather than jumpy widths.

Alternative considered: swap the wrapper to another headless primitive that has a positioner-based shared popup. Rejected (see Non-Goals).

Row styles move to `MenuItemText` plus two class constants (`row` and `hub row`) colocated with the navbar; the pill (`NavbarPillLink`, `NavbarPillTrigger`) moves to `components/shared/navigation/navbar-pill.tsx`. The existing `triggerActive`/`triggerInactive` overrides (needed because Radix returns focus to the trigger after a link closes the menu) move with the pill, unchanged.

### D4. One `NavbarAction` primitive

`navTriggerClass` is replaced by `NavbarAction` / `NavbarActionLink` in `components/shared/navigation/navbar-action.tsx`, which keeps the call signature (they spread props onto a `button` or `AppLink`) so `DropdownMenuTrigger asChild`, the sheet trigger and plain buttons keep working. Visual changes: `rounded-lg`, `bg-background/60`, no `shadow-xs` (flat by default), `hover/open:border-primary/30 bg-accent`, `size-11 lg:size-9` (the 44px touch size is the existing `pointer-coarse` rule applied by breakpoint, because the navbar swaps layout at `lg`).

### D5. `Hint`

`components/shared/feedback/hint.tsx` wraps the existing tooltip: `<Hint label side align>{control}</Hint>` renders `Tooltip` + `TooltipTrigger asChild` + `TooltipContent`, with a 300ms open delay, and mounts its own `TooltipProvider` so islands that are not under `AppProviders` still work. `TooltipTrigger asChild` composes with `DropdownMenuTrigger asChild` on the same element (both forward refs and merge handlers), so a Hint can wrap an account or language trigger without a wrapper element. The control keeps its `aria-label`; the hint is visual.

Application is a mechanical audit, not a redesign: every navbar action; the back-to-top button (drop its `title`); the `StatusTag` explanation (it already accepts a `title` prop meant for this); and any other control found by searching `src/features` and `src/components` for `size="icon"`, `size="icon-sm"`, `size="icon-xs"` and `aria-label` on a button with no text child. Row-action kebab menus are included only when the trigger is a bare icon with no visible label.

### D6. `Kbd`, `CommandFooter` and the legend

`components/ui/kbd.tsx` provides `Kbd` and `KbdGroup` (mono, `text-label` so it respects the 11px floor, `bg-muted` + hairline). The search trigger's inline `<kbd>` becomes a `Kbd`. `components/ui/command.tsx` gains a `CommandFooter` (`border-t bg-muted/40`) slot, and the search dialog renders its legend there with `hidden sm:flex` and `aria-hidden`. Strings go to `nav:search.*` (es and en). The dialog's own geometry (input height, phone anchoring at the top so the on-screen keyboard never hides results) is not changed: it already handles cases the legend does not need to touch.

### D7. Toaster

`ui/sonner.tsx` gets `icons` for success, info, warning, error and loading from the icon registry (adding registry keys only if one is missing, keeping its test green) and keeps its current `toastOptions.classNames`. The theme source stays the existing `useTheme` hook, which already observes the `dark` class on `<html>` and so already satisfies the "follows the theme while visible" scenario; the task only verifies it.

### D8. Documentation travels with the code

`DESIGN.md` is edited in the same change: the colour table values, the `display` size and role table, the Layout/shell paragraph (shared dropdown panel instead of "panel centred under its trigger"), a Navigation subsection (pill, dropdown, `NavbarAction`, hub row), and a new short "Hints and keycaps" subsection. It stays the single normative statement of these rules.

## Risks / Trade-offs

- **Contrast regressions from darker fills** (secondary badges, muted text on `--muted`) → compute the WCAG ratios for the new light values before and after, and adjust the foreground token rather than the fill if a pair falls under 4.5:1.
- **Every light page shifts at once** (D1) → ship D1 as its own step, run the unit and E2E suites, and eyeball the dashboard, a list, a form dialog, the run console (it is always dark and must not change) and the login page in both themes before continuing.
- **`display` smaller than `headline` density in some heroes** (D2) → check heroes that put a long entity name in the title and dialogs with two-line titles; the role keeps `line-height: 1.2`. If the result is judged too quiet, this single token is the knob.
- **Radix's shared viewport anchors to the menu list, not to each trigger** (D3), so the panel's left edge follows the pill list instead of being centred under its pill → accept left alignment under the list (matches the existing "sections sit left after a separator" arrangement); if it looks wrong, use the indicator/viewport-offset pattern as a follow-up. The spec constrains behavior (one panel that morphs), not horizontal position, so either result satisfies it.
- **Tooltip plus dropdown trigger on the same element** (D5) → one E2E-level check that opening the language menu with the keyboard still works and that the hint does not stay open on top of the opened menu (close the hint on menu open).
- **E2E selectors** that find the back-to-top button by its native `title` or that depend on the dropdown's old DOM → no E2E spec uses `getByTitle` today, but the navigation, surface-search and guest specs depend on the navbar's roles and names; run them on demand after the navbar steps (E2E is not in CI) and update them in the same step if a role or name moved.
- **Screenshots** in the README and the site (`img/`) go stale → noted as a separate, manual follow-up; not part of this change's acceptance.

## Migration Plan

No data, API or deployment changes. The work is a sequence of independently committable steps (tokens, `display`, navbar primitives, dropdown panel, `Hint` and its call sites, `Kbd` and search legend, toaster, docs). Rollback of any step is a revert of its commit; D1 and D2 are single-file reverts of values in `global.css`.

## Open Questions

- Whether a dedicated row in the dropdown for the section hub should also show the section's description (today it does, in the spec's row definition); can be trimmed after seeing it rendered.
- Whether `Hint` should replace the sidebar's existing tooltips for consistency; harmless to leave for a follow-up.
