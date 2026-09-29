## ADDED Requirements

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
