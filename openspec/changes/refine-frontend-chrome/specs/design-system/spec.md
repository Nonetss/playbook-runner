## ADDED Requirements

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
