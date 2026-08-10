## Why

Jobs currently opens the scheduler directly while run history lives in a
separate top-level route. That splits two closely related operational tasks and
does not use the section navigation pattern now established for Inventory.

## What Changes

- Make `/jobs` a section overview with Scheduler and History entry cards.
- Add canonical `/jobs/scheduler` and `/jobs/history` routes using the shared
  `WithSidebar.astro` layout.
- Redirect the previous `/history` route to `/jobs/history` and update relevant
  internal links to the canonical History route.

## Capabilities

### New Capabilities

- `job-section-navigation`: route-level Scheduler and History surfaces with
  shared Jobs section navigation.

### Modified Capabilities

- None.

## Impact

- Affects Jobs/History Astro routes, navigation metadata, and internal frontend
  links only.
- Does not change APIs, job data, scheduler behavior, database schema,
  migrations, or E2E setup.
