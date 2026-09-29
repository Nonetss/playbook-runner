# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:24-slim AS build
COPY --from=oven/bun:1.3.14 /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app
ENV SKIP_ENV_VALIDATION=1

# Manifests first: the install layer below stays cached until a
# package.json or the lockfile changes. Every workspace package.json
# must be present or --frozen-lockfile rejects the install.
COPY package.json bun.lock bunfig.toml ./
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/
COPY apps/ansible/package.json apps/ansible/
COPY packages/api/package.json packages/api/
COPY packages/auth/package.json packages/auth/
COPY packages/config/package.json packages/config/
COPY packages/db/package.json packages/db/
COPY packages/env/package.json packages/env/
COPY packages/grpc/package.json packages/grpc/
COPY packages/logger/package.json packages/logger/
RUN --mount=type=cache,target=/root/.bun/install/cache bun install --frozen-lockfile

# Only what the backend build reads, so a change elsewhere in the repo (the
# Python app, the frontend, docs) leaves this layer and the build cached.
COPY packages packages
COPY proto proto
COPY apps/backend apps/backend

ENV NODE_ENV=production
# packages/grpc/src/gen is gitignored, so the TS stubs must be regenerated from
# proto/ before the bundle is built. This runs directly rather than through
# turbo, mirroring the explicit codegen step in apps/ansible/Dockerfile.
RUN cd packages/grpc && bun run generate-grpc
# tsdown bundles the workspace packages AND every npm dependency into
# dist/ (see tsdown.config.ts), so the runtime stage needs no node_modules.
RUN cd apps/backend && bun run build

# ── Runtime stage ─────────────────────────────────────────────────────────────
# Bun is the only runtime here (the app uses Bun.cron and Bun's `export default`
# serving), so the official Bun image carries no Node.js; the compose
# healthchecks run with `bun -e`. The build stage above stays on node:24-slim
# because tsdown runs under Node through its shebang.
FROM oven/bun:1.3.14-slim AS runtime
ENV NODE_ENV=production

# bootstrap() resolves the migrations folder relative to the bundle:
# dist/ -> ../../../packages/db/src/migrations, so keep the repo layout.
COPY --from=build /app/apps/backend/dist /app/apps/backend/dist
COPY --from=build /app/packages/db/src/migrations /app/packages/db/src/migrations

EXPOSE 3000

WORKDIR /app/apps/backend
USER bun
CMD ["bun", "dist/index.mjs"]
