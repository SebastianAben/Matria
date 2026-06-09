# Matria Phase Backlog

Document status: Draft  
Created: 2026-06-09  
Purpose: condensed actionable backlog for the next implementation sessions

## Current Repo State

- Workspace contains `.agent` documentation plus the TypeScript monorepo scaffold.
- Application scaffold exists for API, web, E2E, shared contracts, and synthetic fixtures.
- Phase 6 initial web clinical workspace is implemented with authenticated API workflow, encounter capture, preflight results, clinician review, approval/reject actions, FHIR export, and Playwright coverage.
- Product decisions are locked in `.agent/PRD.md`.

## Completed

- Product contract seeded for hospital-ready Matria.
- Agent operating rules seeded.
- Implementation phases seeded.
- Environment, deployment, release, and provisioning docs seeded.
- Phase 1 initial monorepo scaffold completed.
- Root quality gates pass locally: `format:check`, `lint`, `typecheck`, `test`, `build`, and `e2e`.
- Phase 2 backend/API foundation section implemented locally on branch `codex/phase2-backend-api-foundation`.
- Phase 3 initial clinical domain and rules engine foundation implemented locally.
- Phase 4 initial AI orchestration and review lifecycle foundation implemented locally.
- Phase 5 initial FHIR export foundation implemented locally.
- Phase 6 initial web clinical workspace implemented locally.

## Next Recommended Start

Continue persistence hardening and production hardening after confirming whether the local Phase 2-6 work should be pushed.

Recommended next batch:

1. Review and confirm whether to push the backend/API and web clinical workspace branch.
2. Replace the in-memory clinical store with PostgreSQL-backed repositories using migration `0003`.
3. Add real database-backed auth/session storage or document the transition from in-memory bootstrap sessions.
4. Add seed data for roles and permissions.
5. Add integration tests against a PostgreSQL test container or local database.
6. Add rate limits and secure cookie production settings.
7. Replace local deterministic AI provider stubs with configured provider implementations behind the existing adapter interfaces.
8. Add database-backed FHIR export repository using migration `0005`.

## Backend Backlog

- Express runtime foundation. Implemented for backend/API section.
- PostgreSQL migration tooling. Initial runner implemented.
- pgvector extension migration. Initial migration implemented.
- Authentication/session model. In-memory bootstrap foundation implemented; durable storage pending.
- Full RBAC schema and middleware. Middleware and initial schema migration implemented; role/permission seeding pending.
- Audit log writer. In-memory and database writer implemented.
- Patient, pregnancy episode, and encounter APIs. Initial in-memory implementation complete.
- Consent and clinical file metadata APIs.
- Structured observation APIs. Initial in-memory implementation complete.
- Mandatory-field preflight. Initial implementation complete for systolic BP, diastolic BP, and gestational age.
- Maternal red-flag rules. Initial implementation complete for severe hypertension and preeclampsia symptom cluster.
- AI orchestration adapter boundaries. Initial Gemini and MedGemma boundaries implemented with deterministic local adapters.
- Approval lifecycle. Initial generated output edit, approve, reject, and approval-gated memory implemented.
- FHIR R4 export. Initial in-memory implementation complete; database-backed repository pending.

## Frontend Backlog

- Authenticated app shell. Initial implementation complete.
- Clinical encounter capture. Initial API-backed demo workflow complete.
- Vitals and structured observation forms. Initial seeded structured observation capture complete.
- File upload surfaces for lab, record, audio, and ultrasound media. Initial UI surfaces complete; real upload persistence pending.
- Preflight results panel. Initial implementation complete.
- Clinician review workspace. Initial implementation complete.
- Approval/edit/reject flows. Initial implementation complete.
- Admin user and role management.
- Audit log view.

## Testing Backlog

- Vitest rules engine tests.
- Vitest RBAC permission tests.
- Vitest FHIR mapping tests. Initial route and provenance coverage implemented.
- Vitest audit logging tests.
- Vitest AI orchestration and approval-gated memory tests.
- Integration tests for encounter lifecycle.
- Playwright clinician ANC flow. Initial capture-to-FHIR workflow implemented.
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
