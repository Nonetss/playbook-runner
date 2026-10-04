## ADDED Requirements

### Requirement: Desktop navbar arrangement

On large (`lg` and up) viewports the authenticated navbar SHALL place the brand first, then a vertical hairline separator, then the inline navigation sections aligned to the left right after it, and SHALL place its actions (search, language, theme, settings and account) at the right edge. Below the large breakpoint the separator and the inline sections SHALL NOT be shown.

#### Scenario: Sections sit at the left after a separator

- **WHEN** the authenticated navbar is displayed on a large viewport
- **THEN** the navigation sections SHALL start right after the brand, divided from it by a vertical separator, instead of being centred in the bar

#### Scenario: Actions stay at the right

- **WHEN** the authenticated navbar is displayed on a large viewport
- **THEN** the search trigger and the language, theme, settings and account actions SHALL be grouped at the right edge of the navbar

#### Scenario: Small viewport has no separator

- **WHEN** the authenticated navbar is displayed below the large breakpoint
- **THEN** neither the separator nor the inline sections SHALL be rendered

### Requirement: Navbar surface search

The authenticated navbar SHALL offer a search dialog that lets the user jump to any registered application page by typing part of its name. The searchable pages SHALL be projected from the application-surface registry; no page title, description or icon SHALL be declared in the search itself. The search SHALL be offered to every authenticated user, whatever their role, and SHALL NOT be offered in the guest navbar.

#### Scenario: Large viewport shows a search field trigger

- **WHEN** the authenticated navbar is displayed on a large (`lg` and up) viewport
- **THEN** the navbar actions SHALL include a search trigger that reads as a search field and shows the keyboard shortcut for the current platform (`⌘K` on Apple platforms, `Ctrl K` elsewhere)

#### Scenario: Small viewport shows an icon trigger

- **WHEN** the authenticated navbar is displayed below the large breakpoint
- **THEN** the navbar actions SHALL include an icon-only search trigger with a localized accessible name

#### Scenario: Guest navbar has no search

- **WHEN** a page is rendered with the guest navbar
- **THEN** no search trigger SHALL be rendered and the keyboard shortcut SHALL NOT open a search dialog

#### Scenario: Opening with the trigger

- **WHEN** the user activates the search trigger
- **THEN** a search dialog SHALL open with its text input focused

#### Scenario: Opening with the keyboard shortcut

- **WHEN** the authenticated navbar is mounted and the user presses `⌘K` (macOS) or `Ctrl+K` (other platforms)
- **THEN** the search dialog SHALL open, and pressing the shortcut again while it is open SHALL close it

#### Scenario: Copy follows the active language

- **WHEN** the user switches the interface language and opens the search dialog
- **THEN** page titles, descriptions, group headings, placeholder and empty-state copy SHALL be shown in that language and matched in that language

### Requirement: Searchable pages

The surface search SHALL list every registered application page to every user, without filtering by role. Results SHALL be grouped the way the navigation groups them: pages outside a navigation section in a leading general group, then one group per navigation section headed by the section's title, listing the section's overview page first and its sub-pages after it in navigation order. Each result SHALL show the page's icon, title and description, and a sub-page SHALL show its section's title before its own.

#### Scenario: Pages are grouped by section

- **WHEN** the user opens the search dialog without typing
- **THEN** the dashboard, settings and profile pages SHALL appear in the general group, and the devices, groups and credentials pages SHALL appear in the Inventory group after the Inventory overview

#### Scenario: Every page is listed for every user

- **WHEN** any authenticated user opens the search dialog without typing
- **THEN** every registered page SHALL appear in some group, with no page hidden because of the user's role

### Requirement: Searchable records

Once the query is non-empty, the surface search SHALL also list, in one group per record type with a localized heading, the records the signed-in user can open: playbooks (opening their edit page), scripts (opening their edit page), scheduled jobs (opening their detail page) and inventory groups (opening their detail page). Records SHALL be obtained through the same API calls and permissions as the pages that list them, and SHALL be loaded only while the search dialog is open. Each record result SHALL show the icon of the page that lists that record type, the record's name, and its description (or the listing page's description when the record has none). A record SHALL be matched against its name, its description, its group heading and the titles of the page and section that list it, so typing a section's name lists its records. While records load, or if loading fails, the page results SHALL still be shown and searchable.

#### Scenario: Finding a playbook by name

- **WHEN** a user with a playbook named "Actualizar paquetes" opens the search dialog and types "actualizar"
- **THEN** a result labelled "Actualizar paquetes" SHALL appear in the playbooks group, and selecting it SHALL navigate to `/playbooks/<id of that playbook>/edit`

