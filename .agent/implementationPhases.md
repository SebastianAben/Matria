# Matria Implementation Phases

Document status: Draft  
Created: 2026-06-09  
Purpose: implementation roadmap for the hospital-ready Matria product

## 1. Roadmap Summary

Matria should be built as a TypeScript monorepo with Express.js backend, Next.js frontend, shared contracts, Playwright E2E tests, and production deployment assets. The product must preserve clinical safety from the first implementation phase: deterministic preflight before LLM synthesis, full RBAC, audit logging, and clinician approval before memory writes or FHIR export.

## 2. Target Repository Layout

- `apps/api`: Express.js API, TypeScript, Vitest, PostgreSQL access, RBAC, AI orchestration, FHIR export.
- `apps/web`: Next.js clinical and admin UI.
- `apps/e2e`: Playwright E2E tests.
- `packages/contracts`: shared schemas, route contracts, domain types, validation helpers.
- `packages/test-fixtures`: synthetic ANC cases, red-flag scenarios, FHIR examples.
- `deploy`: Docker Compose, Caddy, runtime env example, remote deploy scripts, smoke checks.
- `.github/workflows`: CI, security scans, production deploy.
- `.agent`: project memory and execution docs.

## 3. Cross-cutting Engineering Rules

- Backend owns all mutations and clinical governance rules.
- Frontend never talks directly to PostgreSQL or AI providers.
- Shared contracts must define request/response schemas used by API and web.
- Deterministic maternal safety rules must be testable without AI providers.
- AI outputs are drafts until approved.
- Every sensitive action must create an audit event.
- Production code must be deployable through the single-VM Docker Compose path.

## 4. Phase 0 - Product Contract and Agent Memory

Status: initial docs seeded.

Deliverables:

- `.agent/PRD.md`
- `.agent/RULES.md`
- implementation roadmap, backlog, environment matrix, deployment guide, release checklist, provisioning checklist

Acceptance:

- Future sessions can implement without re-deciding product scope, deployment model, or clinical safety posture.

## 5. Phase 1 - Monorepo Scaffold and Shared Contracts

Status: initial implementation complete on 2026-06-09.

Deliverables:

- npm workspace root with TypeScript, ESLint, Prettier, and shared scripts.
- `apps/api`, `apps/web`, `apps/e2e`, `packages/contracts`, `packages/test-fixtures`.
- Shared domain schemas for patient, pregnancy episode, encounter, observation, rule result, generated output, approval, FHIR export, and audit log.
- Root scripts for `lint`, `format:check`, `typecheck`, `test`, `build`, and `e2e`.

Acceptance:

- CI-style commands run locally.
- Contracts build before API and web.

Implemented notes:

- npm workspace root, TypeScript base config, ESLint, Prettier, and shared scripts are present.
- `apps/api`, `apps/web`, `apps/e2e`, `packages/contracts`, and `packages/test-fixtures` are present.
- Shared Zod contracts cover core Phase 1 entities and API health/readiness responses.
- Minimal Express API exposes `/health` and `/ready`.
- Minimal Next.js app shell exposes a clinical workspace landing surface.
- Vitest and Playwright harnesses run locally.

## 6. Phase 2 - Backend Foundation

Status: backend/API foundation section implemented locally on branch `codex/phase2-backend-api-foundation` on 2026-06-09. Push requires user confirmation.

Deliverables:

- Express runtime with structured config, logging, error handling, and request IDs.
- PostgreSQL connection and migration system.
- pgvector extension migration.
- Health and readiness endpoints.
- Authentication and session foundation.
- RBAC entities and permission middleware.
- Audit logging infrastructure.

Acceptance:

- `/health` and `/ready` respond correctly.
- RBAC middleware is covered by Vitest.
- Readiness fails when database dependency is unavailable.

Implemented notes:

- Express runtime now has request context propagation, structured logger setup, centralized not-found and error handlers.
- PostgreSQL pool creation and migration runner exist under `apps/api/src/db`.
- Initial migrations cover pgvector extension enablement plus RBAC/audit foundation tables.
- `/ready` checks database connectivity, pending migrations, pgvector availability, and contract health.
- Auth/session foundation supports bootstrap admin login with secure HTTP-only session cookie semantics for local foundation work.
- RBAC middleware protects `/audit-logs`, and Vitest covers unauthenticated and authorized access.
- Audit writer has in-memory and database-backed implementations.

