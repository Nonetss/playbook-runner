# Frontend Interface Polish

## Purpose
Provide shared presentation primitives (heroes, query states, list and row patterns, search, filters, motion, hit areas) so feature pages render consistently across the application.

## Requirements

### Requirement: Shared data and list presentation primitives
The frontend SHALL provide shared presentation primitives for page heroes,
query states, soft card lists, row action menus, compact status markers,
search inputs, and collapsible filters. The primitives SHALL preserve
semantic HTML and keyboard-accessible controls.

#### Scenario: Detail query is pending, empty, or failed
- **WHEN** a feature uses the shared query-state primitive for a query
- **THEN** it renders a consistent pending, empty, or retryable error state
- **AND** it renders the feature content only after a successful non-empty
  result

#### Scenario: Resource row exposes actions
- **WHEN** a user focuses or hovers a resource row with secondary actions
- **THEN** its shared action trigger is visible and exposes an accessible menu
- **AND** keyboard users can open and operate the menu

### Requirement: Responsive interface polish
The frontend SHALL provide scoped visual enhancements that do not alter
application behaviour: stable thin scrollbars, touch-safe icon control hit
areas, and reduced-motion-safe entrance and theme-change motion.

#### Scenario: User prefers reduced motion
- **WHEN** the browser reports `prefers-reduced-motion: reduce`
- **THEN** shared entrance and theme-change animations SHALL not run
- **AND** all affected content and controls remain visible and operable

#### Scenario: User operates an icon control on a touch device
- **WHEN** the browser has a coarse pointer and an icon-only control is shown
- **THEN** its effective hit area SHALL be at least 44 by 44 CSS pixels
- **AND** its visible desktop dimensions remain unchanged for fine pointers
