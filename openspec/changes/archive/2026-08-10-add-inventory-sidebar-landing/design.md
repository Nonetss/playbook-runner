## Context

Inventory already has canonical Devices and Groups routes plus navigation
metadata describing them. The parent route currently renders Devices directly.
The reference project uses a `WithSidebar.astro` layout to place a reusable
section sidebar alongside a route-level overview.

## Goals / Non-Goals

**Goals:**

- Make `/inventory` a clear intermediate entry point for its two operational
  surfaces.
- Provide persistent, accessible section navigation on Inventory routes.
- Reuse the existing navigation metadata and locale keys rather than duplicating
  route labels or descriptions.

**Non-Goals:**

- Change device, group, relationship, credential, or ping behaviour.
- Replace the global authenticated navbar.
- Add a sidebar to unrelated features.

## Decisions

### Reusable section shell, scoped to declared sub-navigation

Create `WithSidebar.astro` plus a React shell and section sidebar that consume
one `SiteNavItem` and its `subItems`. The layout mirrors the reference
project's topology while adapting labels at render time through the current
i18n system. This avoids hard-coding Inventory links and permits later
sections to adopt the same layout.

Alternative considered: an Inventory-only sidebar. It would be quicker, but
would duplicate navigation metadata and fail to establish the requested layout
pattern.

### Root route becomes an overview, child routes stay operational

`/inventory` renders a compact overview with direct paths to Devices and
Groups. The CRUD islands remain on `/inventory/devices` and
`/inventory/groups`, so the only change in responsibility is the parent route.

### Responsive sidebar behavior

The sidebar is visible beside content on desktop, collapses to icon width on
request, and is available from an explicit trigger as a sheet on narrow
viewports. The user’s desktop preference is stored in the existing browser
cookie convention used by the reference layout.

## Risks / Trade-offs

- [React shell receives Astro route content] → Keep the shell as a single
  client-only island, matching the reference layout and avoiding separate
  sidebar state providers.
- [A new sidebar can duplicate global navigation] → Limit it to the current
  section’s subroutes; the global navbar remains primary app navigation.
- [Long translated labels] → Use truncation in collapsed states and allow text
  wrapping in the overview links.

## Migration Plan

1. Add the reusable layout, shell, and section sidebar.
2. Change Inventory root to the overview and wrap Inventory routes with the
   new layout.
3. Validate type safety, translation parity, formatting, and OpenSpec specs.
4. Roll back by restoring the plain `Layout` entries; no data migration is
   involved.
