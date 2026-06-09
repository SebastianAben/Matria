# Matria Session Handoff - 2026-06-09

## Summary

Phase 1 initial implementation is complete. The repository now has a TypeScript npm workspace scaffold with Express API, Next.js web app, Playwright E2E harness, shared Zod contracts, and synthetic ANC fixtures.

## Implemented

- Root workspace scripts for `format:check`, `lint`, `typecheck`, `test`, `build`, and `e2e`.
- Shared TypeScript base config, ESLint flat config, Prettier config, and ignore files.
- `packages/contracts` with API response schemas and core domain schemas for patients, pregnancy episodes, encounters, observations, deterministic rule results, generated outputs, approvals, FHIR exports, audit logs, RBAC role names, and permission actions.
- `packages/test-fixtures` with synthetic ANC patient, active pregnancy episode, urgent encounter, and severe hypertension rule hit.
- `apps/api` with Express 5, Helmet, CORS, request IDs, `/health`, `/ready`, and Vitest/Supertest coverage.
- `apps/web` with Next.js App Router clinical workspace shell.
- `apps/e2e` with Playwright config that starts API and web dev servers and verifies the shell plus API health.

## Verification

Passed locally:

- `npm run format:check`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run e2e`

Notes:

- `npm install` reported 2 moderate vulnerabilities. Do not run `npm audit fix --force` without reviewing breaking changes.
- Next.js build reports a warning that the Next ESLint plugin is not configured. This is not blocking but should be considered in a future frontend tooling pass.
- Playwright dev run reports a future Next.js `allowedDevOrigins` warning for `127.0.0.1`; not blocking for current harness.

## Next Recommended Work

Start Phase 2 backend foundation:

1. Add structured logger and error handler.
2. Add PostgreSQL client and migration system.
3. Add pgvector migration.
4. Make `/ready` check database and migration status.
5. Add authentication/session foundation.
6. Add RBAC middleware and audit event writer with tests.

## Later Update - Phase 2 Backend/API Section

Implemented locally on branch `codex/phase2-backend-api-foundation`. Push has not been performed and requires explicit user confirmation.

Completed:

- Structured logger setup with request context propagation.
- Centralized 404 and error response handling.
- PostgreSQL pool creation and migration runner.
- Initial pgvector and RBAC/audit foundation migrations.
- `/ready` now checks database connectivity, migration state, pgvector availability, and contracts.
- Bootstrap admin login/session routes under `/auth`.
- RBAC middleware and protected `/audit-logs` route.
- In-memory and database-backed audit writer implementations.

Verification passed:

- `npm run format:check`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run e2e`

## Later Update - Phase 3 Clinical Domain Foundation

Implemented locally after Phase 2 foundation.

Completed:

- Shared contracts for coded structured observations, clinical preflight prompts, and uncertainty annotations.
- Authenticated clinical API routes under `/clinical` for patients, pregnancy episodes, encounters, observations, and preflight.
- In-memory clinical store with patient and pregnancy episode scoping enforcement.
- Deterministic maternal rules engine for severe hypertension and preeclampsia symptom cluster.
- Mandatory ANC preflight prompts for systolic BP, diastolic BP, and gestational age before AI synthesis.
- Synthetic fixture observation sets for normal ANC, missing-field ANC, and severe-hypertension ANC.
- PostgreSQL migration `0003` for clinical domain foundation tables.

Verification passed:

- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run format:check`
- `npm run build`
- `npm run e2e`

Notes:

- `npm run build` and `npm run e2e` should be run serially because both use `apps/web/.next`.
- `npm install` still reports 2 moderate vulnerabilities; no forced audit fix was applied.

## Later Update - Phase 4 AI Orchestration and Review Lifecycle

Implemented locally after Phase 3 foundation.

Completed:

- Shared contracts for generated output request/response schemas, review requests, and patient memory entries.
- Authenticated AI API routes under `/ai` for encounter synthesis, output listing, editing, approval, rejection, and scoped patient memory retrieval.
- Gemini synthesis and MedGemma evidence adapter boundaries with deterministic local implementations.
- Synthesis preflight gating that blocks unresolved required prompts before provider calls.
- Tool-call and provider audit records, including provider failure records.
- Output validation that requires hard deterministic rule hits to be preserved and carries uncertainty notes forward.
- Approval-gated patient memory writes scoped by patient and pregnancy episode.
- PostgreSQL migration `0004` for generated output, clinical approval, and patient memory tables.

Verification passed:

- `npm run format:check`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run e2e`

Notes:

- Gemini and MedGemma are adapter boundaries only; real provider credentials, prompt governance, and provider clients remain pending.
- `npm run build` and `npm run e2e` should still be run serially because both use `apps/web/.next`.

## Later Update - Phase 5 FHIR Export Foundation

