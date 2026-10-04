---
title: Development
description: Run the monorepo locally, run the tests and find your way around the code.
order: 8
---

Playbook Runner is a Bun and Turborepo monorepo with one Python service. You need Bun 1.3, Docker, and `uv` if you work on the executor.

## Run it locally

```bash
bun install
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
bun run dev
```

In `apps/backend/.env`, set at least `BETTER_AUTH_SECRET` (`openssl rand -base64 48`), `CREDENTIALS_ENCRYPTION_KEY` (`openssl rand -base64 32`) and `SERVICE_TOKEN` (`openssl rand -base64 48`, the same value in `apps/ansible/.env`), and point `DATABASE_URL` at a PostgreSQL. The quickest one:

```bash
docker run -d --name playbook-runner-pg \
  -e POSTGRES_DB=playbook_runner \
  -e POSTGRES_USER=playbook_runner \
  -e POSTGRES_PASSWORD=playbook_runner \
  -p 5432:5432 \
  postgres:17-alpine
```

`bun run dev` builds and starts the frontend, backend, executor and gateway in Docker, each running its own hot-reload server from source. Edits are synced into the containers; dependency and `proto/` changes rebuild the affected image. The app is at <http://localhost:4321> (the gateway's production-like site at <http://localhost:8080>). Sign in with `admin@playbook-runner.local` / `admin1234`. Remove the containers with `bun run dev:down`.

To run the apps natively instead, use `bun run dev:local` together with `bun run gateway`. Use one setup or the other: they share ports.

## Tests and checks

```bash
bun run test          # unit tests: bun test (API) and pytest (executor)
bun run check-types   # TypeScript, astro check and BasedPyright
bun run check         # Biome lint and format
bun run test:e2e      # Playwright, needs a running backend
```

Unit tests cover the security-sensitive pure logic (credential encryption, key generation, input validation, Git URL and path checks, run materialisation, the service-token check) and need no database or running services. CI runs Biome, the type checks and the unit tests on every pull request.

## Repository layout

```text
apps/
  frontend/   Astro + React interface
  backend/    Hono API, oRPC, scheduler, auth
  ansible/    Python executor wrapping ansible-runner
  gateway/    Caddy: public entry point and gRPC router
  site/       This website
packages/
  api/        oRPC routers and handlers, versioned under v1
  auth/       Better Auth configuration
  db/         Drizzle schema and migrations
  env/        Validated environment variables
  grpc/       gRPC client helpers and generated stubs
  logger/     Shared structured logging
proto/        gRPC contracts
playbooks/    Example playbooks
```

## This website

The site lives in `apps/site` (Astro, static output) and is published to GitHub Pages by `.github/workflows/pages.yml` on every push to `main` that touches it. Pages are Markdown files under `apps/site/src/content/docs/<lang>/`.

```bash
bun run --filter site dev
```

## Contributing

Issues and pull requests are welcome on [GitHub](https://github.com/Nonetss/playbook-runner). The project is licensed under the GNU GPL v3.0.
