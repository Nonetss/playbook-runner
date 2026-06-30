# syntax=docker/dockerfile:1.7
#
# Multi-stage build:
#   build   — installs deps, runs `bun run build`, produces dist/
#   runtime — only the runtime deps + Caddy + the built dist/

# ─── build ──────────────────────────────────────────────────────────────────
FROM node:24-slim AS build

ENV SKIP_ENV_VALIDATION=1

COPY --from=oven/bun:1 /usr/local/bin/bun /usr/local/bin/bun

WORKDIR /app

# Copy manifests first so the install layer is cache-friendly: as long as the
# manifests don't change, this layer (and the heavy `bun install` it produces)
# is reused across builds.
COPY package.json bun.lock turbo.json ./
COPY packages ./packages
COPY apps ./apps

RUN --mount=type=cache,target=/root/.bun/install/cache bun install --frozen-lockfile

ENV NODE_ENV=production
RUN cd apps/frontend && bun run build


# ─── runtime ────────────────────────────────────────────────────────────────
FROM caddy:2-alpine AS runtime

WORKDIR /app

# Astro's SSR build output + the Caddyfile + start.sh. Nothing else from the
# build stage is copied (no node_modules, no source, no bun).
COPY --from=build /app/apps/frontend/dist /app/apps/frontend/dist
COPY --from=build /app/apps/frontend/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/apps/frontend/start.sh /start.sh
RUN chmod +x /start.sh

ENV HOST=127.0.0.1
ENV PORT=4321

EXPOSE 80

CMD ["/start.sh"]