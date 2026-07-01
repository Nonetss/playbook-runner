## Context

Stored scripts are persisted as a single `content` text column and executed with the Ansible `script` module. The module transfers the file to each host and executes it, letting the remote shell pick the interpreter from the shebang. `write_script_file` always names the file `<name>.sh` and never injects a shebang, so a Python script only works if the author remembers the `#!/usr/bin/env python3` line. Ad-hoc commands already model an analogous choice with `module: "shell" | "command"`, so users expect a comparable, explicit selector for scripts.

The stack is a Turborepo monorepo: Drizzle/Postgres (`packages/db`), an oRPC API (`packages/api`), a React frontend (`apps/frontend`), and a FastAPI + ansible-runner service (`apps/ansible`) that resolves scripts through the backend before running them.

## Goals / Non-Goals

**Goals:**

- Persist a `language` (`bash` | `python`) per script and thread it through CRUD, the resolve bundle, and execution.
- Materialize scripts with the right extension and guarantee the correct interpreter runs them.
- Expose the language in the Scripts form (selector) and run page (display), mirroring the command module UX.
- Keep existing bash scripts working with zero user action.

**Non-Goals:**

- Supporting languages beyond `bash` and `python` (the enum is deliberately small; more can be added later).
- Managing remote interpreter installation (we assume `bash` and `python3` exist on targets, same assumption Ansible already makes).
- Per-run language override — language is a property of the stored script, not the run request.

## Decisions

**1. Model `language` as a Postgres enum-like text column with a `bash` default.**
Use a Drizzle `text` column constrained to `"bash" | "python"` with `.default("bash").notNull()` and a migration that backfills existing rows to `bash`. Rationale: a NOT NULL column with a default keeps the resolve/serialization path total (no nullable handling downstream) while remaining backward compatible. Alternative considered: a nullable column treated as bash at read time — rejected because it pushes null-coalescing into every consumer (API, resolver, materialize).

**2. Interpreter selection via shebang + extension, not the `script` module's `executable`/`cmd` options.**
`write_script_file` receives the language and (a) names the file `.sh` or `.py`, and (b) if the content does not already start with `#!`, prepends `#!/usr/bin/env bash` or `#!/usr/bin/env python3`. The Ansible `script` module then honors the shebang as it already does. Rationale: this keeps the runner call unchanged, preserves author-supplied shebangs, and matches how the `script` module is designed to work. Alternative considered: passing `executable`/wrapping `module_args` as `python3 <path>` — rejected as more brittle and inconsistent with how bash scripts already run.

**3. Language lives on the stored script, resolved into the run bundle — not sent in the run request.**
`resolve_script` includes `language` in the returned bundle (defaulting absent values to `bash`), and `script.py` passes it to `write_script_file`. The `ScriptRequest` body is unchanged. Rationale: the run page runs a specific stored script; the language is intrinsic to that script, so the API surface for running stays stable.

**4. Frontend mirrors the command page's module control.**
Add a `language` field to the form values with a small segmented/select control defaulting to `bash`, and reuse the existing command-module selector pattern for visual consistency. The run page shows a read-only badge. Rationale: consistency with the established `shell` | `command` UX reduces cognitive load.

## Risks / Trade-offs

- **Prepending a shebang could conflict with a leading blank line or BOM in content** → Only prepend when the first non-empty character sequence is not `#!`; normalize by checking `content.lstrip().startswith("#!")` before injecting, and keep the existing trailing-newline handling.
- **Target host lacks `python3`** → Out of scope to install, but the failure surfaces cleanly through the existing per-host SSE error/rc path, same as any other missing binary.
- **Migration backfill on a large `scripts` table** → The default + single `UPDATE ... SET language='bash'` is O(rows) but scripts are low-cardinality operational records; negligible in practice. Rollback is dropping the column.
- **Enum drift between DB, oRPC schema, and Pydantic/Python** → Mitigated by centralizing the two allowed values and covering create/update/resolve with the spec scenarios so a mismatch fails a test rather than silently.

## Migration Plan

1. Add the `language` column with `DEFAULT 'bash' NOT NULL` and generate the Drizzle migration; existing rows backfill to `bash`.
2. Ship API + resolver changes (default absent language to `bash` for safety even though the column is NOT NULL).
3. Ship Ansible `write_script_file` + `script.py` changes.
4. Ship the frontend selector and run-page display.

Rollback: revert the code changes and drop the `language` column; scripts revert to implicit bash behavior with no data loss.

## Open Questions

- None blocking. Future work may extend the enum (e.g. `sh`, `pwsh`) — the design intentionally leaves room for that without reshaping the request/bundle contract.
