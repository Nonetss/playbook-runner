---
title: Deploy with Docker Compose
description: Install by hand with compose.prod.yml, put it behind HTTPS, pin versions or use an external PostgreSQL.
order: 3
---

The installer only automates these steps. Doing them by hand gives you the same stack: five containers from `compose.prod.yml` (gateway, frontend, backend, Ansible executor and PostgreSQL), with only the gateway published on the host.

## 1. Get the files

In an empty directory on the server:

```bash
curl -fsSL https://raw.githubusercontent.com/Nonetss/playbook-runner/main/compose.prod.yml -o compose.yml
curl -fsSL https://raw.githubusercontent.com/Nonetss/playbook-runner/main/.env.example -o .env
chmod 600 .env
```

## 2. Generate the secrets

Replace every `CHANGE_ME` in `.env`:

| Variable | Generate with |
| --- | --- |
| `POSTGRES_PASSWORD` | `openssl rand -hex 32` |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 48` |
| `SERVICE_TOKEN` | `openssl rand -base64 48` |
| `CREDENTIALS_ENCRYPTION_KEY` | `openssl rand -base64 32` |

Use hex for the database password: it ends up inside `DATABASE_URL`, where `/`, `+` and `=` would need escaping.

`SERVICE_TOKEN` authenticates the gRPC link between the backend and the executor. If it is empty, the executor rejects every call and no run can start.

> Back up `.env`. Without `CREDENTIALS_ENCRYPTION_KEY`, the SSH keys stored in the database cannot be decrypted.

## 3. Set the public URL

The browser, Better Auth and CORS must agree on one origin:

```bash
GATEWAY_PORT=4321
BETTER_AUTH_URL=https://ansible.example.com
CORS_ORIGIN=https://ansible.example.com
```

Set the first admin too (`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME`). In production the backend refuses to seed the default password `admin1234`.

## 4. Start the stack

```bash
docker compose up -d
docker compose ps
```

On startup the backend applies the database migrations and creates the admin if it does not exist yet, so `up -d` is all there is. Its healthcheck allows two minutes for that on a fresh database. The frontend waits for the backend, and the backend waits for PostgreSQL, the executor and the gateway.

## Behind HTTPS

Session cookies are marked `Secure`, so browsers only keep them over HTTPS or on `localhost`: plan on HTTPS for anything reachable by other machines.

The gateway serves plain HTTP on the published port. Put your usual reverse proxy (Caddy, Traefik, nginx…) in front of it, terminate TLS there and forward everything to `GATEWAY_PORT`. Keep `BETTER_AUTH_URL` and `CORS_ORIGIN` on the `https://` URL the browser sees.

The frontend and the API are served from the same origin, so there is nothing else to route: `/rpc`, `/api`, `/scalar` and `/openapi.json` go to the backend and everything else to the frontend, inside the gateway.

## Pin a version

Images come from `ghcr.io/nonetss/playbook-runner-*` for `linux/amd64` and `linux/arm64`. `latest` is the newest build; every release is also published under its tag (`v0.10.2`). Pin all four together in `.env`:

```bash
ANSIBLE_IMAGE_TAG=v0.10.2
BACKEND_IMAGE_TAG=v0.10.2
FRONTEND_IMAGE_TAG=v0.10.2
GATEWAY_IMAGE_TAG=v0.10.2
```

See [Upgrading](../upgrading/) before moving between versions.

## External PostgreSQL

To use a managed database (RDS, Cloud SQL…), delete the `postgres` service and its `depends_on` entry from `compose.yml` and point `DATABASE_URL` at it:

```bash
DATABASE_URL=postgresql://user:password@db.example.com:5432/playbook_runner
```

## Data and volumes

| Volume | Holds |
| --- | --- |
| `postgres_data` | Everything you create in the app: users, inventory, credentials, playbooks, jobs and run history. |
| `ansible_state` | The executor's SSH `known_hosts` and the Git repository mirrors. |

Back up the database and `.env`. The `ansible_state` volume can be rebuilt: mirrors re-sync and host keys are learned again on first contact (with the default policy).

## Debugging the executor

The executor's HTTP API (health and OpenAPI docs on port `8000`) is internal. To reach it from the host while debugging, start the stack with the debug overlay from the repository:

```bash
docker compose -f compose.yml -f compose.debug.yml up -d
```
