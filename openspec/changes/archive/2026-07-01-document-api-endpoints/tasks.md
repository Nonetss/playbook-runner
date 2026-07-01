## 1. Base procedures — common errors

- [x] 1.1 In `packages/api/src/index.ts`, add `.errors({ INTERNAL_SERVER_ERROR })` to `publicProcedure` and `.errors({ UNAUTHORIZED, FORBIDDEN })` to `protectedProcedure` (before `.use(requireAuth)`), each with a meaningful message + status.
- [x] 1.2 Confirm `requireAuth`'s `throw new ORPCError("UNAUTHORIZED")` type-checks against the newly declared error and that `check-types` passes.

## 2. Write the standard down

- [x] 2.1 Add a short "API endpoint documentation standard" doc (in `packages/api/README.md`) describing the required shape: `.route({ summary, description, tags, method })` + `.output(schema)` + endpoint-specific `.errors()`, and the common-errors-on-base-procedure convention. Include the canonical example.
- [x] 2.2 Add a brief pointer comment in `packages/api/src/index.ts` next to the base procedures linking to the standard.

## 3. Response schemas per resource

- [x] 3.1 Define reusable Zod response schemas colocated with each router (`credentialSchema`, `deviceSchema`/`groupSchema`, `jobSchema`/`jobRunSchema`, `playbookSchema`, `scriptSchema`, and the `config` api-key schemas already present), using `z.coerce.date()` for timestamps; export inferred types.
- [x] 3.2 Decide per resource whether `get`-by-id uses `schema.nullable()` or declares `NOT_FOUND` and returns non-null (prefer `NOT_FOUND` where the frontend doesn't rely on a `null` body).

## 4. Apply the standard — router by router

- [x] 4.1 `config.ts`: normalize `apiKeys.list` to the standard (drop `deprecated`/`inputStructure`/`outputStructure`/`successStatus` noise, keep only reachable errors); add `.output()` + specific `.errors()` to `create` and `delete`.
- [x] 4.2 `credentials.ts`: add `description` where missing, `.output()` schemas, and specific `.errors()` (e.g. `NOT_FOUND` on get/update/delete) to all 6 procedures.
- [x] 4.3 `playbooks.ts`: same treatment across all 5 procedures.
- [x] 4.4 `scripts.ts`: same treatment across all 5 procedures.
- [x] 4.5 `inventory.ts`: same treatment across all 15 procedures (devices, groups, device-groups), filling missing `description`s.
- [x] 4.6 `jobs.ts`: same treatment across all 9 procedures, filling the missing `description`s and adding `.output()` (jobs, runs) + errors (`NOT_FOUND` on get/run/update/delete).
- [x] 4.7 `run.ts`: keep existing `.output()`; add `description`s where thin and endpoint-specific `.errors()` (`NOT_FOUND`, `PRECONDITION_FAILED`, `BAD_REQUEST`) matching the ORPCErrors already thrown.
- [x] 4.8 `index.ts` root: bring `healthCheck` and `privateData` to the standard (`.output()` + appropriate tags/description; `healthCheck` stays public).

## 5. Verification

- [x] 5.1 Run `check-types` for `packages/api` and confirm every handler return validates against its `.output()` schema (no type errors). *(Verified: `cd packages/api && bunx tsc --noEmit` reports only the 5 pre-existing errors that were present before this change — no new errors introduced. The `backend:check-types` failure on `@/...` resolution across workspace boundaries is a pre-existing workspace infra issue unaffected by this change.)*
- [x] 5.2 Start the backend, fetch `/openapi.json`, and confirm every path documents a response schema and its error statuses; spot-check `/scalar` renders them.
- [x] 5.3 Grep the routers to confirm no procedure is missing `summary`/`description`/`tags`/`method`/`.output()`, and that no endpoint re-declares the common errors. *(Verified via `rg`: 49 procedures × 4 required metadata keys (`summary`, `description`, `tags`, `method`) all present; per-router `.route()` count equals `.output()` count; no `deprecated: false` / `inputStructure` / `outputStructure` / `successStatus` remain; `.errors()` blocks do not contain `UNAUTHORIZED` / `FORBIDDEN` / `INTERNAL_SERVER_ERROR` outside the base procedures. The textual mentions of these codes in `description:` lines on `config.ts` and `index.ts` are explanatory references — not re-declarations.)*
