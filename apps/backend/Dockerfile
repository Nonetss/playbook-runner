# syntax=docker/dockerfile:1.7
#
# Multi-stage build:
#   build   — installs deps, runs `bun run build`, produces dist/index.mjs
#   runtime — only the compiled bundle + bun runtime (no source, no
#             node_modules — tsdown bundles all deps into dist/index.mjs)

# ─── build ──────────────────────────────────────────────────────────────────
FROM oven/bun:1 AS build

ENV SKIP_ENV_VALIDATION=1 \
    NODE_ENV=production

WORKDIR /app

COPY package.json bun.lock turbo.json ./
COPY packages ./packages
COPY apps ./apps

RUN --mount=type=cache,target=/root/.bun/install/cache bun install --frozen-lockfile
RUN cd apps/backend && bun run build


# ─── runtime ────────────────────────────────────────────────────────────────
FROM oven/bun:1-slim AS runtime

COPY --from=build /app/apps/backend/dist /app/apps/backend/dist

WORKDIR /app/apps/backend

ENV NODE_ENV=production

EXPOSE 3000

CMD ["bun", "dist/index.mjs"]
