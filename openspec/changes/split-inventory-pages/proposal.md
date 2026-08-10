## Why

Inventory currently presents devices and groups as mutually exclusive tabs on
one route. Each is a primary operational task, so separate URLs make the
current context clearer, improve direct navigation, and let users return to a
specific inventory surface.

## What Changes

- Replace the in-page inventory tabs with dedicated Devices and Groups pages.
- Add canonical `/inventory/devices` and `/inventory/groups` routes, while
  retaining `/inventory` as the Devices entry point for existing links.
- Add inventory navigation sub-links and localized page copy without changing
  device, group, relationship, credential, or mutation behaviour.

## Capabilities

### New Capabilities

- `inventory-navigation`: Route-level navigation between the separate device
  and group inventory surfaces.

### Modified Capabilities

- `resource-crud-framework`: Inventory resource lists are presented as
  independent route-level CRUD surfaces rather than tab panels.

## Impact

- Affects inventory React components, Astro pages, navigation metadata, and
  English/Spanish locale resources.
- Does not change APIs, database schema, migrations, Ansible execution, or
  E2E configuration.
