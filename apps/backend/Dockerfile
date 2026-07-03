FROM node:24-slim AS base
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
RUN --mount=type=cache,target=/root/.bun/install/cache bun install --frozen-lockfile

COPY . .

ENV NODE_ENV=production
RUN cd apps/backend && bun run build
ENV SKIP_ENV_VALIDATION=

EXPOSE 3000

WORKDIR /app/apps/backend
CMD ["bun", "dist/index.mjs"]