Implemented locally after Phase 4 foundation.

Completed:

- Shared FHIR export contract now records approving clinician provenance.
- Authenticated FHIR export route added at `POST /fhir/outputs/:outputId/export`.
- Export is blocked unless the generated output is approved and has approval provenance.
- FHIR R4-style document Bundle formatter added with Composition, Patient, Encounter, DocumentReference, and Provenance resources.
- In-memory FHIR export artifact store added for local foundation work.
- PostgreSQL migration `0005` added for FHIR export artifact persistence.
- Vitest coverage added for draft/rejected export blocking and approved Bundle/provenance export.

Verification passed after the Phase 5 changes:

- `npm run format:check`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run e2e`

Notes:

- `npm test` initially exposed an outdated readiness fixture that only listed migrations `0001`-`0004`; the fixture was updated for `0005` and the full quality gates passed afterward.
- Next.js still reports the existing ESLint plugin warning during build and `allowedDevOrigins` warning during E2E.

## Later Update - Phase 6 Web Clinical Workspace

Implemented locally after Phase 5 foundation.

Completed:

- Replaced the minimal web shell with an API-backed clinical workspace on `/` and `/clinical`.
- Added a browser API client for bootstrap login, clinical encounter capture, preflight, synthesis, output edit/review, approval/rejection, and FHIR export.
- Added synthetic ANC capture data aligned with the deterministic rules engine (`systolic_bp`, `diastolic_bp`, `gestational_age_weeks`, and preeclampsia symptom codes).
- Added UI sections for authenticated session context, encounter capture surfaces, deterministic preflight results, generated draft review, approval gates, and FHIR artifact status.
- Enabled local browser-to-API cookie auth by configuring CORS credentials for local web origins.
- Updated Playwright E2E to run the core ANC workflow from capture through FHIR export.

Verification passed after the Phase 6 changes:

- `npm run format:check`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run e2e`

Notes:

- The workspace still uses bootstrap credentials and in-memory API stores for local foundation work.
- Real file upload persistence, durable frontend auth, and production origin configuration remain pending.
- Next.js still reports the existing `allowedDevOrigins` dev warning during E2E.

## Later Update - Phase 7 Admin, Audit, and RBAC UI

Implemented locally after Phase 6 foundation.

Completed:

- Shared contracts for admin users, roles, permissions, user creation/update, role assignment, permission assignment, and audit log list responses.
- Migration `0006` for `users`, `user_roles`, `role_permissions`, seeded role records, seeded permission records, and default role-permission mappings.
- Admin API routes under `/admin` for users, roles, permissions, and audit logs.
- Database-backed admin store for user credential lookup and effective permissions, with in-memory fallback for local/test runs without `DATABASE_URL`.
- Session login now resolves active users through the admin store; disabled users cannot log in.
- Admin mutation and audit-read events are recorded through the audit writer.
- Web `/admin` route with Users, Roles, and Audit views, permission-aware protected states, create-user flow, role assignment, enable/disable actions, and role permission toggles.
- Clinical workspace now exposes an admin link for users with `user:admin` or `audit:read`.
- Playwright E2E now covers the admin user creation, auditor role assignment, and audit viewer flow.

Verification passed after the Phase 7 changes:

- `npm run format:check`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run e2e`

Notes:

- Durable session-token persistence remains pending; current session tokens are still process-local.
- Clinical, AI output, memory, and FHIR repositories still use in-memory fallbacks when no database is configured.
- Next.js still reports the existing ESLint plugin warning during build and `allowedDevOrigins` dev warning during E2E.

## Later Update - Phase 8 E2E and Clinical Safety Hardening

Implemented locally after Phase 7 foundation.

Completed:

- Split Playwright coverage into five focused Phase 8 scenarios: clinician capture-to-FHIR, admin RBAC/audit, unauthorized protected API access, missing-field ANC preflight blocking, and AI provider failure.
- Added deterministic API-level E2E setup helpers for complete and incomplete ANC encounters.
- Added a test-only synthesis failure control through `x-matria-test-provider-failure`, enabled only when the API is created with `APP_ENV=test`.
- Updated Playwright web server config to start API in `APP_ENV=test` and avoid reusing stale local dev servers.
- Added backend safety gate coverage for protected-route authentication, route-specific RBAC forbids, provider failure audit events, approval-gated memory writes, rejected-output memory blocking, and no-output/no-memory behavior after provider failure.

Verification passed after the Phase 8 changes:

- `npm -w apps/api test -- ai-routes.test.ts clinical-safety-gates.test.ts`
- `npm -w apps/e2e run typecheck`
- `npm run format:check`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run e2e`

Notes:

- Playwright now requires ports `3000` and `4000` to be free so it can start the correct test-mode servers.
