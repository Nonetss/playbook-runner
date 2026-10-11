## 1. Coverage logic

- [x] 1.1 Add `coveredDevices(selectedGroups, groups, devices, relations)` to `apps/frontend/src/features/run/lib/run-selection.ts`. It returns `Map<deviceId, groupId[]>`, handles the `ALL_GROUP_ID` sentinel (every device), orders group ids like the `groups` list and ignores relations to unknown devices/groups (design §2). Verify with `bun run --filter frontend check-types`.

## 2. Picker component

- [x] 2.1 In `inventory-selection-list.tsx`, read membership with `useDeviceGroupsList()`. Memoize `coveredDevices(...)` over the props and relations, with an empty map while pending or errored (design §1). Verify with `check-types`, and confirm in the browser that the network shows one `inventory/deviceGroups/list` call per picker page.
- [x] 2.2 Extend `SelectionRow` with a `covered` state: `aria-pressed` on every row; for covered rows, `aria-disabled="true"`, a no-op click, an outlined primary check box and the address followed by the "included by" hint (design §4). Verify in the browser that selecting a group on `/commands` checks its devices with the outlined style and the hint, and that clicking one changes nothing.
- [x] 2.3 Change `SelectionSection` to take an `isSelected(id)` predicate so that the Devices counter counts devices that are selected directly or covered, once each (design §6). Verify that with one group of 2 devices plus 1 direct device the collapsed Devices header reads `3/<total>`.
- [x] 2.4 Add `picker.included_by` / `picker.included_by_more` to `apps/frontend/src/locales/en/inventory.json` and `es/inventory.json`, and use them from the component through `useTranslation("inventory")` (design §5). Verify that the hint reads "incluido por web +1" in Spanish when two selected groups cover a device, and that `check-types` passes.

## 3. Surfaces

- [x] 3.1 Confirm that `run-playbook-page.tsx`, `job-form-page.tsx`, `run-script-page.tsx` and `commands-page.tsx` need no changes: selection state, URL sync and `toRunSelection` payloads stay as they are. Verify manually that selecting a group on `/playbooks/<id>/run` leaves the URL with only `groups=<id>`, and that a job edit form for a group-only job shows its members covered.

## 4. Tests and checks

- [x] 4.1 Add `apps/frontend/tests/e2e/inventory-picker-coverage.spec.ts` (design §7). Use RPC fixtures (group, two `192.0.2.x` devices, one assignment) cleaned up in `finally`. On `/commands`, assert coverage (`aria-pressed`, hint), the lock, the restore after deselect while keeping a direct selection, and the counter. On the playbook run page, intercept `/rpc/v1/run/` and assert that the payload is `[{ id, type: "group" }]` and that the URL has no `devices`, skipping when no playbook exists. Verify with `bun run test:e2e` (backend running with the seeded admin).
- [x] 4.2 Run `bun run check` (Biome), `bun run check-types` and the existing `inventory-all-group.spec.ts` E2E to confirm that the new `aria-pressed` attribute did not break its selectors. All must pass.
