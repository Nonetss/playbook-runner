FROM caddy:2-alpine

COPY apps/gateway/Caddyfile /etc/caddy/Caddyfile

# 80: public HTTP entry point (the only port compose publishes)
# 50050: internal gRPC router (expose only, never published)
EXPOSE 80 50050

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
