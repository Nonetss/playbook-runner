# AGENTS.md

Monorepo `playbook-runner` (Astro + Hono + oRPC + Better Auth + Drizzle/PostgreSQL + Biome + Turborepo, on Bun), plus a Python FastAPI/gRPC service that runs Ansible.

## Workspaces & entrypoints

- `apps/frontend` — Astro 7 SSR (`@astrojs/node` standalone), React, Tailwind v4 via Vite plugin, shadcn/ui (new-york, neutral, lucide icons). Runs on `:4321` (Astro); Caddy fronts `:80` in Docker.
- `apps/backend` — Hono 4 + oRPC. Runs on `:3000`. Built with `tsdown` (not tsc) → `dist/index.mjs` (plus `dist/encrypt-credentials.mjs`). `deps.alwaysBundle: () => true` bundles workspace packages and npm deps so the production image only needs `dist/`. It is a gRPC *client* only (no gRPC server).
- `apps/ansible` — Python 3.12 FastAPI (`:8000`, only `GET /api/health` + docs) that starts the gRPC `RunnerService` (`:50051`) in its lifespan and runs Ansible through `ansible-runner`. Managed with `uv`; type-checked with BasedPyright, formatted/linted with Ruff. Shared Python code lives in `python/grpc-toolkit` (token interceptor).
- `packages/api` — oRPC contract: `o`, `publicProcedure`, `protectedProcedure`, `createContext`, `appRouter` (`packages/api/src/index.ts`, `context.ts`, `router.ts`). The root router exposes versions (`v1` today); `src/v1/router.ts` is the version-one router. Subpath exports for `"./*"`. Per-feature layering documented under "Backend API layering" below.
- `packages/auth` — Better Auth factory (`createAuth()`), exports `auth`. Plugins: `admin()`, `apiKey({ enableSessionForAPIKeys: true })`, optional `genericOAuth`. Public email/password sign-up is disabled (`disableSignUp`): accounts are created by admins (`/admin/users`, `auth.api.createUser`) or auto-provisioned by SSO. Cookies: sameSite=lax, secure, httpOnly (frontend and backend must be same-site).
- `packages/db` — Drizzle (`createDb()`, schema in `src/schema/*.ts`). Drizzle CLI scripts here only.
- `packages/grpc` — TypeScript gRPC client helpers (`getClient`, `unary`, `serverStream` which cancels the call when the consumer stops, `isGrpcError`, `grpcStatus`, `authMetadata`) and the ts-proto stubs generated from the root `proto/*.proto` into the gitignored `src/gen/` (`bun run generate-grpc`, run by `check-types`/`build`). The Python stubs are generated into `apps/ansible/app/grpc/gen/` the same way.
- `packages/logger` — shared pino logger (`logger`), level from `LOG_LEVEL`; pretty output in development.
- `packages/env` — `@t3-oss/env-core`. Two entrypoints:
  - `@playbook-runner/env/server` — validates `DATABASE_URL`, `BETTER_AUTH_SECRET` (min 32), `BETTER_AUTH_URL` (url), `CORS_ORIGIN` (url), `NODE_ENV`, `CREDENTIALS_ENCRYPTION_KEY` (required), `SERVICE_TOKEN` (≥ 32, shared with the Ansible service), `ANSIBLE_GRPC_TARGET` (default `localhost:50051`), `LOG_LEVEL`, `JOB_SCHEDULER_ENABLED`, the optional `GENERIC_OAUTH_*` trio (SSO), and `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`/`SEED_ADMIN_NAME` (the seed runs at every backend start and creates that admin only if missing; in production it refuses the default password).
  - `@playbook-runner/env/web` — validates `PUBLIC_SERVER_URL` (Astro client prefix).
- `packages/config` — shared `tsconfig.base.json` (strict, noUncheckedIndexedAccess, verbatimModuleSyntax, `types: ["bun"]`).

