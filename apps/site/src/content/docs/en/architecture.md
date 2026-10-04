---
title: Architecture
description: How the gateway, frontend, backend and Ansible executor fit together, and where your secrets live.
order: 5
---

Playbook Runner is a monorepo with three services behind a Caddy gateway, plus PostgreSQL. Only the gateway publishes a port, so the browser sees a single origin and the executor that touches your hosts is never reachable from outside.

| Service | Stack | Port | Role |
| --- | --- | --- | --- |
| Gateway | Caddy | `80` (published), `50050` (internal) | Public HTTP entry point and internal gRPC router. |
| Frontend | Astro SSR, React | `4321` (internal) | The web interface. |
| Backend | Bun, Hono, oRPC, Better Auth, Drizzle | `3000` (internal) | Authentication, the API, business rules, the scheduler. Owns the database. |
| Executor | Python, FastAPI, gRPC, ansible-runner | `50051` (internal) | Runs Ansible. Has no database. |
| PostgreSQL | PostgreSQL 17 | `5432` (internal) | Users, inventory, credentials, playbooks, jobs and history. |

## Request paths

The gateway sends `/rpc`, `/api`, `/scalar` and `/openapi.json` to the backend and every other path to the frontend.

The backend reaches the executor over gRPC through the gateway's internal router on `:50050`, which routes by proto package: `/run.*` goes to the executor on `:50051`, anything else answers `UNIMPLEMENTED`.

## Anatomy of a run

1. You press **Run** in the browser. The frontend calls the backend over oRPC and keeps the response open as an event stream.
2. The backend checks your session, then **resolves the run** against its database: the playbook content (or, for a Git playbook, the repository and the commit it was synced at), the deduplicated list of hosts and, for each one, its SSH user and decrypted private key.
3. It sends that complete payload to the executor in one server-streaming gRPC call, authenticated with the shared `SERVICE_TOKEN`.
4. The executor writes a temporary inventory and key files (and, for Git playbooks, exports the pinned commit from its mirror), then hands them to `ansible-runner`.
5. Every event Ansible emits travels back on the same gRPC call, and the backend forwards it to the browser. The backend records the run in the history.
6. When the run ends, or you close the tab and the call is cancelled, the executor stops Ansible, kills leftover processes and deletes the run's key files.

Scheduled jobs follow the same path, started by the backend's in-process cron loop instead of a browser.

## Security model

- **Private keys never reach the browser.** They are encrypted at rest with AES-256-GCM using `CREDENTIALS_ENCRYPTION_KEY`, never returned by the API, and decrypted only while the backend builds a run.
- **The executor trusts only the backend.** Every gRPC call must carry `SERVICE_TOKEN`, and the executor is not published on any host port.
- **Host keys are verified** according to `SSH_HOST_KEY_POLICY` (trust on first use by default).
- **User input is constrained.** Extra variables may not start with `ansible_` (the executor checks this again), and device and group names are restricted to letters, digits, `.`, `_` and `-`.
- **Runs are bounded.** At most `MAX_CONCURRENT_RUNS` Ansible processes run at once, extra requests are refused with *too many requests*, a job never overlaps with itself, and `forks` is capped at 50.
- **Git is constrained.** Repositories sync only over `https` and `ssh`, with no global Git configuration, a per-command timeout and a size limit. A repository's own `ansible.cfg` is ignored.

## The API

The API is versioned under `/rpc/v1` (oRPC, used by the frontend) and `/api/v1` (OpenAPI). The interactive reference lives at `/scalar` and the raw specification at `/openapi.json`.

From scripts, authenticate with a personal API key, created on the **Config** page and sent as the `x-api-key` header:

```bash
curl -H "x-api-key: $PLAYBOOK_RUNNER_KEY" https://ansible.example.com/api/v1/playbooks/list
```
