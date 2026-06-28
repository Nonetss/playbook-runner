# Theme Switching

## Purpose
Let users switch between light and dark appearance, persist their choice, and avoid a flash of incorrect theme on load, so the interface respects user preference across visits and navigations.

## Requirements

### Requirement: Toggle light and dark theme
The application SHALL provide a control that switches between light and dark themes by toggling the `dark` class on the document root.

#### Scenario: User toggles the theme
- **WHEN** the user activates the theme toggle
- **THEN** the document root SHALL switch between having and not having the `dark` class

### Requirement: Persist theme preference
The application SHALL persist the selected theme in `localStorage` under the `theme` key so the choice survives reloads and future visits.

#### Scenario: Preference is stored on toggle
- **WHEN** the user switches the theme
- **THEN** the new value (`light` or `dark`) SHALL be written to `localStorage`

### Requirement: Apply theme before paint
The application SHALL apply the stored theme (defaulting to dark) before the page renders and SHALL re-apply it after client-side navigations, preventing a flash of the wrong theme.

#### Scenario: Stored theme applied on load
- **WHEN** a page loads with a stored theme preference
- **THEN** the theme SHALL be applied before first paint

#### Scenario: Theme preserved across client navigation
- **WHEN** the user navigates between pages via client-side transitions
- **THEN** the stored theme SHALL be re-applied after the swap

### Requirement: Animated theme transition
When the browser supports the View Transitions API, the theme change SHALL animate as a circular reveal originating from the toggle position; otherwise the change SHALL apply immediately.

#### Scenario: Supported browser animates the change
- **WHEN** the user toggles the theme in a browser that supports view transitions
- **THEN** the change SHALL animate as a circular reveal from the click position

#### Scenario: Unsupported browser applies immediately
- **WHEN** the user toggles the theme in a browser without view transition support
- **THEN** the change SHALL apply immediately without animation