Package versions pinned via root `workspaces.catalog`; `better-auth`, `@better-auth/api-key`, `@better-auth/core`, `drizzle-orm`/`drizzle-kit` (`1.0.0-rc.4`), `astro`, `@astrojs/*` and Biome are exact pins, and root `overrides` force `@better-auth/core` and drizzle so transitive copies don't diverge (a caret on `1.0.0-rc.4` resolves to drizzle's branch builds such as `1.0.0-rc.5-<sha>`). Bun 1.3.14 with `linker = "isolated"` (`bunfig.toml`).

## Frontend feature structure

- Feature modules live under `apps/frontend/src/features/<name>/`, not under the generic `components/` namespace. Feature-owned React components go in `components/`, hooks in `hooks/`, and feature-wide types in `types.ts`. Only create a subfolder when it owns files; empty `hooks/` or `components/` folders are not required.
- If a feature needs a stable public import path (e.g. `@/features/me`), add a barrel `index.ts`/`index.tsx` at the feature root that re-exports from `components/` (see `features/me/index.tsx` re-exporting `components/profile-page.tsx`). Otherwise import straight from `@/features/<name>/components/<file>`.
- Shared execution streams, run types, inventory-selection behavior, and execution console UI belong to `@/features/run`; `scripts`, `commands`, and `inventory` must not import execution primitives from `playbooks`.
- Generic reusable UI stays under `apps/frontend/src/components/ui/`, and cross-feature resource primitives stay under `apps/frontend/src/components/shared/`.
- Cross-feature and cross-component imports use the `@/` absolute alias, not relative paths.
- PWA (installable on mobile): `src/layouts/pwa-head.astro` (manifest, theme-color, apple-touch-icon, service-worker registration) is included by `Layout.astro`; assets in `public/manifest.webmanifest`, `public/sw.js` (network-first shell cache, never touches `/rpc`, `/api`, `/scalar`, `/openapi.json`; bump `CACHE` to invalidate) and `public/pwa/` (icons generated from `logo.svg`). The middleware treats them as public paths.
- Any React component mounted from an `.astro` file uses `client:only="react"`, never `client:load` (or other `client:*` directives) — this repo skips SSR-then-hydrate for React islands entirely.

## Frontend design system

- `apps/frontend/DESIGN.md` is normative (adapted from the sibling `console` project): one terracotta accent (hero icon, primary action, live dot), hierarchy through type, flat surfaces with 1px hairlines, resource collections as flat definition-driven cards (`EntityCardGrid`), status as dot + word. No raw Tailwind palette colours (`zinc`, `emerald`, `red`, `amber`, `sky`, `gray`, `slate`, `black`, `white`) in `src/features` or `src/components`; the run console uses only the `--terminal-*` tokens.
- Fonts: Space Grotesk (`font-sans`) + Space Mono (`font-mono`, technical values); `font-terminal` (native monospace stack) only for raw command output and the code editor. Typography roles (`display`, `headline`, `body`, `meta`, `label`, `status`, `data`, `stat`) through `Text` (`components/shared/brand/typography.tsx`) or `text-<role>` utilities.
- `src/lib/app-surfaces.ts` is the single registry of page identity (href, `nav` title/description keys, icon) and of navigation sections (`inventory`; `ansible`: playbooks, scheduler, history; `bash`: scripts, commands); `features/app-shell/site-nav.ts`, the section sidebar, `PageHero surface=…` and section overviews derive from it.
- Layouts: `Layout.astro` owns `<main>` and the only page padding (`frame="bare"` for login, `locked` for viewport-height pages); `WithSidebar.astro` renders the persisted section sidebar island plus the page scroller for every route of a section, including detail, form and run routes (`locked` for editors and consoles; `boundedContent`, `persistScroll`). Both layouts take `padding="compact"` and `scrollToTop`. `PageShell` inherits the layout width via `--page-max-width` (`6xl` in `Layout`, full width in `WithSidebar`) unless a page passes `maxWidth`. The navbar section menus are a hover `NavigationMenu`. Never hand-build `<main>`, page titles or `calc(100dvh-…)`.
- Shared primitives (`components/shared/`): `PageShell`, `PageHero`/`HeroCount`, `DetailFrame` (back link), `ResourceOverview`, `EntityCardGrid`/`EntityList` + per-resource `features/<name>/definitions/*.definition.tsx`, `QueryState`/`StateCard`, `InlineAlert`, `MetadataList`/`MetadataCell`, `StatusDot`/`StatusTag`, `FormDialog` (every dialog, with or without a form), `FormField`/`FieldLabel`, `SegmentedPicker`, `SurfaceCard`. Execution screens compose `features/run/components/terminal-frame.tsx`.

