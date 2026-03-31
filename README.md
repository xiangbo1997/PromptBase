# PromptBase

PromptBase is a team-oriented AI prompt management platform built as a Turbo monorepo.

## Stack

- `apps/web`: Next.js 14 frontend
- `apps/api`: NestJS + Fastify backend
- `packages/shared`: shared types and contracts
- `packages/ui`: shared UI helpers

## Core Features

- Team authentication and organization membership
- Prompt library with favorites, pinning, folders, and tags
- Prompt editing, version history, and template variables
- Model provider management and AI test runs
- Import/export jobs and audit logs

## Local Infrastructure

The backend expects these services:

- PostgreSQL
- Redis
- S3-compatible object storage (MinIO by default in local development)

The repository includes a `docker-compose.yml` for local infra startup.

## Development

Install dependencies and start the monorepo:

```bash
npm install
npm run dev
```

Default local ports:

- Web: `http://localhost:3008`
- API: `http://127.0.0.1:3001`

## Deployment Notes

For production deployment, prefer running the frontend and backend as built services, and use managed PostgreSQL, Redis, and object storage instead of colocating every dependency on a small VPS.

## Documentation

- Usage and operations guide: [docs/USAGE_GUIDE.md](/software/PromptBase/docs/USAGE_GUIDE.md)
- Technical architecture: [docs/ARCHITECTURE.md](/software/PromptBase/docs/ARCHITECTURE.md)
- API reference: [docs/API_REFERENCE.md](/software/PromptBase/docs/API_REFERENCE.md)
- Database design: [docs/DATABASE_DESIGN.md](/software/PromptBase/docs/DATABASE_DESIGN.md)
- Operations SOP: [docs/OPERATIONS_SOP.md](/software/PromptBase/docs/OPERATIONS_SOP.md)
- Production deployment notes: [deploy/README.md](/software/PromptBase/deploy/README.md)
