# ADR 0007: Reference Image Frontend And Approval Pull-forward

Status: Accepted
Date: 2026-06-22

## Context

Phase 8 needed to replace the compact clinical demo UI with the actual clinician-facing workspace. The user supplied six reference images and explicitly instructed the implementation to inspect each image, copy the design language closely, and remove only components that contradicted the PRD.

The user also decided that generated-output approve, edit, reject, and mark-uncertain persistence should be implemented during Phase 8 instead of waiting for Phase 9. Memory writeback and FHIR export remain deferred.

## Decision

Implement Phase 8 from the six supplied reference images:

- `PatientSearchAndRegistration.png` maps to `/patients`
- `ClinicalWorkspace-EncounterSetup.png` maps to `/workspace/setup`
- `ClinicalWorkspace-LiveEncounter.png` maps to `/workspace`
- `ClinicalWorkspace-Review.png` maps to `/review`
- `AdminRoleManagement.png` maps to `/admin`
- `ClinicalWorkspace-Audit.png` maps to `/audit`

Build a shared clinical shell, reusable clinical panels, compact tables, badges, form controls, patient context surfaces, status states, and responsive behavior. Use realistic demo fixtures when no live API/database context is selected, while preserving live API actions where relevant.

Pull forward generated-output review persistence into Phase 8:

- `GeneratedOutput`
- `ClinicalApproval`
- generated-output status/action shared schemas
- approve, edit, reject, and mark-uncertain routes
- audit logging for review decisions
- context snapshot inclusion of generated output review status
- rejected-output retention for audit and future exclusion by Phase 9 consumers

Do not implement durable memory writeback, final referral/teleconsult export, FHIR generation, FHIR provenance, or live SATUSEHAT/external submission in Phase 8.

## Rationale

The supplied images provide a stronger implementation target than a generic dashboard design. Matching them gives Matria the dense, clinical, repeated-use workflow needed for patient search, encounter setup, live ambient work, review, administration, and audit.

Approval persistence needed to move earlier because the review page is one of the six critical reference screens and would otherwise show clinically important controls that did not actually persist. Pulling forward generated-output review actions preserves clinician authority and creates the foundation Phase 9 needs for approved-source-only memory and export work.

Keeping memory and FHIR deferred prevents Phase 8 from overclaiming final clinical record, referral, or interoperability behavior.

## Consequences

Positive consequences:

- The six critical frontend pages now share one coherent clinical workspace system.
- Demo pages render without a running database, supporting design review and Playwright smoke tests.
- Generated-output review decisions are durable and audit-visible.
- Phase 9 can consume approved or clinician-edited outputs instead of inventing approval state later.
- Rejected generated outputs are retained for audit and can be excluded by future memory/export consumers.

Tradeoffs:

- Phase 8 now includes backend schema and API scope that originally belonged to Phase 9.
- Demo fallback data must stay clearly separate from live clinical data.
- Phase 9 must respect the review status model already introduced here instead of creating a parallel approval system.

## Validation

Completed checks:

- `pnpm --filter @matria/api prisma:generate`
- `pnpm --filter @matria/api typecheck`
- `pnpm --filter @matria/web typecheck`
- `pnpm --filter @matria/e2e typecheck`
- `pnpm --filter @matria/web build`
- `pnpm lint`
- `pnpm e2e`
- Playwright screenshots for all six Phase 8 pages at desktop and tablet sizes under `.agent/phase8-screenshots/`

Blocked runtime check:

- DB-backed API tests could not run because PostgreSQL was unavailable at `localhost:54329`.

## Follow-up Work

1. Run the API test suite after starting the local PostgreSQL test database.
2. Implement Phase 9 durable memory writeback from approved or clinician-edited generated outputs.
3. Implement referral/teleconsult finalization and FHIR R4 generation from approved content only.
4. Add Phase 9 tests proving rejected outputs are excluded from memory and export.
