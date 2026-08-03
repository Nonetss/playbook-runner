## Why

The application has grown beyond its initial template boundaries: its API
contract is unversioned, reliability checks are incomplete, and the Python
service is not included in the repository's quality gates. Making these
cross-cutting conventions executable now prevents incompatible clients and
deployment failures as playbook execution expands.

## What Changes

- **BREAKING** Version the public oRPC and OpenAPI surface below `v1`.
- Centralize oRPC error construction and move API-key business logic out of
  its router.
- Make shared TypeScript package changes restart dependent dev applications.
- Add Python formatting and type-checking tasks to the monorepo quality gates.
- Add a healthcheck for the Ansible service.
- Document the product operating model and visual system.

## Capabilities

### New Capabilities

- `service-health`: Readiness checks for every Compose service.

### Modified Capabilities

- `rpc-api`: Version RPC and HTTP API procedure paths under `v1`.

## Impact

This affects `packages/api`, the backend HTTP adapters, the frontend oRPC
client, Turbo task graph, Python service tooling, Docker Compose, and root
documentation. No database schema or migration changes are required.
