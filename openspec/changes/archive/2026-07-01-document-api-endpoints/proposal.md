## Why

The API already generates an OpenAPI/Scalar reference at `/scalar` and `/openapi.json` from the oRPC routers, but endpoint documentation is inconsistent: most procedures carry `summary`/`tags`/`method`, several are missing `description`, only `run.*` declares typed `.output()` response schemas, and only one procedure (`config.apiKeys.list`, currently a hand-rolled "test") declares `.errors()`. The result is a reference that describes requests but under-documents responses and error codes. We want a single, enforced documentation standard applied to every endpoint so the generated reference is complete and trustworthy.

## What Changes

- Define an **endpoint documentation standard** every oRPC procedure must follow: `summary`, `description`, `tags`, `method`, a typed `.output()` response schema, and `.errors()` covering the codes that endpoint can actually return.
- **Centralize common errors** on the base procedures: `protectedProcedure`/`publicProcedure` declare the shared codes (`UNAUTHORIZED`, `FORBIDDEN`, `INTERNAL_SERVER_ERROR`) once, so each endpoint only adds its specific ones (`NOT_FOUND`, `BAD_REQUEST`, `CONFLICT`, …). No 25-line error block copy-pasted per procedure.
- Add **reusable response schemas** per resource (Zod), used by `.output()` and exported as inferred types, replacing ad-hoc/implicit response typing.
- **Apply the standard to all routers**: `config`, `credentials`, `inventory`, `jobs`, `playbooks`, `run`, `scripts`, plus the root `healthCheck`/`privateData`. Trim redundant metadata noise (`deprecated: false`, default `inputStructure`/`outputStructure: "compact"`, default `successStatus: 200`) from the reference example.
- Document the convention itself so future endpoints follow it without guessing.

## Capabilities

### New Capabilities

- `api-endpoint-documentation`: A required, uniform documentation contract for every oRPC endpoint (metadata, typed response schema, declared errors) that drives a complete OpenAPI/Scalar reference.

### Modified Capabilities
<!-- Behavior of the endpoints is unchanged; this governs their documentation surface, not their logic. The existing rpc-api / api-documentation specs keep their runtime behavior. -->

## Impact

- **`packages/api/src/index.ts`**: `protectedProcedure`/`publicProcedure` gain a shared `.errors(...)` base map.
- **`packages/api/src/routers/*.ts`**: every procedure gets `description` (where missing), a `.output()` schema, and endpoint-specific `.errors()`; the `config.apiKeys.list` "test" is normalized to the same standard (drop noise fields).
- **Response schemas**: new Zod schemas per resource (colocated with each router or a small `schemas` module) reused by `.output()`.
- **Generated docs**: `/scalar` and `/openapi.json` become complete (responses + error codes documented). No wire/behavior change for existing RPC clients.
- **Convention doc**: a short standard reference (e.g. a section in `packages/api` docs / AGENTS note) describing the required shape.
