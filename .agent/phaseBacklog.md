# Matria Phase Backlog

Document status: Draft  
Created: 2026-06-09  
Purpose: condensed actionable backlog for the next implementation sessions

## Current Repo State

- Workspace currently contains `.agents` documentation only.
- No application scaffold exists yet.
- Product decisions are locked in `.agents/PRD.md`.

## Completed

- Product contract seeded for hospital-ready Matria.
- Agent operating rules seeded.
- Implementation phases seeded.
- Environment, deployment, release, and provisioning docs seeded.

## Next Recommended Start

Start with Phase 1: monorepo scaffold and shared contracts.

Recommended first batch:

1. Create npm workspace root with TypeScript, ESLint, Prettier, and package scripts.
2. Add `apps/api`, `apps/web`, `apps/e2e`, `packages/contracts`, and `packages/test-fixtures`.
3. Define shared contract schemas for core entities and API response conventions.
4. Add minimal Express API with `/health` and `/ready`.
5. Add minimal Next.js app shell.
6. Add Vitest and Playwright harnesses.

## Backend Backlog

- Express runtime foundation.
- PostgreSQL migration tooling.
- pgvector extension migration.
- Authentication/session model.
- Full RBAC schema and middleware.
- Audit log writer.
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
