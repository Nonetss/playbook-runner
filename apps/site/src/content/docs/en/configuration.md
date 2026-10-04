---
title: Configuration
description: Every environment variable read by the backend and the Ansible executor.
order: 4
---

All runtime configuration comes from environment variables. In a Docker deployment they live in the `.env` next to `compose.yml`, which every service reads. The backend validates its variables at startup and exits with a clear error when one is missing or malformed.

## Deployment

Read by `compose.yml` itself.

| Variable | Default | Notes |
| --- | --- | --- |
| `GATEWAY_PORT` | `4321` | Host port the gateway is published on. Falls back to the older `FRONTEND_PORT`. |
| `ANSIBLE_IMAGE_TAG` | `latest` | Image tag of the executor. |
| `BACKEND_IMAGE_TAG` | `latest` | Image tag of the backend. |
| `FRONTEND_IMAGE_TAG` | `latest` | Image tag of the frontend. |
| `GATEWAY_IMAGE_TAG` | `latest` | Image tag of the gateway. |
| `POSTGRES_DB` | `playbook_runner` | Bundled PostgreSQL only. |
| `POSTGRES_USER` | `playbook_runner` | Bundled PostgreSQL only. |
| `POSTGRES_PASSWORD` | required | Bundled PostgreSQL only. |

## Backend

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string. |
| `BETTER_AUTH_SECRET` | yes | At least 32 characters. Signs sessions. |
| `BETTER_AUTH_URL` | yes | Public URL of the app, as the browser sees it. |
| `CORS_ORIGIN` | yes | Public URL of the app. |
| `CREDENTIALS_ENCRYPTION_KEY` | yes | Base64 of exactly 32 bytes. Encrypts stored SSH private keys (AES-256-GCM). Back it up. |
| `SERVICE_TOKEN` | for runs | At least 32 characters, same value on the executor. Authenticates gRPC calls; without it the app starts but nothing can run. |
| `ANSIBLE_GRPC_TARGET` | no | Where the backend dials the executor. Set to `gateway:50050` by `compose.yml`. |
| `JOB_SCHEDULER_ENABLED` | no | `1` (default) runs scheduled jobs in-process; `0` turns the scheduler off, for example when you run several backend replicas. |
| `SEED_ADMIN_EMAIL` | no | First admin, created at startup if missing. Default `admin@playbook-runner.local`. |
| `SEED_ADMIN_PASSWORD` | no | Default `admin1234`, which is refused in production. |
| `SEED_ADMIN_NAME` | no | Default `Admin`. |
| `GENERIC_OAUTH_CLIENT_ID` | no | All three `GENERIC_OAUTH_*` variables together enable SSO. |
| `GENERIC_OAUTH_CLIENT_SECRET` | no | See [Users and sign-in](../authentication/). |
| `GENERIC_OAUTH_ISSUER` | no | OIDC issuer URL; discovery is appended automatically. |
| `LOG_LEVEL` | no | `info` by default. |

## Ansible executor

| Variable | Default | Notes |
| --- | --- | --- |
| `SERVICE_TOKEN` | required | Must match the backend. Empty means every call is rejected. |
| `SSH_HOST_KEY_POLICY` | `accept-new` | `accept-new` trusts a host on first contact and rejects changed keys; `strict` only accepts hosts already in `known_hosts`; `off` disables verification and logs a warning. |
| `MAX_CONCURRENT_RUNS` | `8` | Ansible processes allowed at once (runs, scripts, commands). Extra requests are refused, not queued. |
| `GRPC_SHUTDOWN_GRACE_S` | `8` | Seconds in-flight runs get to cancel when the container stops. |
| `GIT_TIMEOUT_S` | `120` | Timeout of each Git command during a repository sync. |
| `GIT_MAX_REPO_MB` | `512` | A mirror larger than this is dropped and the sync fails. |
| `MAX_CONCURRENT_SYNCS` | `2` | Repository syncs allowed at once. |
| `ANSIBLE_USER` | `ansible` | Fallback SSH user. Normally each host connects as its credential's user. |
| `LOG_LEVEL` | `info` | |

## Host keys

With `accept-new`, if a host is legitimately reinstalled its new key is rejected. Remove its line from `known_hosts` in the `ansible_state` volume and the next run records the new key:

```bash
docker compose exec ansible ssh-keygen -f /app/state/known_hosts -R 10.0.0.12
```
