## ADDED Requirements

### Requirement: Supported locales

The frontend SHALL support Spanish (`es`) and English (`en`) as selectable locales. The set of locales SHALL be defined in a single source of truth so that adding a new locale requires only adding a translation resource set and registering its code.

#### Scenario: Both launch locales are available

- **WHEN** the application initializes its i18n layer
- **THEN** both `es` and `en` are registered as available locales
- **AND** every namespaced translation key that exists in `en` also exists in `es`

#### Scenario: Adding a locale requires no component changes

- **WHEN** a new locale code and its translation resource files are added to the locale registry
- **THEN** the language switcher offers the new locale
- **AND** no page or component source needs to be edited for the new locale to render

### Requirement: Locale detection and default

The system SHALL resolve an active locale on every request using this precedence: (1) an explicit `locale` cookie, (2) the browser `Accept-Language` header, (3) a fallback to Spanish (`es`). Only registered locales SHALL be considered a match; unrecognized values fall through to the next source.

#### Scenario: Explicit cookie wins

- **WHEN** a request arrives with a `locale` cookie set to a registered locale
- **THEN** that locale is used regardless of the `Accept-Language` header

#### Scenario: Browser preference used when no cookie

- **WHEN** a request has no `locale` cookie and an `Accept-Language` header whose highest-priority registered match is `en`
- **THEN** the active locale is `en`

#### Scenario: Fallback to Spanish

- **WHEN** a request has no `locale` cookie and no registered language in `Accept-Language`
- **THEN** the active locale is `es`

### Requirement: Consistent server and client locale

The locale resolved on the server SHALL be passed into the client so that the first client render matches the server-rendered markup. The document root SHALL expose the active locale via the `<html lang>` attribute.

#### Scenario: No hydration mismatch

- **WHEN** a page is server-rendered in a given locale and then hydrated on the client
- **THEN** the initial client-rendered text matches the server-rendered text for that locale
- **AND** no locale-driven hydration warning is produced

#### Scenario: Document language reflects locale

- **WHEN** a page is rendered with active locale `es`
- **THEN** the `<html>` element has `lang="es"`

### Requirement: Translation API for components and pages

User-facing text SHALL be rendered through a translation function keyed by namespaced identifiers (`namespace:key`) rather than hardcoded literals. React components SHALL access translations through the react-i18next hook, and `.astro` pages SHALL render text in the resolved locale. Missing keys SHALL fall back to the English value rather than displaying a raw key.

#### Scenario: Component renders localized string

- **WHEN** a React component calls the translation function with a key that exists in the active locale
- **THEN** the value for the active locale is rendered

#### Scenario: Missing key falls back

- **WHEN** a translation key is missing in the active locale but present in English
- **THEN** the English value is rendered instead of the raw key

### Requirement: Language switcher

The UI SHALL provide a language switcher that lists the available locales, indicates the active one, and changes the active locale live without a full navigation. The chosen locale SHALL persist across page loads and sessions.

#### Scenario: Switching locale updates the UI live

- **WHEN** the user selects a different locale in the switcher
- **THEN** visible translated text updates to the selected locale without a full-page reload

#### Scenario: Choice persists

- **WHEN** the user selects a locale and then reloads or revisits the site later
- **THEN** the previously selected locale is active
- **AND** the `locale` cookie reflects the selected locale

### Requirement: No route changes

Enabling i18n SHALL NOT change any existing URL path. Locale SHALL be carried by cookie/header rather than a URL prefix, and existing routes and the auth middleware behavior SHALL remain unchanged.

#### Scenario: URLs are unchanged

- **WHEN** i18n is enabled and a user navigates the application
- **THEN** route paths such as `/dashboard` and `/playbooks` are identical to before i18n was added
- **AND** no `/es/` or `/en/` prefix is introduced
