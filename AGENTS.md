# AGENTS.md

Monorepo `playbook-runner` (Astro + Hono + oRPC + Better Auth + Drizzle/PostgreSQL + Biome + Turborepo, on Bun).

## Workspaces & entrypoints

- `apps/frontend` — Astro 7 SSR (`@astrojs/node` standalone), React, Tailwind v4 via Vite plugin, shadcn/ui (new-york, neutral, lucide icons). Runs on `:4321` (Astro); Caddy fronts `:80` in Docker.
- `apps/backend` — Hono 4 + oRPC. Runs on `:3000`. Built with `tsdown` (not tsc) → `dist/index.mjs`. `noExternal: [/.*/]` bundles workspace packages and npm deps so the production image only needs `dist/`.
- `packages/api` — oRPC contract: `o`, `publicProcedure`, `protectedProcedure`, `createContext`, `appRouter` (`packages/api/src/index.ts`, `context.ts`, `routers/index.ts`). Subpath exports for `"./*"`. Per-feature layering documented under "Backend API layering" below.
- `packages/auth` — Better Auth factory (`createAuth()`), exports `auth`. Plugins: `admin()`, `apiKey({ enableSessionForAPIKeys: true })`. Cookies: sameSite=none, secure, httpOnly.
- `packages/db` — Drizzle (`createDb()`, schema in `src/schema/auth.ts`). Drizzle CLI scripts here only.
- `packages/env` — `@t3-oss/env-core`. Two entrypoints:
  - `@playbook-runner/env/server` — validates `DATABASE_URL`, `BETTER_AUTH_SECRET` (min 32), `BETTER_AUTH_URL` (url), `CORS_ORIGIN` (url), `NODE_ENV`.
  - `@playbook-runner/env/web` — validates `PUBLIC_SERVER_URL` (Astro client prefix).
- `packages/config` — shared `tsconfig.base.json` (strict, noUncheckedIndexedAccess, verbatimModuleSyntax, `types: ["bun"]`).

Package versions pinned via root `workspaces.catalog`. Bun 1.3.14 with `linker = "isolated"` (`bunfig.toml`).

## Frontend feature structure

- Each feature under `apps/frontend/src/components/features/<name>/` always has a `components/` and a `hooks/` subfolder — create both even if `hooks/` stays empty for now. Don't leave component files loose at the feature root.
- If a feature needs a stable public import path (e.g. `@/components/features/me`), add a barrel `index.ts`/`index.tsx` at the feature root that re-exports from `components/` (see `features/me/index.tsx` re-exporting `components/profile-page.tsx`). Otherwise import straight from `features/<name>/components/<file>`.
- Cross-feature and cross-component imports use the `@/` absolute alias, not relative paths.
- Any React component mounted from an `.astro` file uses `client:only="react"`, never `client:load` (or other `client:*` directives) — this repo skips SSR-then-hydrate for React islands entirely.

## Backend API layering (`packages/api`)

Every procedure belongs to a **feature** (`api-key`, `health`, `private`, ...), split across four parallel folders under `packages/api/src/`, one file per feature per folder:

- `input/<feature>.ts` — zod request schemas, exported as `<feature>Input` keyed by method (e.g. `apiKeyInput.create`). Only present when the procedure takes input.
- `output/<feature>.ts` — zod response schemas, exported as `<feature>Output` keyed by method (e.g. `apiKeyOutput.create`).
- `handler/<feature>.ts` — business logic, exported as `<feature>Handler` keyed by method. Each method is `async ({ context, input }: { context: Context; input?: z.infer<typeof <feature>Input.<method>> }) => ...` — no other param shapes. Calls into `@playbook-runner/auth` / `@playbook-runner/db` etc. live here, never in the router.
- `routers/<feature>.ts` — oRPC wiring only, exported as `<feature>Router`: `publicProcedure`/`protectedProcedure` → `.route({ summary, description, tags, method, successStatus? })` → `.input(...)` (if any) → `.output(...)` → `.handler(({ context, input }) => featureHandler.method({ context, input }))`.

Wiring rules:

