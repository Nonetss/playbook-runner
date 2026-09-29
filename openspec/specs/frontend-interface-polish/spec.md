# Frontend Interface Polish

## Purpose
Provide shared presentation primitives (heroes, query states, list and row patterns, search, filters, motion, hit areas) so feature pages render consistently across the application.

## Requirements

### Requirement: Shared data and list presentation primitives
The frontend SHALL provide shared presentation primitives for page heroes,
query states, entity card grids and lists driven by per-resource
definitions, row action
menus, status dots and status tags, search inputs, collapsible filters,
tables, textareas, checkboxes and tabs. Features SHALL use these primitives
instead of hand-built equivalents. The primitives SHALL preserve semantic HTML
and keyboard-accessible controls.

#### Scenario: Detail query is pending, empty, or failed
- **WHEN** a feature uses the shared query-state primitive for a query
- **THEN** it renders a consistent pending, empty, or retryable error state
- **AND** it renders the feature content only after a successful non-empty
  result

#### Scenario: Resource row exposes actions
- **WHEN** a user focuses or hovers a resource row with secondary actions
- **THEN** its shared action trigger is visible and exposes an accessible menu
- **AND** keyboard users can open and operate the menu

#### Scenario: Row actions on touch devices
- **WHEN** a resource row is shown on a device with a coarse pointer
- **THEN** its action trigger SHALL be fully visible without hover

#### Scenario: No hand-built form controls
- **WHEN** a feature needs a multi-line text input, a checkbox or tabs
- **THEN** it SHALL use the shared `Textarea`, `Checkbox` or `Tabs` primitive

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

### Requirement: Single page frame
Every authenticated page SHALL render inside the shared page shell and start
with the shared page hero (icon, title, description, optional meta and
action). Full-height screens (editors and run consoles) SHALL use one shared
locked layout, and detail or form pages SHALL use one shared detail frame with
a back link. Pages SHALL NOT hand-build `<main>` elements, page titles or
viewport-height calculations.

#### Scenario: Form page header
- **WHEN** a user opens `/jobs/new`, `/playbooks/new` or `/scripts/<id>/edit`
- **THEN** the page SHALL show the shared back link and page hero with the
  same typography as list pages

#### Scenario: Full-height screen fits the viewport
- **WHEN** a run console or editor screen is displayed
- **THEN** the page SHALL fill the viewport below the navbar without
  producing a page-level scrollbar

#### Scenario: Navbar aligned with content
- **WHEN** any authenticated page is displayed on a wide viewport
- **THEN** the navbar brand SHALL align with the leftmost edge of the
  application chrome rather than a centred fixed-width column
