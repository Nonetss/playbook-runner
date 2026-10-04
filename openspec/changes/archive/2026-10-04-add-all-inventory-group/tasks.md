## 1. API: selection schema and resolution

- [x] 1.1 Define one exported discriminated-union inventory selection schema (`group`+id, `device`+id, `all`) in `packages/api/src/v1/run/input.ts` and use it in `runInput.run/command/script`. Verify with a colocated `input.test.ts`: `[{ type: "all" }]` parses, `{ type: "group" }` without id is rejected, and `{ type: "all", id }` is rejected or stripped consistently.
- [x] 1.2 Reuse that schema in `jobs/input.ts`, and accept the `all` variant in `jobs/output.ts`, keeping `id: z.string()` for stored group/device rows. Verify with a test that a job body with `[{ type: "all" }]` parses through both schemas and that `bun run --filter @playbook-runner/api check-types` passes.
- [x] 1.3 Turn `RunInventorySelection` in `run/resolve.ts` into the matching union and add a pure `splitSelection` helper (`{ all, deviceIds, groupIds }`). Verify with `resolve`-adjacent unit tests covering all-only, mixed and group/device-only selections. The tests must not touch the database; move the helper to its own module if importing `resolve.ts` pulls in `db`.
- [x] 1.4 Make `resolveHosts` load every device id when `all` is set, keeping the de-duplication, empty-selection, unknown-id and credential checks unchanged. Verify with `check-types` and by reading the diff: the error paths are untouched and `jobs/executor.ts` still compiles with the new type.
- [x] 1.5 Mention the All selection in the run and jobs route descriptions (`run/router.ts`, `jobs/router.ts`). Verify that the `/openapi.json` schema shows the three-variant selection.

## 2. API: reserved group name

- [x] 2.1 Add `isReservedGroupName` and a `groupName` schema to `inventory/name.ts`, and use `groupName` for `inventoryInput.groups.create`. Verify with `name.test.ts` cases: `all`, `All` and `ALL` are reserved, `all-hosts` and `ball` are not, and the device schema still accepts `all`.
- [x] 2.2 In `inventoryGroupHandler.update`, throw `errors.BAD_REQUEST({ message })` when the new name is reserved and differs from the stored name. Verify with `check-types` and a manual `/rpc/v1/inventory/groups/update` call (or Scalar): renaming `web` → `all` returns 400, and saving an existing `all` group with the same name succeeds.
- [x] 2.3 Run `bun run --filter @playbook-runner/api test` and confirm that all API tests pass.

## 3. Frontend: shared All helpers

- [x] 3.1 Create `apps/frontend/src/features/inventory/all-group.ts` with `ALL_GROUP_ID`, `isAllGroup` and `makeAllGroup(description)`. Verify that `astro check` passes.
- [x] 3.2 Make `RunSelection` (`features/run/types.ts`) the union, alias `InventoryItem` in `features/jobs/types.ts` to it, and add `toRunSelection`/`fromRunSelection` in `features/run/lib/`. Verify with `astro check` passing.
- [x] 3.3 Add the copy keys (All description, read-only explanation and any picker/detail strings) to `locales/en/inventory.json` and `locales/es/inventory.json` with matching key sets. Verify that both files contain the same keys.

## 4. Frontend: groups list and detail

- [x] 4.1 In `inventory-page.tsx`, prepend the All group on the groups section, give it every device in `devicesByGroup`, and include it in the hero count. Verify in the browser: `/inventory/groups` shows All first with the total device count, including when no groups exist.
- [x] 4.2 Hide the edit, devices and delete actions for `isAllGroup` in `group.definition.tsx`. Verify in the browser that the All card's menu only offers "Manage"/open.
- [x] 4.3 Add `features/inventory/components/all-group-detail-page.tsx` (read-only device list, explanation, no form or danger zone) and route `GroupDetailPage` to it when `id === ALL_GROUP_ID`. Verify in the browser that `/inventory/all/group` lists every device and makes no `groups.get` request.

## 5. Frontend: picker, run pages, jobs and search

- [x] 5.1 Pass `[allGroup, ...groups]` (only when devices exist) to `InventorySelectionList` and to `useRunInventorySelection` in `run-playbook-page.tsx`, `commands-page.tsx`, `run-script-page.tsx` and `job-form-page.tsx`, and build payloads with `toRunSelection`. Verify in the browser: selecting All on a playbook run sends `inventory: [{ type: "all" }]` (devtools network tab), and the confirmation names "All".
- [x] 5.2 Replace `inventoryFromJob` in `job-form-page.tsx` with `fromRunSelection`. Verify in the browser: a job saved with All reopens with All selected and saves back unchanged.
- [x] 5.3 Verify the run-page URL round-trip: selecting All writes `?groups=all`, and a reload keeps All selected.
- [x] 5.4 Prepend an All entry to the groups source in `features/app-shell/model/surface-search-sources.ts`. Verify in the browser: typing `all` in ⌘K shows All under groups and opens `/inventory/all/group`.

## 6. Docs and final checks

- [x] 6.1 Update `apps/site/src/content/docs/{en,es}/first-run.md` to mention the built-in All group and that `all` is a reserved group name. Verify that both languages say the same.
- [x] 6.2 Run `bun run check`, `bun run check-types` and `bun run test` and confirm they pass with no new Biome findings, including no raw palette colours in the new frontend files.
- [x] 6.3 End-to-end smoke test against the dev stack. Verify that a job targeting All, executed with "Run now", includes a device added after the job was saved, and that a device without a credential blocks the run with an error naming it.
