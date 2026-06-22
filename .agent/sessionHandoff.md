# Matria Session Handoff

Document status: Active  
Created: 2026-06-22  
Last updated: 2026-06-22  
Purpose: stable handoff for the latest substantive Matria task/session

## Current Objective

Phase 9 implementation is complete: approved generated outputs can now be written to durable patient memory, approved referral or teleconsult summaries can generate export-ready FHIR R4 document bundles, and the local app runs through Docker Compose with Postgres, API, and web services.

## Current Phase

- Phase: 10 - CI And Hosted Runtime Preparation
- Subphase: 10.1 - CI workflow
- Status: Phase 9 implemented, verified, and running locally through Docker Compose

## Files Changed This Session

- Backend schema/migration: `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/20260622170000_phase9_memory_fhir_export/migration.sql`
- Backend routes/services: `apps/api/src/app.ts`, `apps/api/src/outputs/phase9-routes.ts`, `apps/api/src/ai/gemini-provider.ts`, `apps/api/src/clinical/routes.ts`, `apps/api/src/evidence/routes.ts`
- Shared contracts: `packages/shared/src/index.ts`
- Tests: `apps/api/src/tests/phase9-memory-fhir.test.ts`, `apps/api/src/tests/test-utils.ts`, `apps/api/src/tests/ai.test.ts`
- Frontend: `apps/web/app/review/page.tsx`, `apps/web/app/globals.css`
- Local runtime: `docker-compose.yml`, `Dockerfile.dev`, `.dockerignore`
- Docs: `.agent/implementationPhases.md`, `.agent/sessionHandoff.md`, `docs/adr/0008-approved-memory-and-fhir-export.md`

## Completed Work

- Added `FhirExportKind`, `FhirExportStatus`, `FhirExport`, and `PatientMemoryFact.dedupeKey`.
- Added memory writeback from approved or edited `GeneratedOutput.canonicalContent` only.
- Added memory deduplication by patient, pregnancy episode, and normalized content hash.
- Added FHIR export routes for referral and teleconsult summaries.
- Generated persisted FHIR R4 document bundles with `Composition` first, Patient, Encounter, Practitioner, Observation, ServiceRequest, and Provenance resources.
- Enforced FHIR export gates for `fhir:export` permission, `fhir_export` consent, gestational context, source-output approval, source scope, and critical acknowledgement-required rules.
- Added top-level workspace-state aggregates expected by the frontend support contract.
- Fixed medical evidence handoff response ordering so provider runs return the updated handoff instead of the generated-output sync result.
- Expanded mock Gemini synthesis to produce referral summary, teleconsult summary, and FHIR draft-input generated outputs.
- Added review-page controls for memory writeback, referral FHIR export, teleconsult FHIR export, and export JSON preview.
- Added dev Docker Compose services for Postgres, API, and web using mock providers.

## Decisions Made

- Phase 9 consumes Phase 8 generated-output review state rather than creating a parallel approval system.
- Only `approved` and `edited` generated outputs can feed memory or FHIR export.
- Rejected, uncertain, review-required, draft, and stale outputs remain audit-visible but are excluded from memory and export.
- FHIR export is export-ready only; no SATUSEHAT or external FHIR submission is implemented.
- Local Compose app runtime is intentionally dev-oriented and separate from future Phase 10 production Dockerfiles.

## Blockers And Open Questions

- No product blockers are open.
- Production Dockerfiles, hosted Caddy config, CI, and deployment scripts remain Phase 10.

## Next Recommended Action

Begin Phase 10:

1. Add CI for install, format, lint, typecheck, tests, build, E2E, and Compose config/build checks.
2. Add production Dockerfiles and hosted Compose/Caddy runtime artifacts.
3. Recreate deployment/environment docs only when hosted runtime work begins.

## Tests And Checks Run

- `pnpm --filter @matria/api prisma:generate`
- `pnpm --filter @matria/api typecheck`
- `pnpm --filter @matria/web typecheck`
- `pnpm --filter @matria/shared typecheck`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- `docker compose config`
- `docker compose up --build -d postgres api web`
- `curl http://localhost:4000/health`
- `curl http://localhost:4000/ready`
- `curl -I http://localhost:3000/review`
- `pnpm --filter @matria/api test`
- `pnpm test`
- `pnpm e2e`

## Runtime State

- Docker Compose is intentionally still running for user inspection.
- Web: `http://localhost:3000`
- API: `http://localhost:4000`
- Postgres: `localhost:54329`
