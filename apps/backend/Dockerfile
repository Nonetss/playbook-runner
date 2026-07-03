# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:24-slim AS build
COPY --from=oven/bun:1 /usr/local/bin/bun /usr/local/bin/bun
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
COPY packages/logger/package.json packages/logger/
RUN --mount=type=cache,target=/root/.bun/install/cache bun install --frozen-lockfile

COPY . .

ENV NODE_ENV=production
# tsdown bundles the workspace packages AND every npm dependency into
# dist/ (see tsdown.config.ts), so the runtime stage needs no node_modules.
RUN cd apps/backend && bun run build

# ── Runtime stage ─────────────────────────────────────────────────────────────
# node:24-slim keeps the `node -e` compose healthchecks working; bun is the
# actual runtime (the app uses Bun.cron and Bun's `export default` serving).
FROM node:24-slim AS runtime
COPY --from=oven/bun:1 /usr/local/bin/bun /usr/local/bin/bun
ENV NODE_ENV=production

# bootstrap() resolves the migrations folder relative to the bundle:
# dist/ -> ../../../packages/db/src/migrations, so keep the repo layout.
COPY --from=build /app/apps/backend/dist /app/apps/backend/dist
COPY --from=build /app/packages/db/src/migrations /app/packages/db/src/migrations

EXPOSE 3000

WORKDIR /app/apps/backend
CMD ["bun", "dist/index.mjs"]
