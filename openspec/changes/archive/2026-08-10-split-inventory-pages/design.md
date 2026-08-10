## Context

`InventoryPage` currently owns both device and group CRUD flows, their modal
state, relationship mappings, and a client-side two-tab control. The UI keeps
all data logic in one component but gives neither resource type its own URL.

## Goals / Non-Goals

**Goals:**

- Give devices and groups canonical, directly addressable inventory routes.
- Preserve all existing create, edit, delete, relationship, credential, and
  ping behaviour.
- Keep the existing `/inventory` entry point valid and make it land on devices.
- Surface the two routes as nested inventory navigation links.

**Non-Goals:**

- Changing inventory API procedures, queries, schema, or relationships.
- Adding a second visual navigation system inside the inventory page.
- Changing the group detail route or the run-console inventory selection.

## Decisions

### One shared inventory implementation with a route-selected surface

The existing component will accept a fixed `section` value (`devices` or
`groups`) and render only that resource surface. Thin exported entry components
will mount it with the existing `AppProviders`, avoiding duplicated mutation
and relationship code while removing the client-side tab state entirely.

Alternative considered: two fully independent feature components. It would
duplicate relationship mapping, modal lifecycle, and destructive-action logic
without a user-facing benefit.

### Canonical child routes with a compatible root entry

Astro pages will add `/inventory/devices` and `/inventory/groups`. The existing
`/inventory` page remains and renders the devices surface so existing bookmarks
and the top-level inventory link continue to work without a client redirect.

### Navigation metadata owns the inventory sub-links

The existing inventory navigation item will declare devices and groups as
sub-items. Desktop and mobile navigation already understand nested metadata,
so this makes both surfaces discoverable without adding tabs or one-off links
to the page header.

## Risks / Trade-offs

- [The shared component still requests relation data for both surfaces] → Keep
  the existing stable data path initially; avoid changing query semantics in a
  route/layout change.
- [Old `/inventory` links could lead to an unexpected surface] → Preserve it
  as the devices page, which is the default operational entry point.
- [Long localized labels affect navigation] → Use the existing responsive
  nested desktop/mobile navigation and validate locale parity.

## Migration Plan

1. Remove tab state and expose fixed device/group entry components.
2. Add the two Astro routes and retain the root inventory entry.
3. Add navigation metadata and localized page titles/descriptions.
4. Type-check, validate translation parity, and run OpenSpec validation.
5. Roll back by restoring the previous tabbed component; no data migration is
   required.