## Backend API layering (`packages/api`)

The package root holds infrastructure shared by every API version:

- `context.ts` builds the oRPC `Context` (`{ user, session, headers }`) from the Hono context set by the auth session middleware.
- `errors.ts` defines one `errorMap` (every standard oRPC code, `BAD_REQUEST` … `GATEWAY_TIMEOUT`) wired once via `os.$context<Context>().errors(errorMap)` in `index.ts`, plus one `errors` constructor map (`createORPCErrorConstructorMap(errorMap)`). Throw with `errors.UNAUTHORIZED()` etc. — never `new ORPCError(...)` directly.
- `index.ts` exports `publicProcedure` (no auth), `protectedProcedure` (`publicProcedure.use(requireAuth)`), which throws `errors.UNAUTHORIZED()` when `context.user` is missing and `errors.FORBIDDEN()` for role `pending`.
- Both handlers (`apps/backend/src/routers/rpc.ts`, `docs.ts`) use oRPC's `SimpleCsrfProtectionHandlerPlugin`: cookie-authenticated calls must send `x-csrf-token: orpc` (the frontend `RPCLink` does via `SimpleCsrfProtectionLinkPlugin`); requests with `x-api-key` or `authorization` are exempt. In Scalar, authenticate with an API key. Input validation errors carry the zod messages in `message`.
- `router.ts` at the package root assembles the top-level `appRouter` by nesting each API version's router under its own key (`v1: v1Router`) — this is the only place a new version gets wired in.

Everything version-specific lives under `src/<version>/` (currently only `src/v1/`). Every procedure belongs to a **feature** (`api-key` — mounted as `apiKeys`, `credentials`, `health`, `inventory`, `jobs`, `playbooks`, `repositories`, `run`, `scripts`), colocated under `packages/api/src/<version>/<feature>/`, one file per concern:

- `<feature>/input.ts` — zod request schemas, exported as `<feature>Input` keyed by method (e.g. `apiKeyInput.create`). Only present when a procedure takes input.
- `<feature>/output.ts` — zod response schemas, exported as `<feature>Output` keyed by method (e.g. `apiKeyOutput.create`). Only present when a procedure returns a typed body.
- `<feature>/handler.ts` — business logic, exported as `<feature>Handler` keyed by method. Each method is `async ({ context, input }: { context: Context; input?: z.infer<typeof <feature>Input.<method>> }) => ...` — no other param shapes. Calls into `@playbook-runner/auth` / `@playbook-runner/db` etc. live here, never in the router.
- `<feature>/router.ts` — oRPC wiring only, exported as `<feature>Router`: `publicProcedure`/`protectedProcedure` → `.route({ summary, description, tags, method, successStatus? })` → `.input(...)` (if any) → `.output(...)` → `.handler(({ context, input }) => featureHandler.method({ context, input }))`.
- Extra feature-specific modules (e.g. `jobs/executor.ts`, `credentials/ssh-key.ts`, `playbooks/folders.ts`) live alongside the four files above when a feature needs helpers beyond the standard layers. Logic that also runs **outside a request** (no `context`) goes in such a module as plain functions, never on `<feature>Handler`: e.g. `run/resolve.ts` (`resolveRun`, `resolveScript`, `resolveDevice`, `resolveHosts`, used by the run stream handler and the job executor) and `jobs/schedule.ts` (`listScheduledJobs`, used by the backend scheduler).
- Ids in inputs use the shared `idSchema` (`#v1/schemas`, `z.uuid()`), so malformed ids fail with `BAD_REQUEST`. Single-row handlers throw `errors.NOT_FOUND()` instead of returning `null`; updates set `updatedAt` and never pass `id` into `.set()`.

