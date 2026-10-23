FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY docs /srv/docs
ENV PORT=8080
EXPOSE 8080
