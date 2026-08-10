## MODIFIED Requirements

### Requirement: Responsive navigation
The authenticated navbar SHALL derive its sections from one localized metadata
source. It SHALL show primary navigation links inline on large viewports, move
lower-priority links into an accessible overflow menu when horizontal space is
constrained, and expose every navigation link through the existing slide-out
menu on smaller viewports. A metadata section MAY declare nested links, which
SHALL be available from both desktop and mobile navigation.

#### Scenario: Large viewport shows inline links
- **WHEN** the navbar is displayed on a wide large viewport
- **THEN** primary and lower-priority navigation sections SHALL be shown inline

#### Scenario: Constrained desktop shows overflow navigation
- **WHEN** the navbar is displayed at a large viewport where all inline links
  would not fit comfortably
- **THEN** primary links SHALL remain inline
- **AND** lower-priority links SHALL be available in an accessible overflow
  menu

#### Scenario: Small viewport shows the slide-out menu
- **WHEN** the navbar is displayed below the large breakpoint
- **THEN** every navigation section and its nested links SHALL be available
  through a slide-out menu opened from a menu button

### Requirement: Active link highlighting
The navigation SHALL highlight the metadata link or parent section matching
the current path. The home link MUST match only the exact root path, while
other links match when the current path starts with the link's href.

#### Scenario: Home is active only at root
- **WHEN** the current path is `/`
- **THEN** only the home link SHALL be highlighted

#### Scenario: Section link is active on nested paths
- **WHEN** the current path starts with a section link's href (for example
  `/playbooks/...`)
- **THEN** that section link SHALL be highlighted

#### Scenario: Nested link is active
- **WHEN** the current path starts with a nested navigation link's href
- **THEN** its parent section and the nested link SHALL be identifiable as the
  active navigation context
