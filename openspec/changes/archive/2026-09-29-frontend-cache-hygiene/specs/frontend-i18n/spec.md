## MODIFIED Requirements

### Requirement: Translation API for components and pages
User-facing text SHALL be rendered through a translation function keyed by namespaced identifiers (`namespace:key`) rather than hardcoded literals. This includes fallback labels interpolated into other translated strings (e.g. a generic "this group" used when a resource name is unavailable). React components SHALL access translations through the react-i18next hook, and `.astro` pages SHALL render text in the resolved locale. Missing keys SHALL fall back to the English value rather than displaying a raw key.

#### Scenario: Component renders localized string
- **WHEN** a React component calls the translation function with a key that exists in the active locale
- **THEN** the value for the active locale is rendered

#### Scenario: Missing key falls back
- **WHEN** a translation key is missing in the active locale but present in English
- **THEN** the English value is rendered instead of the raw key

#### Scenario: Interpolated fallback label is localized
- **WHEN** a delete confirmation is opened for a group, device, or credential whose name is not available and the active locale is English
- **THEN** the confirmation title uses the English fallback label (e.g. "this group") and contains no Spanish text