Wiring rules:

- `src/v1/router.ts` assembles that version's router by importing each feature's router and nesting it under its own key (`health: healthRouter`, `jobs: jobsRouter`, ...). Client calls and HTTP paths always include the version: `orpc.v1.<feature>.<method>()`, `/rpc/v1/<feature>/<method>`, `/api/v1/<feature>/<method>`.
- Internal imports in this package use `#` subpath imports (see "Path aliases"), e.g. `import { apiKeyOutput } from "#v1/api-key/output"`.

## Path aliases

Two aliasing schemes, by package kind:

- **`apps/frontend`** uses `@/` → `./src/*` (tsconfig `paths` + Vite alias). App-internal only — never used cross-package.
- **`apps/backend`** uses Node subpath imports like the packages: `"#*": "./src/*.ts"` in its `package.json` (e.g. `#routers/rpc`, `#lib/csrf`), not `@/`.
- **Shared packages** (`packages/api`, `packages/db`) use Node **subpath imports** (`#` prefix) declared in their own `package.json` `imports` field. These resolve per-package everywhere (tsc, Bun, Vite, rolldown) with no plugins, because these packages export raw TS source consumed by other workspaces — a shared `@/` alias would collide across tsconfig contexts.
- `packages/auth` uses neither (plain relative imports).

`imports` field rules: the general pattern is `"#*": "./src/*.ts"` (resolvers do **not** apply extension searching to the target, so the `.ts` is load-bearing). Directory barrels need their own exact key (e.g. `"#output": "./src/output/index.ts"` in api, `"#schema": "./src/schema/index.ts"` in db) — array fallbacks don't work in rolldown. When adding a new barrel folder to api/db, add its exact key to that package's `imports`.

## Commands (root)

All scripts go through Turbo:

- `bun run dev` — turbo watch dev (persistent). Use `dev:frontend` / `dev:backend` to scope. Shared raw-TypeScript packages have no-op build tasks so changes restart their consumers.
- `bun run build` — `dependsOn: ["^build"]`, reads `.env*` as inputs, outputs `dist/**` and `.astro/**`.
- `bun run check-types` — per package: `tsc --noEmit -p .` (api, auth, db, env) or `tsc -b` (backend, grpc, logger; all tsconfigs are `noEmit`); the frontend runs `astro check`, and the Ansible service runs BasedPyright.
- `bun run check` — `biome check --write .` (format + lint).
- `bun run format` — formats TypeScript with Biome and Python with Ruff.
- `bun run db:push | db:generate | db:migrate | db:studio` — filtered to `@playbook-runner/db`.
- `bun run docker:build | docker:up | docker:down | docker:logs` — uses root `compose.yml`.
- `bun run test:e2e` (and `test:e2e:headed`, `test:e2e:ui`) — Playwright in `apps/frontend` (see Misc).

Per-package dev: `apps/backend` runs `bun run --hot src/index.ts`; `apps/frontend` runs `astro dev` (which proxies `/rpc`, `/api`, `/scalar`, `/openapi.json` → `http://localhost:3000`).

## Env & runtime gotchas

