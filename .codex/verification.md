## Verification

### 2026-03-31 deployment verification

- Build/runtime:
  - `docker-compose --env-file deploy/.env.production -f deploy/docker-compose.prod.yml up -d --build` completed successfully after fixing Docker build order.
  - `docker-compose --env-file deploy/.env.production -f deploy/docker-compose.prod.yml ps` showed:
    - `deploy_postgres_1` healthy
    - `deploy_redis_1` healthy
    - `deploy_minio_1` healthy
    - `deploy_api_1` up on `127.0.0.1:3001`
    - `deploy_web_1` up on `127.0.0.1:3008`
- Local endpoint checks:
  - `curl -sS http://127.0.0.1:3001/health` => `{"status":"ok","database":true,"redis":true}`
  - `curl -I -sS http://127.0.0.1:3008/login` => `HTTP/1.1 200 OK`
- Reverse proxy checks:
  - `curl -I -sS -H 'Host: prompt.feixingqi.shop' http://127.0.0.1/login` => `HTTP/1.1 308 Permanent Redirect` to HTTPS
  - `curl -k -I -sS --resolve prompt.feixingqi.shop:443:127.0.0.1 https://prompt.feixingqi.shop/login` => `HTTP/2 200`
- Public domain check:
  - `curl -I -sS https://prompt.feixingqi.shop/login` => `HTTP/2 200`
- TLS/certificate:
  - `journalctl -u caddy.service --since '10 minutes ago' --no-pager | tail -n 80` showed ACME `http-01` challenge success and certificate obtained successfully for `prompt.feixingqi.shop`.
- Residual notes:
  - Prisma emitted an OpenSSL detection warning inside the container, but migrations and runtime startup still succeeded.
  - Caddy validation warned that the Caddyfile is not formatted; functional impact is none.

### 2026-03-31 i18n verification

- Build/type verification:
  - `docker-compose --env-file deploy/.env.production -f deploy/docker-compose.prod.yml build web` completed successfully.
  - Next.js production build passed including type validation.
- Redeploy:
  - Rebuilt image was applied by recreating `deploy_web_1`.
  - One stale failed container (`cb1e21fe5edf_deploy_web_1`) had to be removed first because the host uses legacy `docker-compose 1.29.2`, which hit a `ContainerConfig` recreate bug.
- Runtime checks after redeploy:
  - `docker ps ...` showed `deploy_web_1` up and `deploy_api_1` still up.
  - `curl -I -sS https://prompt.feixingqi.shop/login` => `HTTP/2 200`
  - `curl -sS http://127.0.0.1:3001/health` => `{"status":"ok","database":true,"redis":true}`
- Scope note:
  - Internationalization capability is now available globally via provider + switcher.
  - The shell and auth entry pages are migrated.
  - Most dashboard feature pages still contain hard-coded Chinese text and need follow-up migration to become fully bilingual.

### 2026-03-31 full i18n migration verification

- Source sweep:
  - Re-scanned `apps/web/src` for hard-coded Chinese strings.
  - Remaining Chinese text is now limited to the `zh-CN` dictionary entries in `apps/web/src/lib/i18n.ts` plus the initial fallback meta description in the root layout.
- Build/type verification:
  - `docker-compose --env-file deploy/.env.production -f deploy/docker-compose.prod.yml build web` completed successfully.
  - Next.js production build passed after migrating the remaining dashboard pages and shared components.
- Redeploy:
  - Rebuilt image was applied by recreating `deploy_web_1`.
  - Legacy `docker-compose 1.29.2` again hit the `ContainerConfig` recreate bug; the stale failed container `4fa75074f721_deploy_web_1` was removed before a clean `web` startup.
- Runtime checks after full rollout:
  - `docker ps ...` showed `deploy_web_1` up and `deploy_api_1` still up.
  - `curl -I -sS https://prompt.feixingqi.shop/login` => `HTTP/2 200`
  - `curl -sS http://127.0.0.1:3001/health` => `{"status":"ok","database":true,"redis":true}`
- Outcome:
  - The web app now has dictionary-backed i18n across auth, shell, shared prompt utilities, import/export dialogs, and dashboard feature pages.

### 2026-03-31 documentation update verification

- Added documentation files:
  - `docs/USAGE_GUIDE.md`
  - `docs/ARCHITECTURE.md`
- Updated `README.md` to expose documentation links.
- Consistency checks performed:
  - verified docs reference the current monorepo structure under `apps/`, `packages/`, and `deploy/`
  - verified deployment commands match the current `docker-compose.prod.yml` workflow
  - verified documented production routing matches current live topology:
    - `prompt.feixingqi.shop` -> `web`
    - `/api/*` and `/health` -> `api`
- Runtime impact:
  - documentation-only change
  - no application code or deployment behavior changed in this step

### 2026-03-31 documentation suite expansion verification

- Added documentation files:
  - `docs/API_REFERENCE.md`
  - `docs/DATABASE_DESIGN.md`
  - `docs/OPERATIONS_SOP.md`
- Updated `README.md` to expose the additional documentation links.
- Consistency checks performed:
  - verified API route descriptions against current NestJS controllers under `apps/api/src/*`
  - verified data model explanations against `apps/api/prisma/schema.prisma`
  - verified operations commands against the current `deploy/docker-compose.prod.yml` and live domain `prompt.feixingqi.shop`
  - verified the documented `docker-compose 1.29.2` recreate issue matches the observed host behavior during recent deployments
- Runtime impact:
  - documentation-only change
  - no application code or deployment behavior changed in this step

### 2026-03-31 guide assistant implementation verification

- Local direct `npm run typecheck` / `npm run test` verification was not available because this workspace currently does not have local `node_modules` installed:
  - `tsc: not found`
  - `jest: not found`
