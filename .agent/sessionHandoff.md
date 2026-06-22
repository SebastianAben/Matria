# Matria Session Handoff

Document status: Active  
Created: 2026-06-22  
Last updated: 2026-06-22  
Purpose: stable handoff for the latest substantive Matria task/session

## Current Objective

Implement Matria through Phase 7: provider-routed medical evidence analysis, clinical file upload/storage, frame sampling, evidence handoffs, review-required evidence persistence, context re-entry, and compact frontend evidence visibility.

## Current Phase

- Phase: 8 - Clinical Workspace Frontend
- Subphase: 8.1 - Patient and encounter navigation
- Status: `not_started`

## Files Changed This Session

- Root/runtime: `.env.example`, `.gitignore`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`
- API package/config: `apps/api/package.json`, `apps/api/.env.example`, `apps/api/src/config/env.ts`
- API schema/migration: `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/20260622110000_phase7_medical_evidence/`
- API evidence implementation: `apps/api/src/evidence/`
- API integration/context: `apps/api/src/app.ts`, `apps/api/src/clinical/routes.ts`, `apps/api/src/ai/context-builder.ts`, `apps/api/src/ai/orchestrator.ts`
- API tests: `apps/api/src/tests/evidence.test.ts`, `apps/api/src/tests/test-utils.ts`
- Shared contracts: `packages/shared/src/index.ts`
- Web UI: `apps/web/lib/api.ts`, `apps/web/app/patients/page.tsx`
- Agent docs: `.agent/PRD.md`, `.agent/implementationPhases.md`, `.agent/sessionHandoff.md`
- ADRs: `docs/adr/0005-medical-evidence-provider-and-file-storage.md`

## Completed Work

- Added provider-routed medical evidence configuration:
  - `MEDICAL_EVIDENCE_PROVIDER=mock | gemini_flash | ollama_medgemma`
  - tests/scripts default to `mock`
  - local/hosted default to `gemini_flash`
  - Ollama MedGemma 1.5 4B is local opt-in with `OLLAMA_BASE_URL` and `OLLAMA_MEDGEMMA_MODEL=medgemma1.5:4b`
- Added local clinical file storage with safe storage keys, SHA-256 checksums, MIME/size validation, and `.local-data/` ignored by git.
- Added multipart upload, file listing, and secure download routes.
- Added evidence frame sample, handoff, handoff-file, handoff-frame, and finding persistence models.
- Added image frame sampling through `sharp`; uploaded video files are sampled through bundled FFmpeg.
- Added `MedicalEvidenceProvider` adapters for deterministic mock, Gemini 3.5 Flash, and Ollama MedGemma-compatible local vision calls.
- Added handoff creation/run/list APIs and provider call audit via `AiToolCall` plus audit log events.
- Connected Gemini `medgemma_handoff_request` artifacts to executable evidence handoff rows.
- Extended context snapshots with frame samples and review-required medical evidence findings.
- Added compact frontend controls for file upload, frame sampling, handoff creation, provider run, findings, uncertainty, and degraded states.
- Updated PRD/provider policy, phase roadmap, and ADR documentation.

## Decisions Made

- Gemini 3.1 Pro remains the primary session orchestrator from Phase 6.
- Gemini 3.5 Flash is the default Phase 7 medical evidence provider for local and hosted runtime.
- Ollama MedGemma 1.5 4B is supported only as an explicit local development option.
- Automated tests and scripts never call live models; they use the mock evidence provider.
- Phase 7 evidence remains review-required and is not written to `StructuredObservation`, `PatientMemoryFact`, FHIR, or approvals.
- Local filesystem storage is acceptable for Phase 7 and can map to a VM volume later; production object storage remains deferred.
- Dedicated production OCR remains deferred; document extraction is represented as a medical evidence task type.

## Blockers And Open Questions

- No active implementation blockers.
- Hosted Gemini Flash evidence credentials, quotas, and provider terms still need deployment-time validation.
- Production object storage and retention policy remain Phase 10/deployment work.
- Video sampling uses bundled FFmpeg for uploaded video files; invalid or undecodable videos record degraded evidence samples without blocking manual workflow.
- Clinical quality and prompts for Gemini Flash/MedGemma evidence need clinician validation before production use.

## Next Recommended Action

Begin Phase 8 by turning the compact patient page into the full clinical workspace:

1. Strengthen patient/encounter navigation and workspace layout.
2. Split transcript, session note, deterministic rules, Gemini drafts, evidence, and approvals into scannable panels.
3. Add artifact history and approval/rejection workflows in coordination with Phase 9 boundaries.

## Tests And Checks Run

- `pnpm --filter @matria/api prisma:generate` passed.
- `pnpm --filter @matria/api typecheck` passed.
- `pnpm --filter @matria/web typecheck` passed.
- `pnpm db:up` passed.
- `pnpm --filter @matria/api prisma:migrate` passed.
- `pnpm --filter @matria/api test` passed.