- `input/index.ts`, `output/index.ts`, `handler/index.ts` are barrels (`export * from "#<layer>/<feature>"`) — add every new feature to all three. Internal imports in this package use `#` subpath imports (see "Path aliases"), e.g. `import { apiKeyOutput } from "#output"`.
- `routers/index.ts` assembles `appRouter` by nesting each feature's router under its own key (`apiKey: apiKeyRouter`, `health: healthRouter`) — client calls are `orpc.<feature>.<method>()`, never a flat top-level procedure name.
- `context.ts` builds the oRPC `Context` (`{ user, session, headers }`) from the Hono context set by the auth session middleware.
- `errors.ts` defines one `errorMap` (every standard oRPC code, `BAD_REQUEST` … `GATEWAY_TIMEOUT`) wired once via `os.$context<Context>().errors(errorMap)` in `index.ts`, plus one `errors` constructor map (`createORPCErrorConstructorMap(errorMap)`). Throw with `errors.UNAUTHORIZED()` etc. — never `new ORPCError(...)` directly.
- `index.ts` exports `publicProcedure` (no auth) and `protectedProcedure` (`publicProcedure.use(requireAuth)`), which throws `errors.UNAUTHORIZED()` when `context.user` is missing.

## Path aliases

Two aliasing schemes, by package kind:

- **Apps** use `@/` → their own `./src/*` (tsconfig `paths` in `apps/backend`; tsconfig `paths` + Vite alias in `apps/frontend`). App-internal only — never used cross-package.
- **Shared packages** (`packages/api`, `packages/db`) use Node **subpath imports** (`#` prefix) declared in their own `package.json` `imports` field. These resolve per-package everywhere (tsc, Bun, Vite, rolldown) with no plugins, because these packages export raw TS source consumed by other workspaces — a shared `@/` alias would collide across tsconfig contexts.
- `packages/auth` uses neither (plain relative imports).

`imports` field rules: the general pattern is `"#*": "./src/*.ts"` (resolvers do **not** apply extension searching to the target, so the `.ts` is load-bearing). Directory barrels need their own exact key (e.g. `"#output": "./src/output/index.ts"` in api, `"#schema": "./src/schema/index.ts"` in db) — array fallbacks don't work in rolldown. When adding a new barrel folder to api/db, add its exact key to that package's `imports`.

## Commands (root)

All scripts go through Turbo:

- `bun run dev` — turbo dev (persistent). Use `dev:frontend` / `dev:backend` to scope.
- `bun run build` — `dependsOn: ["^build"]`, reads `.env*` as inputs, outputs `dist/**` and `.astro/**`.
- `bun run check-types` — `tsc -b` per package; the frontend runs `astro check`.
- `bun run check` — `biome check --write .` (format + lint).
- `bun run format` — `biome check --write --linter-enabled=false .` (format only).
- `bun run db:push | db:generate | db:migrate | db:studio` — filtered to `@playbook-runner/db`.
- `bun run docker:build | docker:up | docker:down | docker:logs` — uses root `compose.yml`.

Per-package dev: `apps/backend` runs `bun run --hot src/index.ts`; `apps/frontend` runs `astro dev` (which proxies `/rpc`, `/api`, `/scalar`, `/openapi.json` → `http://localhost:3000`).

## Env & runtime gotchas

- `DATABASE_URL` is read from **`apps/backend/.env`** — `packages/db/drizzle.config.ts` calls `dotenv.config({ path: "../../apps/backend/.env" })` explicitly. There is no `packages/db/.env`.
- Frontend `PUBLIC_SERVER_URL` defaults to `http://localhost:3000` in `astro.config.mjs`. In Docker it's a build arg (compose sets `http://localhost:4321`).
- `BETTER_AUTH_URL` must differ between local dev (`http://localhost:3000`) and Docker (`http://backend:3000`, set in `compose.yml`).
- `BETTER_AUTH_SECRET` must be ≥ 32 chars. Generate with `openssl rand -base64 48`.
- Set `SKIP_ENV_VALIDATION=1` to bypass `@playbook-runner/env` during builds/CLI tasks. Dockerfiles set it for `bun install` + build, then unset it before `CMD`.
- Frontend oRPC link is same-origin (`${window.location.origin}/rpc`) — it intentionally does not hit `PUBLIC_SERVER_URL` directly. Caddy (prod) / Vite (dev) proxy `/rpc` to backend, keeping the browser CORS-free.
- Frontend uses two Better Auth clients: `lib/auth-client.ts` (browser, baseURL from `PUBLIC_SERVER_URL`) and `lib/auth-server.ts` (SSR, baseURL from `process.env.BETTER_AUTH_URL`). The Astro middleware in `src/middleware.ts` gates everything except `/login`, `/signup`, `/scalar`, `/openapi.json`.

