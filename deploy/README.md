# Production Deployment

This repository now includes a container-first deployment path that avoids relying on the host Node.js version.

## Files

- `deploy/.env.production.example`: production environment template
- `deploy/docker-compose.prod.yml`: production stack
- `deploy/Caddyfile.prompt.feixingqi.shop`: Caddy site block for `prompt.feixingqi.shop`

## Expected routing

- `https://prompt.feixingqi.shop/` -> Next.js frontend
- `https://prompt.feixingqi.shop/api/*` -> NestJS API
- `https://prompt.feixingqi.shop/health` -> backend health endpoint

## Deploy

1. Copy `deploy/.env.production.example` to `deploy/.env.production` and replace all placeholder secrets.
2. Start the stack:

```bash
docker compose --env-file deploy/.env.production -f deploy/docker-compose.prod.yml up -d --build
```

3. Merge the contents of `deploy/Caddyfile.prompt.feixingqi.shop` into `/etc/caddy/Caddyfile`.
4. Reload Caddy.