- Build verification was completed with the existing production container workflow instead:
  - `docker-compose --env-file deploy/.env.production -f deploy/docker-compose.prod.yml build api` completed successfully
  - `docker-compose --env-file deploy/.env.production -f deploy/docker-compose.prod.yml build web` completed successfully
- What was covered by those builds:
  - shared package TypeScript compilation
  - NestJS API compilation including the new `assistant` module
  - Next.js production build including the new floating guide assistant UI
- Additional implementation notes:
  - Anthropic adapter was updated so `system` instructions are passed through correctly, which is required for guide-assistant prompt control
  - assistant knowledge loading depends on repository Markdown docs being present in the API runtime image; current Dockerfile copies the full repo, so this condition is satisfied
- Deployment status:
  - code is implemented and build-verified
  - production containers were not restarted in this step

### 2026-03-31 guide assistant deployment verification

- Image builds:
  - `docker-compose --env-file deploy/.env.production -f deploy/docker-compose.prod.yml build api web` completed successfully
- Rollout:
  - `web` remained available after rollout and continued serving on `127.0.0.1:3008`
  - `docker-compose ... up -d --no-deps api web` hit the known host `docker-compose 1.29.2` `ContainerConfig` recreate bug on `api`
  - the failed stale API container was removed, then the rebuilt `deploy_api:latest` image was started manually as `deploy_api_1` on network `deploy_default` with the production env and port mapping
- Runtime checks after recovery:
  - `docker ps` showed:
    - `deploy_api_1` up
    - `deploy_web_1` up
    - `deploy_postgres_1` healthy
    - `deploy_redis_1` healthy
    - `deploy_minio_1` healthy
  - `curl -sS http://127.0.0.1:3001/health` => `{"status":"ok","database":true,"redis":true}`
  - `curl -I -sS http://127.0.0.1:3008/login` => `HTTP/1.1 200 OK`
  - `curl -I -sS https://prompt.feixingqi.shop/login` => `HTTP/2 200`
- Assistant-specific confirmation:
  - API startup logs showed `AssistantModule dependencies initialized`
  - API route mapping included `POST /api/v1/orgs/:orgId/assistant/guide`
- Residual notes:
  - Prisma still emits the OpenSSL detection warning inside the container, but startup and runtime health are successful
  - `api` is currently running via manual `docker run` rather than compose-managed state because of the host's legacy compose recreate bug

### 2026-03-31 action assistant implementation and deployment verification

- Build verification:
  - `docker-compose --env-file deploy/.env.production -f deploy/docker-compose.prod.yml build api` completed successfully after fixing TypeScript issues in the new assistant action flow
  - `docker-compose --env-file deploy/.env.production -f deploy/docker-compose.prod.yml build web` completed successfully with the upgraded dashboard assistant UI
- What those builds covered:
  - shared assistant action/session types under `packages/shared`
  - NestJS assistant controller/service/module changes for action chat and undo
  - React assistant hook and floating UI changes for multi-turn collection, execution results, and undo
- Rollout:
  - `web` was redeployed by removing the old `deploy_web_1` container and starting the rebuilt image again through compose
  - `api` again hit the host's legacy `docker-compose 1.29.2` `ContainerConfig` recreate bug during replacement
  - the stale `deploy_api_1` container was removed and the rebuilt `deploy_api:latest` image was started manually with:
    - network `deploy_default`
    - port `127.0.0.1:3001:3001`
    - production env values from `deploy/.env.production`
- Runtime checks after rollout:
  - `curl -sS http://127.0.0.1:3001/health` => `{"status":"ok","database":true,"redis":true}`
  - `curl -I -sS http://127.0.0.1:3008/login` => `HTTP/1.1 200 OK`
  - `curl -I -sS https://prompt.feixingqi.shop/login` => `HTTP/2 200`
- Assistant-specific confirmation:
  - API startup logs mapped both new routes:
    - `POST /api/v1/orgs/:orgId/assistant/actions/chat`
    - `POST /api/v1/orgs/:orgId/assistant/actions/undo`
  - direct unauthenticated probe to `POST /api/v1/orgs/test-org/assistant/actions/chat` returned `401`, confirming the route exists and remains guard-protected
- Scope note:
  - this verification confirms compile success, route registration, protected access, and live service health
  - it does not include a full authenticated browser E2E run of creating and undoing a prompt through the assistant UI

### 2026-03-31 action assistant authenticated flow verification

- Real authenticated API flow was executed against the live local API on `127.0.0.1:3001` using a freshly registered temporary account and organization.
- Verification path:
  - `POST /api/v1/auth/register` created a temporary owner user and workspace successfully
  - `POST /api/v1/orgs/:orgId/assistant/actions/chat` with message `帮我创建一个提示词` returned a collecting response with pending fields `标题` and `内容`
  - a second `actions/chat` call with `标题叫销售开场白` reduced the pending fields to only `内容`
  - a third `actions/chat` call with the prompt body created a new prompt successfully and returned:
    - `executedActions[0].type = prompt`
    - `executedActions[0].name = 销售开场白`
    - `href = /prompts/<promptId>`
    - `canUndo = true`
  - `POST /api/v1/orgs/:orgId/assistant/actions/undo` with the same `sessionId` successfully rolled back the newly created prompt and returned `canUndo = false`
- Outcome:
  - the multi-turn collection flow works
  - prompt creation through the assistant works
  - undo of the most recent assistant-created prompt works
- Residual note:
  - the action replies currently still carry document citations from the retrieval layer even during pure field-collection turns; functionally acceptable, but the citation selection quality can be improved in a later refinement
