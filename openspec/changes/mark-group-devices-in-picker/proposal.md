## Why

In the shared inventory picker (playbook run page, job create/edit form, script runs and ad-hoc commands), selecting a group gives no feedback about which devices it covers: the Devices section stays unchecked, so the operator can't tell at a glance which hosts the run or job will actually target, and may pick devices by hand that the group already includes.

## What Changes

- When a group is selected, every device that belongs to it is shown as checked in the Devices section, marked as included by that group. Selecting the built-in All group marks every device.
- The marking is **implicit**: the stored and sent selection keeps only the group entry (`{ id, type: "group" }` or `{ type: "all" }`). Devices covered by a group are not added to the device selection, the run URL (`?groups=…&devices=…`) or the job's `inventoryJson`, so a job keeps following the group's membership when it changes later.
- A device covered by a selected group can't be toggled on its own while the group stays selected; deselecting the group returns the device to its own explicit state (checked only if the operator had selected it directly).
- The Devices section counter (`n/total`) counts covered devices as selected, so a collapsed section still shows how many hosts the selection reaches.
- The behaviour lives in the shared `InventorySelectionList`, so it applies equally to playbook runs, job forms, script runs and commands.

No API, database or migration changes; group membership is read from the existing `inventory.deviceGroups.list` procedure.

## Capabilities

### New Capabilities

- `inventory-picker`: behaviour of the shared group/device picker used by runs, commands, scripts and the job form, starting with showing the devices that the selected groups cover.

### Modified Capabilities

None. `inventory-all-group` already requires All in the picker and its `{ type: "all" }` wire format; that stays unchanged, and the new capability only adds how its coverage is displayed.

## Impact

- `apps/frontend/src/features/run/components/inventory-selection-list.tsx`: covered-device state, locked rows, "included by" hint, counter.
- `apps/frontend/src/features/run/lib/run-selection.ts` (or a sibling module): pure helper that maps selected groups to covered device ids.
- `apps/frontend/src/features/inventory/hooks/use-device-groups.ts`: reused (`useDeviceGroupsList`), no change expected.
- Locales `apps/frontend/src/locales/{en,es}/inventory.json`: copy for the "included by group" hint.
- Pages using the picker (`run-playbook-page.tsx`, `job-form-page.tsx`, `run-script-page.tsx`, `commands-page.tsx`): no change in what they submit.
- New Playwright E2E coverage in `apps/frontend/tests/e2e`.