#### Scenario: Finding a scheduled job

- **WHEN** a user with a scheduled job named "Backup nocturno" types "backup"
- **THEN** a result labelled "Backup nocturno" SHALL appear in the jobs group and SHALL navigate to `/jobs/<id of that job>`

#### Scenario: Finding a script and a group

- **WHEN** the user types the name of an existing script or of an existing inventory group
- **THEN** that script SHALL be listed and navigate to `/scripts/<id>/edit`, and that group SHALL be listed and navigate to `/inventory/<id>/group`

#### Scenario: Typing the section name lists its records

- **WHEN** a user with playbooks types "playbooks"
- **THEN** the Playbooks page SHALL appear and every playbook of the user SHALL appear in the playbooks group, whatever their names

#### Scenario: Empty query shows no records

- **WHEN** the user opens the search dialog without typing
- **THEN** no record results SHALL be listed

#### Scenario: No records are fetched while the dialog is closed

- **WHEN** an authenticated page is loaded and the search dialog has not been opened
- **THEN** no request SHALL be made to enumerate records for the search

#### Scenario: Loading or failing records do not block the search

- **WHEN** a record list is still loading or its request fails
- **THEN** matching page results SHALL still be shown, and no error SHALL replace the dialog content

#### Scenario: Current record is marked

- **WHEN** the user is on `/jobs/<id>` and that job appears in the results
- **THEN** that result SHALL be visually marked as the current page

### Requirement: Recently visited pages

The surface search SHALL remember, in the browser's `localStorage` and scoped to the signed-in user, the most recent registered pages the user visited (at most five, newest first), and SHALL list them first under a localized "Recent" group while the query is empty. A visit SHALL count only when the current path is exactly a listed page's path; record pages SHALL NOT be recorded. Storage failures SHALL NOT break the search.

#### Scenario: Recent pages are suggested first

- **WHEN** the user has visited `/playbooks` and then `/scripts`, navigates to `/config` and opens the search dialog without typing
- **THEN** a "Recent" group SHALL appear first listing Scripts and then Playbooks

#### Scenario: Current page is not suggested as recent

- **WHEN** the user opens the search dialog on a page that is in their recent list
- **THEN** that page SHALL NOT appear in the "Recent" group

#### Scenario: Typing hides the recent group

- **WHEN** the user types a query
- **THEN** the "Recent" group SHALL be hidden, so no result is listed twice

#### Scenario: Recents are per user and respect visibility

- **WHEN** a different user signs in on the same browser, or a stored page is no longer listed for the user
- **THEN** the dialog SHALL NOT suggest pages from the other user's history nor pages the user can't see

#### Scenario: Record pages are not recorded

- **WHEN** the user visits `/jobs/<id>` and later opens the search dialog without typing
- **THEN** the "Recent" group SHALL NOT include that job

#### Scenario: Storage unavailable

- **WHEN** `localStorage` is unavailable or holds malformed data
- **THEN** the search dialog SHALL work without a "Recent" group

### Requirement: Surface search matching and navigation

The surface search SHALL match the query case- and accent-insensitively. A query of several words SHALL match a result only when every word is found in at least one of the texts that result is matched against (for a page: its title, description and section title; for a record: as defined in "Searchable records"). The search SHALL show a localized empty state when nothing matches. Selecting a result SHALL close the dialog and navigate to its path through the View Transitions–aware client navigation; selecting the current page SHALL only close the dialog.

#### Scenario: Accent-insensitive match

- **WHEN** the user types "configuracion" (Spanish interface)
- **THEN** the "Configuración" page SHALL appear in the results

#### Scenario: Match through the section

- **WHEN** the user types "inventario" (Spanish interface)
- **THEN** the Inventory overview and its devices, groups and credentials pages SHALL appear in the results

#### Scenario: Multi-word query narrows to one section

- **WHEN** the user types "ansible historial" (Spanish interface)
- **THEN** the run history page SHALL appear and the Bash pages SHALL NOT

#### Scenario: No matches

- **WHEN** the query matches no page and no record
- **THEN** the dialog SHALL show an empty-state message and no results

#### Scenario: Selecting a result

- **WHEN** the user selects a result with the pointer or with `Enter` on the highlighted item
- **THEN** the dialog SHALL close and the app SHALL navigate to that result's path

#### Scenario: Current page is marked

- **WHEN** the search dialog lists the page for the current path
- **THEN** that result SHALL be visually marked as the current page, choosing the most specific page when several match (on `/inventory/devices`, the devices page and not the Inventory overview)
