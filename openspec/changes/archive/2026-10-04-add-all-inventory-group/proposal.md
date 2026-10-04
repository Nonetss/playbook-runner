## Why

Targeting every device today means creating a group by hand and keeping it in sync every time a device is added or removed. A scheduled job meant to cover "the whole fleet" silently misses new devices. An always-present **All** group, which by definition contains every device, removes that manual bookkeeping and mirrors Ansible's own implicit `all` group.

## What Changes

- Add a built-in, virtual **All** group. It is not stored in the database and its membership is always "every device in the inventory", computed when it is read or run.
- Run, command, script and job inventory selections accept a new entry `{ type: "all" }` next to the existing `group` and `device` entries. Resolving it expands to every device. It is de-duplicated with the other entries and fails like any other selection when a device has no credential or when the inventory is empty.
- Jobs that store `{ type: "all" }` pick up devices added after the job was saved.
- `/inventory/groups` shows **All** pinned first, with the total device count and a member preview. It cannot be edited, deleted or have devices assigned. Opening it (`/inventory/all/group`) shows a read-only list of every device.
- The shared inventory picker (playbook runs, commands, scripts, job form) lists **All** first among groups. The selection round-trips through the run URL (`?groups=all`) and job editing.
- The ⌘K search lists **All** among group results.
- The group name `all` (any letter case) becomes reserved: creating a group with it, or renaming a group to it, is rejected with `BAD_REQUEST`. Existing groups that already use that name keep working.

No database schema change and no migration: jobs already store the selection as `jsonb`.

## Capabilities

### New Capabilities
- `inventory-all-group`: the built-in virtual All group, covering its selection semantics in runs and jobs, its presentation in the groups list, detail page, picker and search, and its read-only nature.

### Modified Capabilities
- `execution-input-safety`: the "Inventory names are restricted" requirement also reserves the group name `all`.

## Impact

- **API (`packages/api`)**: `run/input.ts` and `jobs/input.ts`/`jobs/output.ts` inventory item schemas (discriminated union with `all`); `run/resolve.ts` (`resolveHosts` expands `all`); `inventory/input.ts` + `inventory/handler.ts` (reserved group name); new unit tests. No new procedures. The OpenAPI schema for inventory selections gains the `all` variant, which is additive for existing clients.
- **Frontend (`apps/frontend`)**: `features/run` (selection type, a shared selection-to-payload helper, picker, URL sync), `features/inventory` (groups list, group definition, group detail page), `features/jobs` (form round-trip, types), the four run/command/script/job pages, the ⌘K search source, and `locales/{en,es}/inventory.json`.
- **Docs (`apps/site`)**: the first-run guide (en/es) mentions the All group and the reserved name.
- **Ansible service, database, gateway**: unchanged.
