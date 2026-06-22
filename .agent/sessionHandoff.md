# Matria Session Handoff

Document status: Active  
Created: 2026-06-22  
Last updated: 2026-06-22  
Purpose: stable handoff for the latest substantive Matria task/session

## Current Objective

Implement Matria through the advisory clinical rule engine and consented ambient transcript workflow, while first validating the existing Docker PostgreSQL, Prisma, auth/RBAC/audit, and ANC encounter foundation.

## Current Phase

- Phase: 6 - Stateful Context Engineering And Gemini Orchestrator
- Subphase: 6.1 - Vertex AI runtime config
- Status: `in_progress`

## Files Changed This Session

- Root/runtime: `.env.example`, `eslint.config.mjs`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`
- API package: `apps/api/package.json`, `apps/api/.env.example`, `apps/api/vitest.config.ts`
- API schema/migrations: `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/20260622034721_rules_ambient/`, `apps/api/prisma/migrations/migration_lock.toml`
- API rules: `apps/api/src/rules/`
- API ambient: `apps/api/src/ambient/`
- API integration: `apps/api/src/app.ts`, `apps/api/src/config/env.ts`, `apps/api/src/auth/permissions.ts`, `apps/api/src/admin/routes.ts`, `apps/api/src/tests/`
- Shared contracts: `packages/shared/src/index.ts`
- Web UI: `apps/web/app/patients/page.tsx`, `apps/web/app/globals.css`
- Agent docs: `.agent/implementationPhases.md`, `.agent/sessionHandoff.md`
- ADRs: `docs/adr/0003-advisory-rules-and-ambient-transcript-boundary.md`

## Completed Work

- Restored the working Matria git checkout back to `/Users/khalfanishaquille/Documents/GitHub/Matria` from the intact iCloud archive path.
- Validated Docker PostgreSQL/pgvector by starting the Compose database, applying migrations, seeding roles/admin, and running the DB-backed API suite.
- Fixed local Prisma and seed scripts so they default to the Docker database URL when `DATABASE_URL` is unset.
- Made API Vitest file execution serial to prevent shared Docker database reset/seed deadlocks.
- Added rule shared contracts, rule permissions, Prisma `RuleEvaluationRun` and `RuleResult` models, and a SQL migration.
- Implemented versioned JSON rule definitions and typed deterministic evaluators for severe hypertension, bleeding, reduced fetal movement, anemia, fever/infection, abnormal urine, missing gestational age, gestational-age inconsistency, and basic session-note contradictions.
- Added rule preflight, rule result listing, and acknowledgement APIs with RBAC and audit events.
- Added the deterministic rules panel in the ANC encounter UI, separate from manual notes and ambient transcript data.
- Added ambient session shared contracts, Prisma models for ambient sessions, audio segments, transcript turns, and unverified transcript clinical candidates.
- Implemented ambient session create/start/stop/read APIs, audio event ingestion, transcript list/create/correction APIs, consent enforcement, audit events, and degraded STT failure handling.
- Added a mock STT provider for local/tests and a configuration-gated Google Cloud Speech-to-Text adapter using native diarization config.
- Added diarization mapping from word-level speaker tags into two-person transcript turns.
- Added deterministic transcript candidate extraction for symptoms, danger signs, medication, history, gestational age, clinician plan, and unresolved questions.
- Extended the ANC encounter frontend with ambient controls, mock transcript input, transcript list, and correction forms using clinical UI constraints from the provided frontend taste skills.

## Decisions Made

- Rule definitions are reviewable JSON, but rule execution remains in typed deterministic evaluators.
- Rule engine posture is advisory-first: missing gestational age is `soft`, severe BP is `ack_required`, and global hard blocks remain reserved for consent, scope, authorization, unsafe export/memory write, and critical acknowledgement cases.
- Rule thresholds are implementation placeholders and marked for local guideline validation where relevant.
- Real Google STT is configuration-gated with `STT_PROVIDER=google`; local development and tests use `STT_PROVIDER=mock`.
- Phase 5 stores source audio metadata and transcript text but does not implement browser microphone streaming or long-term raw audio retention policy yet.
- Transcript clinical candidates remain unverified evidence and do not become structured observations without clinician action.
- Frontend Phase 4/5 additions are functional clinical panels, not the full Phase 8 ambient workspace.

## Blockers And Open Questions

- No active implementation blockers.
- Local clinical threshold validation is still required before production use of the initial advisory rules.
- Browser microphone streaming, raw audio storage policy, and multilingual Gemini post-STT diarization remain deferred.
- Phase 6 must decide the persisted `ContextSnapshot` shape and Gemini JSON patch contracts before introducing synthesis.

## Next Recommended Action

Begin Phase 6 by implementing:

1. Vertex AI Gemini adapter configuration using `GEMINI_PROVIDER=vertex_ai`, `GOOGLE_CLOUD_PROJECT`, and `GOOGLE_CLOUD_LOCATION=global`.
2. `ContextSnapshot` persistence and a context builder that includes patient profile, pregnancy episode, encounter, session note, structured observations, rule results, ambient transcript turns, transcript candidates, prior artifacts, and clinician edits.
3. Validated Gemini JSON patch schemas for progressive summary, highlights, suggestions, missing questions, and note/referral drafts.

## Tests And Checks Run

- `pnpm db:up` passed.
- `pnpm --filter @matria/api prisma:migrate` passed.
- `pnpm --filter @matria/api seed` passed.
- `pnpm --filter @matria/api prisma:generate` passed.
- `pnpm --filter @matria/api test` passed.
- `pnpm typecheck` passed.
- `pnpm test` passed.
- `pnpm format` ran and updated formatting.
- `pnpm format:check` passed.
- `pnpm build` passed.
- `pnpm lint` passed after ignoring generated `**/dist/**`.
- `pnpm e2e` passed.
