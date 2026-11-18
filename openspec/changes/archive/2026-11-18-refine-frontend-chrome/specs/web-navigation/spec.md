## ADDED Requirements

### Requirement: Navigation dropdown presentation
A navigation section with sub-pages SHALL open, on hover or keyboard focus of
its trigger, a dropdown panel of fixed comfortable width. The first row SHALL
be the section hub (the section's icon, name and description) written in the
accent colour, followed by a hairline separator, then one row per sub-page.
Each row SHALL show an icon, a name and a description clamped to two lines.
Hovered, focused and active rows SHALL share one tint of the accent colour;
the icon of a sub-page row SHALL be neutral and turn to the accent colour only
for the active row. The panel SHALL be a floating layer with a light shadow
and a hairline ring.

#### Scenario: Hub row is distinguishable
- **WHEN** the user opens the Ansible section dropdown
- **THEN** the first row SHALL be the section hub in the accent colour, separated by a hairline from the sub-page rows

#### Scenario: Active sub-page
- **WHEN** the current path is inside a listed sub-page
- **THEN** that row SHALL show the accent tint, name and icon, and the other sub-page icons SHALL stay neutral

#### Scenario: Long descriptions wrap
- **WHEN** a row's description is longer than the panel width
- **THEN** it SHALL wrap to at most two lines instead of widening the panel

#### Scenario: Moving between sections
- **WHEN** the pointer moves from one section trigger to another while a dropdown is open
- **THEN** the same panel SHALL transition to the new section's content instead of closing and reopening a separate panel

#### Scenario: Reduced motion
- **WHEN** the user prefers reduced motion
- **THEN** the panel transition SHALL NOT animate size or position

### Requirement: Navbar actions
The navbar actions (language, theme, search on small viewports, account and
the slide-out menu) SHALL share one visual definition: a square icon button
with rounded corners, a hairline border, a translucent background and no
resting shadow, whose border takes an accent tint on hover, focus or while its
menu is open. The button SHALL be at least 44px square below the large
breakpoint and 36px from it. Each action SHALL expose a hint with its name.

#### Scenario: Shared appearance
- **WHEN** the authenticated navbar is displayed on a large viewport
- **THEN** the language, theme and account actions SHALL render with identical size, radius, border and background

#### Scenario: Open state
- **WHEN** an action's menu is open
- **THEN** its border and background SHALL show the open state until the menu closes

#### Scenario: Touch size
- **WHEN** the navbar is displayed below the large breakpoint
- **THEN** every action SHALL be at least 44px by 44px

### Requirement: Search keyboard legend
From the `sm` breakpoint the surface search dialog SHALL show, under the
results, a legend of its keys: arrows to navigate, `Enter` to open and `Esc`
to close, with localized labels. The legend SHALL be hidden from assistive
technology (the keys are already announced by the list) and SHALL NOT be shown
below `sm`, where the dialog is driven by touch.

#### Scenario: Legend on a desktop viewport
- **WHEN** the user opens the search dialog on a viewport of `sm` or wider
- **THEN** a legend with the navigate, open and close keys SHALL be shown under the results

#### Scenario: No legend on phones
- **WHEN** the dialog is open below `sm`
- **THEN** the legend SHALL NOT be rendered visibly

#### Scenario: Legend copy follows the language
- **WHEN** the interface language is English
- **THEN** the legend labels SHALL be shown in English
