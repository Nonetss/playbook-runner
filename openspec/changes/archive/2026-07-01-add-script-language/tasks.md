## 1. Database

- [x] 1.1 Add a `language` column to `packages/db/src/schema/scripts.ts` as `text` constrained to `"bash" | "python"`, `.notNull().default("bash")`
- [x] 1.2 Generate the Drizzle migration and confirm it adds the column with a `bash` default and backfills existing rows

## 2. API (oRPC)

- [x] 2.1 Add `language: z.enum(["bash", "python"])` to `scriptSchema` output in `packages/api/src/routers/scripts.ts`
- [x] 2.2 Add optional `language` (defaulting to `bash`) to the `create` and `update` input schemas
- [x] 2.3 Ensure `scriptsHandler` create/update in `packages/api/src/handlers/scripts.ts` persists `language`
- [x] 2.4 Add `language` to `resolveScriptOutputSchema.script` in `packages/api/src/routers/run.ts` and include it in `runHandler.resolveScript` (default absent values to `bash`)

## 3. Ansible service

- [x] 3.1 Add `language` to `ResolvedScript` in `apps/ansible/app/services/ansible/backend_client.py` (default `bash`) and confirm `resolve_script` maps it from the backend response
- [x] 3.2 Update `write_script_file` in `apps/ansible/app/services/ansible/materialize.py` to take a `language`, choose the `.sh`/`.py` extension, and prepend `#!/usr/bin/env bash` / `#!/usr/bin/env python3` only when `content.lstrip()` does not start with `#!`
- [x] 3.3 Pass `bundle.script.language` into `write_script_file` from `apps/ansible/app/api/routes/v0/script.py`

## 4. Frontend

- [x] 4.1 Add `language` to the script types (`apps/frontend/src/components/features/scripts/types.ts`) and form values in `script-form-page.tsx`
- [x] 4.2 Add a language selector (bash/python) to the create/edit form, defaulting to `bash` and preselecting the stored language when editing, and send `language` on create/update
- [x] 4.3 Display the script's `language` on the run page (`run-script-page.tsx`) as a read-only badge

## 5. Verification

- [x] 5.1 Create a `python` script via the UI, run it against a host, and confirm it executes under `python3`; create/run a `bash` script and confirm it still runs under bash
- [x] 5.2 Confirm a pre-existing script (no stored language) resolves and runs as `bash`
- [x] 5.3 Confirm a script whose content already has a shebang is not given a second one
