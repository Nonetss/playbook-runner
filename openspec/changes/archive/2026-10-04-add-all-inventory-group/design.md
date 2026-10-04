## Context

See proposal.md for the motivation and specs/ for the required behavior.

- Inventory selections are `{ id, type: "group" | "device" }`. The same shape is declared separately in `packages/api/src/v1/run/input.ts`, in `jobs/input.ts`, in `jobs/output.ts` and in `RunInventorySelection` (`run/resolve.ts`). The job executor reads it straight from `job_runs`/`jobs.inventory_json` (`jsonb`) and casts it to `RunInventorySelection[]`.
- `resolveHosts` (`run/resolve.ts`) splits the selection into device ids and group ids, expands groups through `inventory_device_groups`, de-duplicates, then rejects empty selections, unknown ids and devices without a credential. The Ansible service only receives the final host list and puts every host under its own implicit `all` group (`materialize.py`), so group names never reach Ansible.
- Frontend pages keep the selection as two `Set<string>` (`selectedGroups`, `selectedDevices`), synced to `?groups=…&devices=…` by `features/run/lib/run-inventory-url.ts`. Each of the four pages (`run-playbook-page`, `commands-page`, `run-script-page`, `job-form-page`) builds the payload inline with the same `map(... type: "group")` expression. The job form rebuilds the sets with `inventoryFromJob`.
- Groups render through `EntityCardGrid` + `groupDefinition`, whose actions already support `hidden(item, ctx)`. `/inventory/[id]/group` mounts `GroupDetailPage`, which loads the group with `inventory.groups.get` (a uuid input).

## Goals / Non-Goals

**Goals:**
- Model All as a selection kind, not a stored group, so it is always complete and needs no migration or membership upkeep.
- Keep one place per layer that knows how All is encoded: the zod schema and `resolveHosts` in the API, and a small helper module in the frontend.

**Non-Goals:**
- No change to the Ansible service or the gRPC contract, because hosts are still resolved in the backend.
- No skipping of devices without a credential. The user chose to keep today's fail-fast rule.
- Not reworking how the job detail page and job list summarise targets. A job targeting All reports one target, as it reports one per group today.
- No database-level reservation of the `all` name and no renaming of existing groups.

## Decisions

### 1. Virtual All, encoded as `{ type: "all" }`
The selection item becomes a discriminated union on `type`: `{ type: "group", id }`, `{ type: "device", id }` and `{ type: "all" }`. The schema, its type (`RunInventorySelection`) and `splitSelection` live in `run/selection.ts`, a module with no database import so they can be unit-tested. `inventorySelectionItem(id)` builds the union. Inputs (`runInput`, `jobsInput`) use `inventorySelection` with uuid ids, and `jobs/output.ts` uses `inventorySelectionItem(z.string())` so stored rows still parse. The `$type<>` annotation of `jobs.inventory_json` (`packages/db/src/schema/jobs.ts`) is widened to the same union. This is a TypeScript-only change with no SQL or migration impact, and the user approved it during apply.

*Alternatives considered:*
- **A real `inventory_groups` row with an `is_system` flag**, with memberships maintained on device create/delete or through a trigger. Rejected: it needs a migration and a seed, can drift, and has to be protected from edits in several handlers.
- **A well-known sentinel uuid treated as a group.** Rejected: it hides a special case inside `type: "group"`, leaks a magic id into the public API and the OpenAPI docs, and would break `groups.get` callers that expect a row.

### 2. Resolution in `resolveHosts`
A pure helper (e.g. `splitSelection(inventory) → { all, deviceIds, groupIds }`) replaces the two inline filters and is unit-tested. When `all` is true, `resolveHosts` loads every device id (`select id from inventory_devices`) instead of combining direct and group ids. Group and device entries add nothing beyond de-duplication, but they are still checked: an unknown device id in the same selection still fails as today. Everything after that (the empty check, unknown ids, credentials, decryption) is unchanged, so the fail-fast behavior and the error messages stay the same. Jobs get the "follows the inventory" behavior for free, because the executor resolves at each run.

### 3. Reserved group name
`inventory/name.ts` gains `isReservedGroupName(name)`, which compares `name.toLowerCase() === "all"`, plus a `groupName` schema (`inventoryName.refine(...)`) used by `inventoryInput.groups.create`. Update can't be checked in zod alone, because a group already named `all` must stay editable. So `inventoryGroupHandler.update` reads the current name and throws `errors.BAD_REQUEST({ message })` only when the new name is reserved and differs from the stored one. Device names are not affected.

### 4. Frontend: sentinel id local to the UI
`features/inventory/all-group.ts` exports `ALL_GROUP_ID = "all"`, `isAllGroup(id)` and `makeAllGroup(description)`, which returns an `InventoryGroup`-shaped object (`name: "All"`, null timestamps). Inside the UI, All is just a group whose id is `"all"`, so the existing `Set<string>` state, `InventorySelectionList` and the URL format (`?groups=all`) work unchanged.

The API encoding lives in one helper in `features/run`:
- `toRunSelection(groups, devices): RunSelection[]` maps `"all"` to `{ type: "all" }`.
- `fromRunSelection(items)` is the inverse, used by the job form in place of `inventoryFromJob`.

All four pages switch to these helpers. `RunSelection` (`features/run/types.ts`) and `InventoryItem` (`features/jobs/types.ts`) become the union; `InventoryItem` aliases `RunSelection`.

Where All is shown:
- **Picker**: pages pass `[allGroup, ...groups]` when `devices.length > 0`. `useRunInventorySelection`'s validity filter receives the same list, so `"all"` from the URL is kept, and confirmation summaries show "All" through the same name lookup.
- **Groups list**: `inventory-page.tsx` prepends the All group when `section === "groups"`. `devicesByGroup` gets an `"all"` entry with every device. `groupDefinition` hides edit, devices and delete for `isAllGroup`. The hero count uses the extended list. The empty state for "no groups" no longer appears, because All is always listed.
- **Detail**: `GroupDetailPage` routes `id === ALL_GROUP_ID` to a new read-only `AllGroupDetailPage`, with the same `DetailFrame`/`PageHero` and a device list without toggles. It never calls `groups.get("all")`, which would fail uuid validation.
- **Search**: the groups source's `select` prepends an All entry. Its `href` produces `/inventory/all/group`.
- **Copy**: new keys in `locales/{en,es}/inventory.json` for the All description, the read-only explanation and the picker label if needed. The name "All" stays untranslated to match Ansible's term.

## Risks / Trade-offs

- **[Risk]** All makes a full-fleet run one click away, and every device without a credential blocks it. → **Mitigation:** this is the fail-fast behavior the user chose. The error already lists the offending devices.
- **[Risk]** A user-created group named `all` would look like a duplicate of the built-in one. → **Mitigation:** new ones are rejected. Existing ones keep working, and the built-in one is distinguishable because it is pinned first with no edit actions.
- **[Risk]** Older frontends or API clients that read jobs and switch on `type === "group" ? … : device` would treat `all` as a device. → **Mitigation:** the frontend ships in the same release. The `all` variant is additive and documented in OpenAPI through the shared schema.
- **[Trade-off]** The sentinel `"all"` exists only in the UI, so a raw `?groups=all` URL is UI-specific. That is acceptable because it never reaches the API in that form.

## Migration Plan

No database migration. Deploy backend and frontend together, as the images are released in lockstep. Rollback is a plain image rollback. Any jobs saved with `{ type: "all" }` would then fail validation on read in the older backend, so delete or re-target such jobs before rolling back.
