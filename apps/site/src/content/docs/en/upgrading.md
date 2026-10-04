---
title: Upgrading
description: Update a running installation and the steps specific to each release.
order: 7
---

## The usual upgrade

From the directory that holds `compose.yml` and `.env`:

```bash
docker compose pull
docker compose up -d
```

The backend applies any new database migration when it starts. Upgrade all four images together: the backend and the executor share a gRPC contract.

If you pinned versions with the `*_IMAGE_TAG` variables, change all four to the new tag first. Read the [release notes](https://github.com/Nonetss/playbook-runner/releases) before jumping several versions, and apply the steps below for every release you cross.

## v0.10.0

The public entry point moved out of the frontend image into a new `playbook-runner-gateway` image (Caddy), which serves the site and routes the backend's gRPC calls to the executor. The frontend no longer publishes a port.

No new required variables: the gateway is published on `GATEWAY_PORT`, falling back to your existing `FRONTEND_PORT`. With the old compose file the site stops answering after a pull, so refresh it first:

```bash
curl -fsSL https://raw.githubusercontent.com/Nonetss/playbook-runner/main/compose.prod.yml -o compose.yml
docker compose pull && docker compose up -d
```

## v0.9.0

No new required variables. Update the backend **and** executor images together: the gRPC contract gained the Git repository calls and the executor image now ships `git`.

## v0.8.0

Adds a **required** variable; the backend refuses to start without it.

1. Generate the key and add it to `.env`:

   ```bash
   echo "CREDENTIALS_ENCRYPTION_KEY=$(openssl rand -base64 32)" >> .env
   ```

2. Back the key up.
3. Refresh the compose file (volumes, ports and healthchecks changed), then pull and restart:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/Nonetss/playbook-runner/main/compose.prod.yml -o compose.yml
   docker compose pull && docker compose up -d
   ```

4. Encrypt the credentials stored in plaintext before the upgrade. Run it once; `--decrypt` rolls it back:

   ```bash
   docker compose exec backend bun dist/encrypt-credentials.mjs
   ```

Other changes in v0.8: the executor keeps its state in the `ansible_state` volume (the old `./.data/ansible-runner:/app/playbook` mount and `ANSIBLE_PLAYBOOK_PATH` are gone), it no longer publishes port `8000`, and the backend no longer runs a gRPC server (`BACKEND_GRPC_TARGET` and port `50052` were removed).
