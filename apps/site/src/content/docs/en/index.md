---
title: Getting started
description: Install Playbook Runner on a Linux server with one command and sign in for the first time.
order: 1
---

Playbook Runner is a self-hosted web UI for Ansible. It stores your inventory, SSH credentials, playbooks and schedules in PostgreSQL and streams every run to the browser while it happens. It ships as four Docker images (gateway, frontend, backend and the Ansible executor) plus PostgreSQL.

## Requirements

- A Linux host, `amd64` or `arm64`.
- Docker with the Compose plugin (`docker compose`).
- `curl` and `openssl`, which the installer uses to download files and generate secrets.
- SSH access from that host to the machines you want to manage.

## Install with one command

Create an empty directory for the deployment, `cd` into it and run:

```bash
curl -fsSL https://raw.githubusercontent.com/Nonetss/playbook-runner/main/scripts/bootstrap.sh | bash
```

The script is interactive even when piped, because it reads your answers from the terminal. It asks for:

1. The **public URL** the browser will use (for example `https://ansible.example.com`) and the **port** to publish on the host (default `4321`).
2. The **first admin**: name, email and a password of at least 8 characters.
3. Optionally, an **OIDC provider** for single sign-on (client id, secret and issuer).

Then it generates every secret with `openssl`, writes `.env` (mode `600`) and `compose.yml` in the current directory, pulls the images from `ghcr.io` and starts the stack. Setting `PB_REF` on the `bash` side (`… | PB_REF=v0.11.0 bash`) picks which version of `compose.yml` it downloads (default `main`); the image versions are the `*_IMAGE_TAG` variables in `.env`, `latest` by default.

> **Back up `.env`**, above all `CREDENTIALS_ENCRYPTION_KEY`. It encrypts the SSH private keys stored in the database; if you lose it, they cannot be recovered.

## Sign in

The backend applies the database migrations and creates the admin from `.env` on startup, so there is no separate setup step. After a minute or two, open the public URL and sign in with the email and password you chose.

There is no public sign-up. Every other account is created by an admin on the **Users** page (`/admin/users`), or provisioned on first sign-in through SSO. See [Users and sign-in](./authentication/).

## Next steps

- [Your first run](./first-run/): add a credential, a device and run a playbook.
- [Deploy with Docker Compose](./deploy/): the same installation by hand, behind HTTPS, or with an external database.
- [Configuration](./configuration/): every environment variable.
