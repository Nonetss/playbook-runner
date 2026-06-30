# playbook-runner

Web UI for managing and executing [Ansible](https://www.ansible.com/) playbooks
against inventory hosts, with scheduled jobs, credential management, and live
run streaming.

Built as a small monorepo with three services:

- `apps/frontend` — Astro + React SSR
- `apps/backend` — Hono + oRPC + Better Auth + Drizzle (PostgreSQL)
- `apps/ansible` — Python FastAPI microservice that wraps `ansible-runner`

## Features

- **TypeScript everywhere** — strict types from DB to RPC client
- **Astro** SSR frontend with **React** islands
- **TailwindCSS** + shadcn/ui components
- **Hono** backend with **oRPC** end-to-end type-safe procedures
- **Better Auth** with OAuth/OIDC SSO
- **Drizzle** ORM on PostgreSQL
- **Bun** runtime and package manager
- **Biome** for linting and formatting
- **Turborepo** monorepo pipeline
- **Docker Compose** for local dev and production

## Quick start

```bash
bun install
cp .env.example .env          # fill in the secrets
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
bun run db:push
bun run dev
```

Then open:

- Web app: <http://localhost:4321>
- API: <http://localhost:3000>

## Project structure

```
playbook-runner/
├── apps/
│   ├── frontend/    # Astro + React UI
│   ├── backend/     # Hono API + oRPC procedures
│   └── ansible/     # Python service wrapping ansible-runner
└── packages/
    ├── api/         # oRPC routers and handlers
    ├── auth/        # Better Auth configuration
    ├── config/      # Shared tsconfig base
    ├── db/          # Drizzle schema and migrations
    └── env/         # Zod-validated environment variables
```

## Database

PostgreSQL is required. Drizzle migrations live in `packages/db/src/migrations`.

```bash
bun run db:push          # apply schema (dev)
bun run db:generate      # create a new migration from schema changes
bun run db:migrate       # apply pending migrations
bun run db:studio        # open Drizzle Studio
```

## Docker

`compose.yml` builds the three images from the local sources (dev workflow).

```bash
bun run docker:build     # build images
bun run docker:up        # build and start the stack
bun run docker:logs      # tail logs
bun run docker:down      # stop the stack
```

For production, `compose.prod.yml` pulls prebuilt images from a container
registry (defaults to `ghcr.io` — see `.env.example`) instead of building from
source. The CI in `.github/workflows/docker-build.yml` pushes those images on
pushes to `main` and to `v*` branches.

## Scripts

| Command | What it does |
| --- | --- |
| `bun run dev` | Start all apps in dev mode |
| `bun run build` | Build all apps |
| `bun run dev:frontend` | Start only the frontend |
| `bun run dev:backend` | Start only the backend |
| `bun run check-types` | Type-check the monorepo |
| `bun run db:push` | Apply DB schema |
| `bun run db:generate` | Generate a new Drizzle migration |
| `bun run db:migrate` | Apply Drizzle migrations |
| `bun run db:studio` | Open Drizzle Studio |
| `bun run check` | Run Biome lint/format |
| `bun run docker:build` | Build Docker images |
| `bun run docker:up` | Start Docker Compose stack |
| `bun run docker:logs` | Tail Docker logs |
| `bun run docker:down` | Stop Docker Compose stack |

## License

See [LICENSE](./LICENSE).