- Persistent Ansible runner state (the SSH `known_hosts` and the Git mirrors in `repos/<repository-id>.git`) lives in `STATE_DIR`: the ignored root directory `.data/ansible-runner/` in local dev (default, never inside `apps/ansible/`), the `ansible_state` named volume at `/app/state` in Docker. Per-run inventories/keys go to `RUN_SCRATCH_DIR` (`/tmp/ansible-runs`) and are deleted after each run. `ANSIBLE_PLAYBOOK_PATH` no longer exists.
- SSH host keys are verified per `SSH_HOST_KEY_POLICY` (`accept-new` default, `strict`, `off` — `off` logs a warning), applied by the Ansible service in dev and Docker alike. Each host connects as its credential's username (`ANSIBLE_USER` is only a fallback).
- Ansible runner concurrency: at most `MAX_CONCURRENT_RUNS` (default 8) ansible-runner processes at once (runs, commands, scripts, pings); extra requests fail fast with gRPC `RESOURCE_EXHAUSTED`, which the backend maps to `TOO_MANY_REQUESTS`. `GRPC_SHUTDOWN_GRACE_S` (default 8) bounds how long in-flight runs get to cancel on shutdown. Closing the browser/stream cancels the gRPC call (`serverStream` cancels in `finally`) and the runner stops Ansible, kills leftover worker processes, and only then deletes the run's key files.
- Git playbook repositories (`repositories` feature, `playbook_repositories` table): `repositories.sync` calls the gRPC `SyncRepository` RPC; the Ansible service fetches the branch into its mirror (only `https`/`ssh` transports, no global git config, SSH via the stored credential + `SSH_HOST_KEY_POLICY`) and returns the head commit plus the discovered playbook files. The backend upserts them as `playbooks.source = 'git'` keyed by `(repository_id, path)` (ids stay stable, vanished files get `missing = true`); they are read-only (`update`/`move`/`delete` → `FORBIDDEN`). Runs send a `GitSource` pinned to `last_commit_sha`; the runner exports that tree with `git archive` into the run dir, runs `path` from it with a runner-controlled `ANSIBLE_CONFIG`, and `job_runs.commit_sha` records it. Limits: `GIT_TIMEOUT_S`, `GIT_MAX_REPO_MB`, `MAX_CONCURRENT_SYNCS` (Ansible service); the image installs `git`.
- A job never runs concurrently with itself: `openRun` takes `pg_advisory_xact_lock(hashtext(jobId))` and refuses while a `running` row exists (`jobs.run` → `CONFLICT`, scheduler skips). Job `forks` and run `forks` are capped at 50; cron expressions are validated with `isValidCron` (`packages/api/src/v1/jobs/cron.ts`).
- `DATABASE_URL` is read from **`apps/backend/.env`** — `packages/db/drizzle.config.ts` calls `dotenv.config({ path: "../../apps/backend/.env" })` explicitly. There is no `packages/db/.env`.
- Frontend `PUBLIC_SERVER_URL` defaults to `http://localhost:3000` in `astro.config.mjs`. In Docker it's an optional `PUBLIC_SERVER_URL` build arg (unset → empty).
- `BETTER_AUTH_URL` must differ between local dev (`http://localhost:3000`) and Docker (`http://backend:3000`, set in `compose.yml`).
- `BETTER_AUTH_SECRET` must be ≥ 32 chars. Generate with `openssl rand -base64 48`.
- `CREDENTIALS_ENCRYPTION_KEY` (required, base64 of exactly 32 bytes, `openssl rand -base64 32`) encrypts SSH private keys at rest (AES-256-GCM, `v1:` prefix; see `packages/api/src/v1/credentials/crypto.ts`). Private keys are never returned by the API; they are decrypted only in `run/resolve.ts` when building a run. Legacy plaintext rows are re-encrypted by the user with `bun run --filter backend credentials:encrypt` (in the image: `bun dist/encrypt-credentials.mjs`, `--decrypt` to roll back) — the agent never runs it.
- User extra vars must not start with `ansible_` (`run/extravars.ts`, re-checked by the runner), and device/group names match `^[A-Za-z0-9._-]{1,64}$` (`inventory/name.ts`).
- Set `SKIP_ENV_VALIDATION=1` to bypass `@playbook-runner/env` during builds/CLI tasks. Dockerfiles set it for `bun install` + build, then unset it before `CMD`.
- Frontend oRPC link is same-origin (`${window.location.origin}/rpc`) — it intentionally does not hit `PUBLIC_SERVER_URL` directly. Caddy (prod) / Vite (dev) proxy `/rpc` to backend, keeping the browser CORS-free.
- Frontend uses two Better Auth clients: `lib/auth-client.ts` (browser, baseURL from `PUBLIC_SERVER_URL`) and `lib/auth-server.ts` (SSR, baseURL from `process.env.BETTER_AUTH_URL`). The Astro middleware in `src/middleware.ts` gates everything except `/login`, `/scalar`, `/openapi.json`; it sends `pending` users to `/me` and non-admins away from `/admin/*`. `/signup` only redirects to `/login`.

