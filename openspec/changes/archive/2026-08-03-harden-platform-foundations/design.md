## Context

The oRPC router is currently a flat public contract. Several endpoint routers
also construct transport errors and one calls Better Auth directly. Shared
source packages have no Turbo build nodes, so a watcher has no declared edge
to restart consuming apps. The Ansible FastAPI service exposes a health route
under `/api/health`, but Compose does not probe it and root checks omit Python.

## Goals / Non-Goals

**Goals:**

- Establish a stable `/rpc/v1/...` and `/api/v1/...` contract.
- Centralize standard oRPC errors and move API-key business logic into a
  handler.
- Make local development, quality validation, and Compose readiness explicit.
- Record durable product and visual-system decisions.

**Non-Goals:**

- No schema, migration, authentication-model, or feature behavior changes.
- No compatibility alias for the unversioned public API; this is an intentional
  major-contract transition before external adoption.

## Decisions

- The package root owns shared context, procedures, errors, and a router that
  nests a `v1` router. This makes a future `v2` additive rather than invasive.
- The frontend exports the `v1` branch as its local `orpc` helper, retaining
  concise feature code while all network paths are versioned.
- `errors.ts` owns one complete oRPC error map. Feature handlers translate
  domain errors through that map; routers only describe transport wiring.
- Shared raw-TypeScript packages get no-op `build` tasks. `turbo watch dev`
  observes their source changes and restarts their consumers.
- The Ansible health endpoint remains `/api/health`, matching its existing
  route namespace, and Compose waits for it before starting the backend.

## Risks / Trade-offs

- [Existing scripts call unversioned URLs] → Document the breaking change and
  update all first-party callers in this change.
- [Watcher restarts interrupt active local requests] → Apply it only to local
  `dev`; production builds remain deterministic.
- [Python quality tools need a local uv environment] → Turbo delegates to
  `uv run`, which uses the lockfile-managed environment.

## Migration Plan

1. Deploy backend and frontend together because their contract changes in the
   same release.
2. Update any external caller to add the `/v1` path segment.
3. Roll back both images together to restore the prior contract if necessary.
