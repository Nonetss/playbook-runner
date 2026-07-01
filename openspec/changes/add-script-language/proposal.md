## Why

Stored scripts today are implicitly bash-only: the content is materialized to a `.sh` file and executed via the Ansible `script` module, relying on whatever shebang the user happens to write. Operators often keep automation in Python too, and forcing them to embed a `#!/usr/bin/env python3` shebang by hand is easy to get wrong and invisible in the UI. Just as ad-hoc commands let the user pick a `module` (`shell` | `command`), scripts should let the user pick a language (`bash` | `python`) so the platform materializes and runs the script with the right interpreter.

## What Changes

- Add a `language` attribute to stored scripts with the values `bash` and `python`, defaulting to `bash`.
- The Scripts create/edit form gains a language selector (mirroring the command page's module toggle), and persists the chosen language through the scripts CRUD API.
- Script execution materializes the script with the correct file extension and guarantees the appropriate interpreter is used (a `bash` or `python3` shebang is ensured when the content lacks one) so the Ansible `script` module runs it under the selected language.
- The script run page surfaces which language a script will run as.
- Existing scripts without a stored language continue to run as `bash` (no breaking change).

## Capabilities

### New Capabilities
<!-- None: this extends existing script capabilities rather than introducing new ones. -->

### Modified Capabilities

- `bash-script-management`: scripts gain a required-with-default `language` field (`bash` | `python`) across create, read, update, list, and the Scripts form UI.
- `bash-script-execution`: the resolve/materialize/execute path carries the script's `language` and runs it with the matching interpreter instead of assuming bash.

## Impact

- **Database**: `scripts` table gains a `language` column (`packages/db/src/schema/scripts.ts`) plus a migration with a `bash` default/backfill.
- **API**: scripts oRPC router + handler input/output schemas gain `language` (`packages/api/src/routers/scripts.ts`, `packages/api/src/handlers/scripts.ts`); the run resolve procedure includes `language` in the resolved script bundle.
- **Ansible service**: `resolve_script` bundle and `write_script_file` (`apps/ansible/app/services/ansible/materialize.py`, `backend_client.py`) honor the language for extension + shebang; `script.py` route passes it through.
- **Frontend**: Scripts form and run page (`apps/frontend/src/components/features/scripts/**`) add a language selector and display.
- **Backward compatibility**: scripts with no language default to `bash`; no consumer is forced to send the new field.