## Lint / format

Biome 2.5.1 (root `biome.json`): 2-space indent, double quotes, no semicolons, 80-col, organize imports on. One override: `**/*.svelte|astro|vue` disables `useConst`, `useImportType`, unused-vars/imports.

No ESLint, no Prettier, no Husky.

## Docker

- `compose.yml`: services `frontend` (port 4321 → container 80) and `backend` (internal 3000). Both have healthchecks: backend hits `http://localhost:3000/`, frontend hits `http://localhost/login` through Caddy. Frontend `start.sh` runs Astro SSR (127.0.0.1:4321) and Caddy as background jobs under `wait -n`, so the container dies (and restarts) if either process exits; Caddy reverse-proxies `/rpc/*`, `/api/*`, `/scalar*`, `/openapi.json` to `${BACKEND_UPSTREAM:backend:3000}`.
- Both Dockerfiles use `node:24-slim` + `oven/bun:1`, copy the workspace manifests first, `bun install --frozen-lockfile` (with `/root/.bun/install/cache` cache mount), then `COPY . .` + `bun run build` — dependency changes are the only thing that busts the install layer. **When adding a workspace, add its `package.json` COPY line to both Dockerfiles.**
- CI: `.github/workflows/docker-build.yml` triggers on `v*` and `main`, builds + pushes `…-backend` / `…-frontend` images to the Gitea container registry using `MY_PASSWORD` PAT and optional `DOCKER_USERNAME` secret. Image tags: `latest`, branch/ref, and `<ref>-<sha8>`.

## OpenSpec workflow

This repo uses OpenSpec for spec-driven changes.

- Specs live in `openspec/specs/<capability>/spec.md` (capabilities: admin, api-documentation, api-key-management, authentication, http-server, rpc-api, theme-switching, web-navigation).
- Changes are scaffolded with `openspec new change <name>` and go through `proposal → tasks → specs → design → apply`. Use the `/opsx-*` slash commands in `.opencode/commands/` or load the matching skill under `.opencode/skills/openspec-*/SKILL.md` (propose, apply-change, archive-change, sync-specs, explore). The CLI is `openspec` — `openspec status --change <name> --json` and `openspec instructions <artifact> --change <name> --json` are the canonical entry points.
- `openspec/config.yaml` defines the schema as `spec-driven`.

## Migrations — agent hands off

**Never generate, run, push, or edit database migrations.** That is the user's job, always. Concretely, the agent must NOT:

- Run `bun run db:generate` / `drizzle-kit generate`
- Run `bun run db:push` / `drizzle-kit push`
- Run `bun run db:migrate` / `drizzle-kit migrate`
- Create, rename, edit, or delete anything under `packages/db/src/migrations/` (including the new folder-per-migration format `<timestamp>_<name>/{migration.sql,snapshot.json}`)
- Edit the schema in `packages/db/src/schema/` without the user explicitly asking for that change

If a task seems to require a migration, stop and tell the user — propose the change, then wait for them to generate/push it. Read-only inspection of existing migrations is fine.

## Misc

- No test framework or `test` script is configured anywhere — don't try `bun test`. Validation relies on `check-types` + Biome + manual API calls (`/scalar`, `/openapi.json`, `/rpc`).
- `apps/backend` exposes `GET /` returning `OK` for the compose healthcheck.
- Drizzle migrations live in `packages/db/src/migrations/` in drizzle-kit ≥ 0.31 folder format (`<timestamp>_<name>/migration.sql` + `snapshot.json`). The old `meta/` + `0000_*.sql` layout is gone.
- `.gitignore` excludes `.agents/` and `.claude/` directories.
