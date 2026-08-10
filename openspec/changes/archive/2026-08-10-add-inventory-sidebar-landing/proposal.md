## Why

The Inventory root is currently a compatibility redirect surface for Devices.
It does not give users a clear starting point or persistent wayfinding between
the two inventory areas.

## What Changes

- Turn `/inventory` into a section landing page that introduces Devices and
  Groups and links to each directly.
- Add a reusable `WithSidebar.astro` section layout, modeled on the established
  layout in the reference project, with an inventory sidebar for the landing
  and child routes.
- Keep `/inventory/devices` and `/inventory/groups` as the CRUD surfaces and
  preserve all their existing behaviour.

## Capabilities

### New Capabilities

- `section-sidebar-layout`: reusable section landing and sidebar wayfinding for
  route groups with declared navigation sub-items.

### Modified Capabilities

- None.

## Impact

- Affects Astro layouts, app-shell navigation components, Inventory route
  entries, and English/Spanish copy.
- Does not change inventory APIs, database schema, migrations, or E2E setup.
