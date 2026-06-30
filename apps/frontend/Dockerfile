# syntax=docker/dockerfile:1.7
#
# Multi-stage build:
#   build   — installs deps, runs `bun run build`, produces dist/
#   runtime — caddy + bun (for SSR) + the built dist/

# ─── build ──────────────────────────────────────────────────────────────────
FROM oven/bun:1 AS build

ENV SKIP_ENV_VALIDATION=1 \
    NODE_ENV=production

WORKDIR /app

COPY package.json bun.lock turbo.json ./
COPY packages ./packages
COPY apps ./apps

RUN --mount=type=cache,target=/root/.bun/install/cache bun install --frozen-lockfile
RUN cd apps/frontend && bun run build


# ─── runtime ────────────────────────────────────────────────────────────────
FROM caddy:2-alpine AS runtime

COPY --from=build /usr/local/bin/bun /usr/local/bin/bun

WORKDIR /app

COPY --from=build /app/apps/frontend/dist /app/apps/frontend/dist
COPY --from=build /app/apps/frontend/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/apps/frontend/start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80

CMD ["/start.sh"]