## Lint / format

Biome 2.5.1, pinned exactly (root `biome.json`): 2-space indent, double quotes, no semicolons, 80-col, organize imports on. One override: `**/*.svelte|astro|vue` disables `useConst`, `useImportType`, unused-vars/imports.

No ESLint, no Prettier, no Husky.

## Docker

- `compose.yml`: services `frontend` (port 4321 → container 80), `backend` (internal 3000), and `ansible` (internal 8000/50051 — add `-f compose.debug.yml` to publish 8000 on the host). `compose.prod.yml` adds `postgres` and pulls images from GHCR. Each has a healthcheck: backend hits `http://localhost:3000/` with `bun -e`, frontend hits `http://localhost/login` through Caddy, and Ansible GETs `http://localhost:8000/api/health` **and** opens a TCP connection to gRPC `:50051` (same probe in both compose files). Backend waits for the Ansible healthcheck, while Ansible starts independently. The backend runs as `bun`, the frontend as `node`, the Ansible image as non-root UID 10001 and pins the `uv` build image. Frontend `start.sh` runs Astro SSR (127.0.0.1:4321) and Caddy as background jobs under `wait -n`, so the container dies (and restarts) if either process exits; Caddy reverse-proxies `/rpc/*`, `/api/*`, `/scalar*`, `/openapi.json` to `${BACKEND_UPSTREAM:backend:3000}`.
- Both Dockerfiles build on `node:24-slim` + `oven/bun:1.3.14` (backend runtime: `oven/bun:1.3.14-slim`, no Node), copy the workspace manifests first, `bun install --frozen-lockfile` (with `/root/.bun/install/cache` cache mount), then only what the build reads (`packages`, plus `proto` + `apps/backend` or `apps/frontend`) + `bun run build` — dependency changes are the only thing that busts the install layer. **When adding a workspace, add its `package.json` COPY line to both Dockerfiles.**
- CI: `.github/workflows/docker-build.yml` triggers on `v*` and `main`, builds `…-backend`, `…-ansible` and `…-frontend` (amd64 + arm64) and pushes them to GHCR (`ghcr.io`) with `GITHUB_TOKEN`. Image tags: `latest`, branch/ref, and `<ref>-<sha8>`.

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

- No unit-test framework — don't try `bun test`. Validation relies on `check-types` + Biome + manual API calls (`/scalar`, `/openapi.json`, `/rpc`) and the Playwright E2E suite in `apps/frontend/tests` (`playwright.config.ts`; projects `setup`, `chromium-guest`, `chromium-auth`, `chromium-mobile`). E2E prerequisites: the backend running with a seeded admin (`admin@playbook-runner.local` / `admin1234` by default); Playwright reuses a running `astro dev` on `:4321` or starts one. `test:e2e`/`test:e2e:headed` finish on their own; only `test:e2e:ui` is a persistent turbo task.
- `apps/backend` exposes `GET /` returning `OK` for the compose healthcheck.
- Drizzle migrations live in `packages/db/src/migrations/` in drizzle-kit ≥ 0.31 folder format (`<timestamp>_<name>/migration.sql` + `snapshot.json`). The old `meta/` + `0000_*.sql` layout is gone.
- `.gitignore` excludes `.agents/` and `.claude/` directories.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
