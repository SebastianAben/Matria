# Matria Environment Matrix

Document status: Draft  
Created: 2026-06-09  
Purpose: canonical environment topology for local, E2E, and production

## Local Development

Purpose: developer implementation and fast feedback.

Expected services:

- API: Express.js on `http://localhost:4000`.
- Web: Next.js on `http://localhost:3000`.
- Database: local PostgreSQL with pgvector, preferably through Docker Compose.
- AI providers: configured through local env variables; tests should mock providers by default.

Local env expectations:

- No real patient data.
- Synthetic or de-identified fixtures only.
- AI provider keys stored in local ignored env files.
- File uploads may use local filesystem or local object-storage emulator until production storage is chosen.

## E2E

Purpose: automated browser validation of backend/web workflows.

Expected services:

- API test instance.
- Web test instance.
- Isolated PostgreSQL test database.
- Seeded synthetic ANC fixtures.
- AI provider stubs or deterministic test adapters unless a specific external-provider smoke test is requested.

Required checks:

- clinician ANC encounter flow
- admin RBAC flow
- unauthorized access flow
- approval-gated FHIR export flow
- readiness endpoint behavior

## Production

Purpose: single-hospital hosted runtime.

Target topology:

- One VM.
- Docker Compose-managed services.
- Caddy terminates TLS and routes traffic.
- Express API runs as internal service on port `4000`.
- Next.js web runs as internal service on port `3000`.
- PostgreSQL with pgvector persists under a shared VM directory.

Planned domains:

- Web domain: `matria.example.com` until the real domain is provisioned.
- API domain: `api.matria.example.com` until the real domain is provisioned.

Required production secrets:

- `PRODUCTION_VM_HOST`
- `PRODUCTION_VM_USER`
- `PRODUCTION_VM_SSH_PORT`
- `PRODUCTION_VM_SSH_PRIVATE_KEY`
- `PRODUCTION_VM_SSH_KNOWN_HOSTS`
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

## Out Of Scope For First Production Topology

- Kubernetes.
- Multi-tenant hospital isolation.
- Live external FHIR server submission.
- Direct frontend access to PostgreSQL.
- Training or fine-tuning on patient data.
