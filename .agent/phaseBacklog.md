# Matria Phase Backlog

Document status: Draft  
Created: 2026-06-09  
Purpose: condensed actionable backlog for the next implementation sessions

## Current Repo State

- Workspace contains `.agent` documentation plus the initial Phase 1 TypeScript monorepo scaffold.
- Application scaffold exists for API, web, E2E, shared contracts, and synthetic fixtures.
- Product decisions are locked in `.agent/PRD.md`.

## Completed

- Product contract seeded for hospital-ready Matria.
- Agent operating rules seeded.
- Implementation phases seeded.
- Environment, deployment, release, and provisioning docs seeded.
- Phase 1 initial monorepo scaffold completed.
- Root quality gates pass locally: `format:check`, `lint`, `typecheck`, `test`, `build`, and `e2e`.
- Phase 2 backend/API foundation section implemented locally on branch `codex/phase2-backend-api-foundation`.

## Next Recommended Start

Continue Phase 2: backend foundation.

Recommended next batch:

1. Review and confirm whether to push the backend/API section branch.
2. Add real database-backed auth/session storage or document the transition from in-memory bootstrap sessions.
3. Add seed data for roles and permissions.
4. Add integration tests against a PostgreSQL test container or local database.
5. Add rate limits and secure cookie production settings.
6. Decide the next section branch: backend persistence, deployment assets, or frontend authenticated shell.

## Backend Backlog

- Express runtime foundation. Implemented for backend/API section.
- PostgreSQL migration tooling. Initial runner implemented.
- pgvector extension migration. Initial migration implemented.
- Authentication/session model. In-memory bootstrap foundation implemented; durable storage pending.
- Full RBAC schema and middleware. Middleware and initial schema migration implemented; role/permission seeding pending.
- Audit log writer. In-memory and database writer implemented.
- Patient, pregnancy episode, and encounter APIs.
- Consent and clinical file metadata APIs.
- Structured observation APIs.
- Mandatory-field preflight.
- Maternal red-flag rules.
- AI orchestration adapter boundaries.
- Approval lifecycle.
- FHIR R4 export.

## Frontend Backlog

- Authenticated app shell.
- Clinical encounter capture.
- Vitals and structured observation forms.
- File upload surfaces for lab, record, audio, and ultrasound media.
- Preflight results panel.
- Clinician review workspace.
- Approval/edit/reject flows.
- Admin user and role management.
- Audit log view.

## Testing Backlog

- Vitest rules engine tests.
- Vitest RBAC permission tests.
- Vitest FHIR mapping tests.
- Vitest audit logging tests.
- Integration tests for encounter lifecycle.
- Playwright clinician ANC flow.
- Playwright admin RBAC flow.
- Playwright unauthorized access flow.
- Deployment smoke tests.

## Deployment Backlog

- API Dockerfile.
- Web Dockerfile.
- PostgreSQL + pgvector Compose service.
- Caddy reverse proxy.
- Runtime production env example.
- VM bootstrap script.
- Remote preflight script.
- Remote deploy script.
- Remote rollback script.
- Smoke-check and readiness assertion scripts.
- GitHub Actions CI and deploy workflows.

## Verification Baseline

The first implementation batch should be considered complete only when:

- `npm run format:check` passes.
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm test` passes.
- `npm run build` passes.
- minimal Playwright harness runs or is explicitly documented as pending due to missing UI routes.
