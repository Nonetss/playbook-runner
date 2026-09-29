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

# Only what the frontend build reads, so a change elsewhere in the repo (the
# backend app, the Python app, proto, docs) leaves this layer and the build
# cached.
COPY packages packages
COPY apps/frontend apps/frontend

ENV NODE_ENV=production
# Build-time public values: Vite inlines PUBLIC_* into the bundle. Optional;
# unset (as in CI) it stays empty and SKIP_ENV_VALIDATION keeps the build green.
ARG PUBLIC_SERVER_URL
ENV PUBLIC_SERVER_URL=$PUBLIC_SERVER_URL
# vite.ssr.noExternal (astro.config.mjs) bundles every dependency into
# dist/server, so the runtime stage needs no node_modules.
RUN cd apps/frontend && bun run build

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:24-slim AS runtime
COPY --from=caddy:2-alpine /usr/bin/caddy /usr/local/bin/caddy
ENV NODE_ENV=production

COPY --from=build /app/apps/frontend/dist /app/apps/frontend/dist
COPY apps/frontend/Caddyfile /etc/caddy/Caddyfile
COPY apps/frontend/start.sh /start.sh
RUN chmod +x /start.sh

# Astro SSR escucha solo en localhost; Caddy expone el 80
ENV HOST=127.0.0.1
ENV PORT=4321

EXPOSE 80
# Unprivileged: Caddy can still bind :80 because Docker sets
# net.ipv4.ip_unprivileged_port_start=0 in containers (Docker >= 20.10).
USER node
CMD ["/start.sh"]