## 7. Phase 3 - Clinical Domain and Rules Engine

Status: initial clinical/API foundation implemented locally on 2026-06-09.

Deliverables:

- Patient, pregnancy episode, encounter, consent, file metadata, and structured observation APIs.
- Mandatory-field preflight.
- Maternal red-flag rules engine.
- Uncertainty and low-confidence annotation model.
- Synthetic fixture cases for normal, missing-field, and high-risk ANC scenarios.

Acceptance:

- Severe hypertension and other configured red flags trigger deterministic rule results.
- Missing required fields create prompts before AI synthesis.
- Patient and pregnancy scoping is enforced in tests.

Implemented notes:

- Shared contracts now include clinical preflight prompts, uncertainty annotations, and coded structured observations.
- Express API exposes authenticated clinical routes for patients, pregnancy episodes, encounters, structured observations, and encounter preflight.
- In-memory clinical store enforces patient/pregnancy episode scoping for encounter creation.
- Deterministic rules engine triggers severe hypertension and preeclampsia symptom-cluster rule results before AI synthesis.
- Mandatory ANC preflight currently requires systolic BP, diastolic BP, and gestational age.
- Synthetic fixtures cover normal ANC, missing-field ANC, and severe-hypertension ANC observations.
- Migration `0003` prepares PostgreSQL tables for patients, pregnancy episodes, encounters, and structured observations.

## 8. Phase 4 - AI Orchestration and Review Lifecycle

Deliverables:

- Gemini orchestration adapter.
- MedGemma evidence tool adapter boundary.
- Patient memory retriever and writer with approval gate.
- Tool-call audit records.
- Output validator that preserves hard flags and uncertainty.
- Generated output lifecycle: draft, edited, approved, rejected.

Acceptance:

- AI synthesis cannot run before preflight.
- Provider failure leaves deterministic rules visible and does not create approved output.
- Memory writes require approved output and correct scope.

## 9. Phase 5 - FHIR Export

Deliverables:

- FHIR R4 formatter for approved encounter/referral summaries.
- Export artifact persistence.
- Provenance for approving clinician and generation timestamp.
- Tests for mapping and approval gating.

Acceptance:

- FHIR export is blocked for draft or rejected output.
- Generated FHIR artifacts validate against the project's schema expectations.

## 10. Phase 6 - Web Clinical Workspace

Deliverables:

- Next.js app shell and authenticated routing.
- Encounter capture workflow for audio, vitals, files, ultrasound media, and notes.
- Preflight results UI.
- Clinician review UI for ANC note, missing questions, risk synthesis, and referral summary.
- Approve, edit, and reject flows.

Acceptance:

- Clinician can complete the core ANC workflow end to end against API.
- UI clearly separates deterministic rule hits from AI-generated text.

## 11. Phase 7 - Admin, Audit, and RBAC UI

Deliverables:

- User management.
- Role and permission management.
- Audit log viewer.
- System configuration view for clinical thresholds and provider status where applicable.

Acceptance:

- Admin can manage users and roles.
- Auditor can inspect logs without clinical mutation privileges.
- Unauthorized users cannot access protected surfaces.

## 12. Phase 8 - E2E and Clinical Safety Hardening

Deliverables:

- Playwright E2E harness.
- Clinician ANC scenario.
- Admin RBAC scenario.
- Unauthorized access scenario.
- AI failure and missing-field scenarios.

Acceptance:

- E2E tests cover the required product acceptance criteria.
- Backend Vitest covers rules, RBAC, FHIR, audit, and approval gates.

## 13. Phase 9 - Production Deployment

Deliverables:

- Dockerfiles for API and web.
- `deploy/compose/docker-compose.remote.yml`.
- Caddyfile.
- Runtime env example.
- Remote preflight, deploy, rollback, smoke-check, and readiness assertion scripts.
- GitHub Actions CI, security scans, and production deploy workflow.

Acceptance:

- Compose config validates with example env.
- Hosted images build.
- Production deploy can roll back after failed validation.

## 14. Phase 10 - Release Readiness

Deliverables:

- Backup and restore runbook.
- Operational monitoring baseline.
- Security review.
- Clinical acceptance checklist.
- Final session handoff.

Acceptance:

- Release checklist is complete.
- Known deferred decisions are documented.
- No high-risk clinical safety gaps remain untracked.
