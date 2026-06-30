#!/bin/sh
set -e
bun /app/apps/frontend/dist/server/entry.mjs &
exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
