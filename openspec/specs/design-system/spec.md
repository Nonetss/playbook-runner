# Design System

## Purpose
Define the written design system of the frontend: tokens, typography roles, status language, surface rules and the page-surface registry every page follows.

## Requirements

### Requirement: Written design system
The frontend SHALL maintain a written design system document at
`apps/frontend/DESIGN.md` that defines the colour tokens, typography roles,
spacing conventions, surface rules, status language and shared primitives.
New or changed frontend pages SHALL follow it.

#### Scenario: Document covers every rule enforced in code
- **WHEN** a contributor reads `apps/frontend/DESIGN.md`
- **THEN** it SHALL describe the one-accent rule, the typography role scale,
  the card and list presentation rules, the status language and the terminal
  token set

### Requirement: Single accent colour
The interface SHALL use the brand accent (`--primary`) only for the page
identity icon, the primary action and live/active indicators. Every other
element SHALL use neutral tokens (`foreground`, `muted-foreground`, `border`,
`card`, `muted`) or `destructive`.

#### Scenario: Resource list page
- **WHEN** a resource list page is rendered
- **THEN** the accent colour SHALL appear only on the hero icon, the primary
  create action and active status dots

### Requirement: Typography role scale
The frontend SHALL expose typography roles `display`, `headline`, `body`,
`meta`, `label`, `status` and `data` through Tailwind theme tokens and a
shared `Text` component. Page titles SHALL use `display`, row and dialog
titles `headline`, field labels and table headers `label`, and technical
values (ids, IPs, cron expressions, timestamps, durations) `data`. No text
SHALL be smaller than 11px.

#### Scenario: Technical value rendering
- **WHEN** an IP address, cron expression, id or duration is displayed
- **THEN** it SHALL render in the monospace family with tabular numerals

#### Scenario: Page title rendering
- **WHEN** any authenticated page renders its title
- **THEN** the title SHALL use the `display` role

### Requirement: Brand typefaces
The frontend SHALL use Space Grotesk for interface text and Space Mono for
technical data, loaded from self-hosted font packages. Raw command output and
the code editor SHALL use a single `--terminal-font` token (native monospace
stack with box-drawing coverage). Components SHALL NOT declare their own font
stacks.

#### Scenario: Code editor and terminal fonts
- **WHEN** the code editor or the run console renders text
- **THEN** it SHALL use the `font-terminal` token rather than a local font
  stack

### Requirement: Theme-safe tokens
Every colour token SHALL keep its meaning in both light and dark themes, and
feature components SHALL NOT use raw Tailwind palette colours (`zinc`,
`emerald`, `red`, `amber`, `sky`, `gray`, `slate`, `black`, `white`). The
only exception is the `--terminal-*` token set consumed by the run console.

#### Scenario: Hard-coded palette audit
- **WHEN** the frontend source under `src/features` and `src/components` is
  searched for raw Tailwind palette colour classes
- **THEN** no occurrences SHALL be found

#### Scenario: Sidebar border in dark theme
- **WHEN** the dark theme is active
- **THEN** the sidebar border SHALL use the dark border token, not the light
  one

#### Scenario: Secondary badge in light theme
- **WHEN** a secondary badge is rendered on the light theme
- **THEN** its text SHALL meet WCAG AA contrast against its background

### Requirement: Page surface registry
The frontend SHALL define each page's title, icon and description in a single
page-surface registry. The navbar, section sidebar, document `<title>`, page
hero and section overview cards SHALL derive their identity from it.

#### Scenario: Renaming a page
- **WHEN** a surface's title key is changed in the registry
- **THEN** the navbar, sidebar, browser title, hero and overview card SHALL
  all reflect the new title

### Requirement: Status language
Outside the run console, status SHALL be expressed as a status dot followed by
a short word (e.g. "ok", "failed", "active", "paused"), using the `primary`,
`foreground`, `muted` and `destructive` tones only. Status SHALL NOT be
expressed with green, amber or blue colours or with coloured badges.

#### Scenario: Run status in history
- **WHEN** a finished run is listed in job history
- **THEN** its status SHALL render as a status dot and word without green,
  amber or red palette colours

### Requirement: Paper palette and visible hairlines
In the light theme the page SHALL read as paper and its hairlines SHALL be
visible: `--background` SHALL be visibly darker than the surfaces that sit on
it (`--card`, `--popover`), `--popover` SHALL NOT be pure white, and
`--border` and `--input` SHALL be distinguishable from `--background` at a
glance on a typical display. The neutral text tokens SHALL keep WCAG AA
contrast (4.5:1) against `--background`, `--card` and `--muted`, and secondary
badges SHALL keep it against their own fill. The dark theme SHALL keep its
current values.

#### Scenario: Popovers are not pure white
- **WHEN** a popover, dropdown or tooltip surface is rendered in the light theme
- **THEN** its background SHALL be lighter than the page background and SHALL NOT be `oklch(1 0 0)`

#### Scenario: Hairlines separate regions
- **WHEN** the light theme renders a table box, a card or the navbar's bottom edge
- **THEN** the 1px border SHALL be visible against the page background without relying on a shadow

#### Scenario: Muted text stays legible
- **WHEN** `--muted-foreground` text is rendered over `--background`, `--card` or `--muted` in the light theme
- **THEN** its contrast ratio SHALL be at least 4.5:1

#### Scenario: Dark theme untouched
- **WHEN** the dark theme is active
- **THEN** every colour token SHALL keep the value it had before this change

### Requirement: Display role size
The `display` typography role SHALL be `1.125rem` with weight 600 and tight
tracking, so page titles and dialog titles lead through weight rather than
size. Page titles (`PageHero`) and form-dialog titles SHALL both use it.

#### Scenario: Page title size
- **WHEN** any authenticated page renders its title
- **THEN** the title SHALL render at the `display` size of `1.125rem`

#### Scenario: Dialog title matches page titles
- **WHEN** a form dialog is open
- **THEN** its title SHALL use the same `display` role as page titles

### Requirement: Hints on icon-only controls
Every icon-only control (a button or link with no visible text) in the
authenticated interface SHALL show a hint bubble with its accessible name on
pointer hover and on keyboard focus, after a short delay, instead of relying
on the browser's native `title` tooltip. The control SHALL keep its own
accessible name; the hint SHALL be a visual aid only and SHALL NOT be the sole
carrier of meaning on touch devices.

#### Scenario: Hover shows the hint
- **WHEN** the pointer rests on the theme toggle for the delay time
- **THEN** a bubble with the control's localized name SHALL appear beside it

#### Scenario: Keyboard focus shows the hint
- **WHEN** keyboard focus lands on an icon-only navbar action
- **THEN** its hint SHALL appear and SHALL disappear when focus leaves

#### Scenario: No native title duplicate
- **WHEN** the back-to-top button is rendered
- **THEN** it SHALL expose its name through `aria-label` and the hint, and SHALL NOT also set the native `title`

#### Scenario: Touch devices
- **WHEN** the page is used with a touch pointer
- **THEN** no hint SHALL be required to understand or operate a control

### Requirement: Keycap primitive
Keyboard keys and shortcuts shown in the interface (`⌘K`, `Ctrl K`, `esc`,
`↵`, arrows) SHALL be drawn with one shared keycap primitive in the monospace
family, so every shortcut hint looks the same.

#### Scenario: Search shortcut hint
- **WHEN** the navbar search field is shown on a large viewport
- **THEN** its shortcut SHALL render as a keycap

#### Scenario: Keycaps inherit the theme
- **WHEN** the theme changes between light and dark
- **THEN** keycaps SHALL follow it without any per-theme markup
