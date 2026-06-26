FROM node:24-slim AS base
COPY --from=oven/bun:1 /usr/local/bin/bun /usr/local/bin/bun
COPY --from=caddy:2-alpine /usr/bin/caddy /usr/local/bin/caddy
WORKDIR /app
ENV SKIP_ENV_VALIDATION=1

COPY . .
RUN --mount=type=cache,target=/root/.bun/install/cache bun install

ARG PUBLIC_SERVER_URL
ENV PUBLIC_SERVER_URL=${PUBLIC_SERVER_URL}
ENV NODE_ENV=production
RUN cd apps/web && bun run build
ENV SKIP_ENV_VALIDATION=

COPY apps/web/Caddyfile /etc/caddy/Caddyfile
COPY apps/web/start.sh /start.sh
RUN chmod +x /start.sh

# Astro SSR escucha solo en localhost; Caddy expone el 80
ENV HOST=127.0.0.1
ENV PORT=4321

EXPOSE 80
CMD ["/start.sh"]
