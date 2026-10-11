## Context

The picker is one presentational component, `InventorySelectionList` (`apps/frontend/src/features/run/components/inventory-selection-list.tsx`), used by four surfaces: `run-playbook-page.tsx`, `job-form-page.tsx`, `run-script-page.tsx` and `commands-page.tsx`. Each page owns two `Set<string>` states (`selectedGroups`, `selectedDevices`) and passes toggle callbacks (`toggleIn(...)`, or inline setters in the job form). The run pages sync the sets to the URL through `useRunInventorySelection`, and every surface converts them with `toRunSelection` before calling the API. The groups list includes the virtual All group (`ALL_GROUP_ID = "all"`, from `useSelectableGroups`).

Today the picker has no group membership: groups and devices are two independent flat lists. Membership is available from `inventory.deviceGroups.list` (every `{ deviceId, groupId }` row), already wrapped by `useDeviceGroupsList()` in `features/inventory/hooks/use-device-groups.ts` and used by the inventory page. Its query cache is therefore shared. The backend already expands groups and de-duplicates hosts (`resolveHosts`), so sending a group plus a device it contains is harmless.

See proposal.md for motivation, and specs/inventory-picker/spec.md for the required behaviour.

## Goals / Non-Goals

**Goals:**
- Derive the "covered by a selected group" state for devices inside the picker, with no change to the page-owned selection state or to what is submitted.
- One implementation for all four surfaces.

**Non-Goals:**
- Expanding groups into device entries in the selection, URL or stored job (the user chose implicit coverage).
- Changing the run button / job form "N selected" counts: they keep counting the entries the operator selected directly (groups + devices), as the confirmation copy and target names do.
- Showing group membership inside the Groups section (e.g. per-group device counts) or nesting devices under groups.
- Any API, schema or migration change.

## Decisions

### 1. Membership is fetched inside the picker
`InventorySelectionList` calls `useDeviceGroupsList()` itself instead of receiving relations as a new prop from each page.
- Why: all four surfaces get the behaviour with no page changes, and the query is cached under the same key as the inventory page. Every picker surface is behind authentication, like the procedure.
- Alternative: a `groupMembers` prop computed by each page. Rejected because it repeats the same fetch and wiring four times for no gain. The component already depends on inventory types.
- While the query is pending or has failed, the coverage map is empty, so the picker behaves exactly as today (spec: no device shown as covered while loading).

### 2. A pure helper computes coverage
Add `coveredDevices(selectedGroups, groups, devices, relations)` to `features/run/lib/run-selection.ts`. It returns `Map<deviceId, groupId[]>`:
- If `ALL_GROUP_ID` is selected, every device maps to `[ALL_GROUP_ID]`, followed by any other selected groups that contain it.
- Otherwise each relation whose `groupId` is selected adds that group to its device's entry.
- Group ids in each entry follow the order of the `groups` prop (All first, then the list order). The first entry names the hint, and the rest count as "+N".
- Relations whose device or group no longer exists in the lists are ignored.

The component memoizes it on `(selectedGroups, groups, devices, relations)`. The helper lives next to `toRunSelection`/`fromRunSelection` because it interprets the same id sets, including the All sentinel.

### 3. Implicit coverage: the component guards toggles and never writes state
Covered rows do not call `onToggleDevice`. The pages' sets are never mutated by a group toggle. So:
- deselecting a group automatically "uncovers" its devices, with no bookkeeping.
- a device selected directly stays in `selectedDevices` while covered. It is not pruned when the group is selected, so deselecting the group returns it to its direct state, as the spec requires, and the payload stays exactly what the operator picked. The redundancy is harmless because the backend de-duplicates hosts.
- Alternative: on group select, remove the devices it covers from `selectedDevices`. Rejected: it loses the operator's direct choices and needs reverse logic on deselect.

### 4. Row states and accessibility
`SelectionRow` gets a `covered` state (with the hint text) on top of `selected`:
- Every row button exposes `aria-pressed` (selected or covered). It is new for all rows and gives E2E tests a stable assertion.
- Covered rows set `aria-disabled="true"`, make `onClick` a no-op and use `cursor-default`, but keep full opacity. They do not use the native `disabled` attribute, because its `opacity-60` styling reads as "unavailable" rather than "already included", and a natively disabled button cannot keep a `title` tooltip.
- Checkbox visual: direct selection keeps the filled `border-primary bg-primary` box. Covered uses an outlined box with the check (`border-primary text-primary`, no fill). The single accent of DESIGN.md is reused, and the two states are distinguishable without new colours.
- The secondary line shows the device's address followed by the hint, e.g. `192.0.2.10 · incluido por web` / `… · incluido por web +1`. A covered row hidden by search keeps its state. The search only filters what is shown.

### 5. Copy lives in the `inventory` namespace
The hint is identical on all surfaces, so the component reads it with `useTranslation("inventory")` (`picker.included_by` with `{{group}}`, `picker.included_by_more` with `{{group}}` and `{{count}}`) in `en` and `es`. The existing `labels` prop stays for the strings that differ per page.
- Alternative: a new required `labels.includedBy`. Rejected: four namespaces × two locales would hold the same string.
- The All group's name is the literal `All` (as in `makeAllGroup`), so the hint reads "incluido por All".

### 6. Counter
`SelectionSection` receives an `isSelected(id)` predicate (selected directly **or** covered) instead of comparing against the raw set, so the Devices `n/total` counter counts covered devices once. The Groups section keeps using its own set.

### 7. Testing
The frontend has no unit-test runner (`bun test` runs only in `packages/api`), so the helper is covered by the Playwright suite. A new spec, `apps/frontend/tests/e2e/inventory-picker-coverage.spec.ts`, creates its own fixtures through `/rpc` (one group, two devices on TEST-NET addresses `192.0.2.x` without credentials, one assignment) and deletes them in `finally`. On the commands page, which needs no playbook, it asserts coverage, the lock, the restore on deselect and the counter. On the playbook run page it intercepts the run call, as `inventory-all-group.spec.ts` does, to assert the payload and URL contain only the group. It skips when no playbook exists.

## Risks / Trade-offs

- [Membership is shown as of the page's fetch; it can go stale if someone reassigns devices in another tab] → The same query refetches on window focus like the rest of the app. The backend always resolves at execution time, so the run is never wrong, only the preview.
- [Operators may expect to un-check one device of a group] → Out of scope by design (implicit coverage). The locked row and its hint explain why; to exclude a device they select devices individually instead of the group.
- [Large inventories: one more list query per picker] → `deviceGroups.list` is a single table read already used by the inventory page. The coverage computation is linear in relations and memoized.
- [`aria-pressed` added to every row changes accessible names/roles used by existing E2E specs] → The role stays `button` and the name is unchanged. Existing selectors (`getByRole("button", { name: /^All/ })`) keep matching.

## Migration Plan

Frontend-only and additive: no data or API change. Ship with a normal frontend deploy; rollback is reverting the commit.
