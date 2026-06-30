# syntax=docker/dockerfile:1.7
#
# Multi-stage build:
#   build   — installs deps, runs `bun run build`, produces dist/index.mjs
#   runtime — only the compiled bundle + the bun runtime (no source, no
#             node_modules, no manifest files)

# ─── build ──────────────────────────────────────────────────────────────────
FROM node:24-slim AS build

ENV SKIP_ENV_VALIDATION=1

COPY --from=oven/bun:1 /usr/local/bin/bun /usr/local/bin/bun

WORKDIR /app

# Manifests first → cache-friendly install layer.
COPY package.json bun.lock turbo.json ./
COPY packages ./packages
COPY apps ./apps

RUN --mount=type=cache,target=/root/.bun/install/cache bun install --frozen-lockfile

ENV NODE_ENV=production
RUN cd apps/backend && bun run build


# ─── runtime ────────────────────────────────────────────────────────────────
FROM node:24-slim AS runtime

COPY --from=oven/bun:1 /usr/local/bin/bun /usr/local/bin/bun
COPY --from=build /app/apps/backend/dist /app/apps/backend/dist
COPY --from=build /app/apps/backend/package.json /app/apps/backend/package.json

# Resolve the workspace symlinks that tsdown leaves behind by copying the
# whole monorepo's packages tree read-only. They're tiny (no node_modules).
COPY --from=build /app/packages /app/packages

WORKDIR /app/apps/backend

ENV NODE_ENV=production

EXPOSE 3000

CMD ["bun", "dist/index.mjs"]