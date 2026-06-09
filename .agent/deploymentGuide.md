# Matria Production Deployment Guide

Document status: Draft  
Created: 2026-06-09  
Purpose: production deployment runbook following the loom VM deployment pattern

## 1. Deployment Model

Matria deploys as a single-VM Docker Compose application:

- `caddy`: reverse proxy and TLS termination.
- `postgres`: PostgreSQL with pgvector.
- `api`: Express.js backend.
- `web`: Next.js frontend.

GitHub Actions uploads a source release archive to the VM over SSH. The VM builds containers locally and runs `docker compose up -d --build`. A failed validation rolls back to the previously recorded release when available.

## 2. Prerequisites

- Linux VM with SSH access.
- Docker Engine and Docker Compose plugin installed.
- DNS records for web and API domains pointing to the VM.
- GitHub repository secrets configured.
- Production runtime env file rendered by GitHub Actions.
- No real patient data used before hospital approval and legal/compliance signoff.

## 3. VM Paths

Use these paths unless a future ADR changes them:

- Base directory: `/opt/matria/hosted`
- Releases: `/opt/matria/hosted/releases`
- Current symlink: `/opt/matria/hosted/current`
- Current release marker: `/opt/matria/hosted/current_release`
- Shared directory: `/opt/matria/hosted/shared`
- Runtime env: `/opt/matria/hosted/shared/runtime.env`
- PostgreSQL data: `/opt/matria/hosted/shared/postgres-data`
- Caddy data: `/opt/matria/hosted/shared/caddy-data`
- Caddy config: `/opt/matria/hosted/shared/caddy-config`

## 4. Required GitHub Secrets

VM SSH:

- `PRODUCTION_VM_HOST`
- `PRODUCTION_VM_USER`
- `PRODUCTION_VM_SSH_PORT`
- `PRODUCTION_VM_SSH_PRIVATE_KEY`
- `PRODUCTION_VM_SSH_KNOWN_HOSTS`

Runtime:

- `PRODUCTION_CADDY_EMAIL`
- `PRODUCTION_POSTGRES_DB`
- `PRODUCTION_POSTGRES_USER`
- `PRODUCTION_POSTGRES_PASSWORD`
- `PRODUCTION_SESSION_SECRET`
- `PRODUCTION_ENCRYPTION_KEY`
- `PRODUCTION_GEMINI_API_KEY`
- `PRODUCTION_MEDGEMMA_ENDPOINT`
- `PRODUCTION_MEDGEMMA_API_KEY`
- `PRODUCTION_ADMIN_BOOTSTRAP_EMAIL`
- `PRODUCTION_ADMIN_BOOTSTRAP_PASSWORD`

## 5. Compose Services

The production Compose file must define:

- `postgres` with pgvector enabled and persistent volume under `${SHARED_DIR}/postgres-data`.
- `api` built from `apps/api/Dockerfile`, with `DATABASE_URL`, session, encryption, and AI provider env vars.
- `web` built from `apps/web/Dockerfile`, with public API base URL build arg or runtime env.
- `caddy` using `deploy/caddy/Caddyfile`, public ports `80` and `443`, and persistent Caddy directories.

## 6. CI Gate

Before deployment, CI must run:

- dependency install
- format check
- lint
- typecheck
- Vitest backend tests
- Playwright E2E tests
- production build
- Docker Compose config validation
- hosted image build
- security scans

Production deployment should run only after CI success on `main` or manual workflow dispatch.

## 7. Deployment Steps

GitHub Actions should:

1. Checkout the selected ref.
2. Resolve release SHA.
3. Validate required secrets.
4. Start SSH agent.
5. Configure known hosts.
6. Create remote release and shared directories.
7. Capture previous release.
8. Upload source archive into the release directory.
9. Render `runtime.env`.
10. Upload runtime env with restricted permissions.
11. Run remote preflight.
12. Run remote deploy script.
13. Smoke-check API health, API readiness, and web.
14. Roll back on failed validation when previous release exists.

## 8. Remote Preflight

Remote preflight must verify:

- `APP_ENV=production`.
- Required directories exist and are writable.
- Runtime env exists and is non-empty.
- Docker is available.
- Docker Compose is available.
- Web and API domains resolve to the expected VM IP when the expected host is an IP.
- Compose file exists in the release.

## 9. Runtime Readiness

API `/ready` must verify:

- database connection
- migrations are current
- pgvector extension is available
- required secrets are configured
- AI provider configuration exists or is explicitly disabled for a known maintenance mode

## 10. Rollback

Rollback must:

- accept target release SHA
- verify the release directory exists
- run Compose from the target release
- wait for service readiness
- update `current` symlink and `current_release`
- preserve shared database and Caddy directories

Rollback does not undo database migrations unless a future migration policy explicitly supports down migrations.

## 11. Smoke Checks

Required smoke targets:

- `https://api-domain/health`
- `https://api-domain/ready`
- `https://web-domain`

Smoke checks should retry for a bounded period before failing.

## 12. Troubleshooting

Common failures:

- Missing GitHub secret: update repository or environment secret.
- SSH known-host mismatch: refresh `PRODUCTION_VM_SSH_KNOWN_HOSTS` after verifying the VM identity.
- Docker permission denied: ensure deploy user can run Docker.
- DNS mismatch: update A records or expected host configuration.
- Caddy TLS failure: verify DNS, ports `80` and `443`, and Caddy email.
- API readiness failure: inspect API logs, database health, migration state, and required env vars.
- AI provider failure: verify API key, endpoint, network access, and provider status.

## 13. Secret Rotation Notes

Rotate secrets through GitHub environment secrets and redeploy. For database password rotation, plan a maintenance window and update both PostgreSQL credentials and API `DATABASE_URL` consistently.
