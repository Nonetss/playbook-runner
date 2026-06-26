#!/bin/sh
set -e
node /app/apps/web/dist/server/entry.mjs &
exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
