FROM node:24-slim AS base
COPY --from=oven/bun:1 /usr/local/bin/bun /usr/local/bin/bun
COPY --from=caddy:2-alpine /usr/bin/caddy /usr/local/bin/caddy
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
RUN --mount=type=cache,target=/root/.bun/install/cache bun install --frozen-lockfile

COPY . .

ENV NODE_ENV=production
RUN cd apps/frontend && bun run build
ENV SKIP_ENV_VALIDATION=

COPY apps/frontend/Caddyfile /etc/caddy/Caddyfile
COPY apps/frontend/start.sh /start.sh
RUN chmod +x /start.sh

# Astro SSR escucha solo en localhost; Caddy expone el 80
ENV HOST=127.0.0.1
ENV PORT=4321

EXPOSE 80
CMD ["/start.sh"]
