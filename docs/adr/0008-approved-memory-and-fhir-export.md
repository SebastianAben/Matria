# ADR 0008: Approved Memory Writeback And FHIR Export

Status: Accepted  
Date: 2026-06-22

## Context

Phase 8 introduced generated-output review persistence for approve, edit, reject, and uncertainty decisions. Phase 9 needed to consume that review state to create durable patient memory and export-ready referral or teleconsult FHIR artifacts without weakening Matria's clinical safety posture.

Matria must remain decision support only. AI output, medical evidence, durable memory, and FHIR artifacts must not become durable clinical truth unless an authorized clinician approved or edited the generated output first.

## Decision

Phase 9 uses approved or clinician-edited `GeneratedOutput.canonicalContent` as the only source for memory writeback and FHIR export.

- `PatientMemoryFact` now has a `dedupeKey` and a unique patient/pregnancy/dedupe constraint.
- `FhirExport` persists export kind, status, source output, FHIR bundle JSON, source manifest, provenance, generator, and timestamps.
- Memory writeback accepts explicit approved source output IDs or all approved/edited outputs for the encounter.
- FHIR export accepts referral or teleconsult export kind and uses an approved/edited matching summary.
- Rejected, uncertain, review-required, draft, and stale generated outputs are never written to memory or exported.
- FHIR export requires `fhir:export` permission, `fhir_export` consent, gestational context, and no active critical acknowledgement-required rule results.
- Local Docker Compose now runs Postgres, API, and web in mock-provider mode for full local inspection.

## Rationale

Reusing Phase 8 review state keeps clinician authority in one place and prevents a second approval model from drifting. Storing memory as curated, deduplicated facts improves future context retrieval without writing whole draft artifacts as noisy longitudinal memory. Persisting FHIR bundles as JSON keeps first-release scope export-ready while avoiding live SATUSEHAT or external submission.

The FHIR document-bundle shape follows HL7 FHIR R4 expectations: document bundles use `Bundle.type = document`, the first entry is `Composition`, `ServiceRequest` carries the referral/teleconsult proposal, and `Provenance` records the generation and approval lineage.

## Alternatives Considered

- Write one memory fact per approved output: simpler, but too noisy for future retrieval.
- Require manual memory candidate selection before any writeback: safer, but larger workflow scope than Phase 9.
- Persist only FHIR draft inputs: smaller, but does not satisfy the export-ready artifact requirement.
- Pull production Dockerfiles into Phase 9: rejected to preserve the Phase 10 hosted-runtime boundary.

## Implementation Details

- New migration: `20260622170000_phase9_memory_fhir_export`.
- New routes:
  - `POST /encounters/:encounterId/memory-writeback`
  - `GET /patients/:patientId/pregnancy-episodes/:episodeId/memory-facts`
  - `POST /encounters/:encounterId/fhir-export`
  - `GET /encounters/:encounterId/fhir-exports`
  - `GET /fhir-exports/:exportId`
- Mock Gemini now emits referral, teleconsult, and FHIR draft-input generated outputs for local workflows.
- Review UI closeout actions trigger memory writeback and FHIR export only for backend encounter/query scope and never synthesize local demo memory or FHIR bundles.
- Compose services use mock AI/STT/evidence providers and leave production deployment hardening to Phase 10.

## Consequences

- Future context snapshots can retrieve approved patient memory without leaking across patient or pregnancy episode scope.
- Export artifacts now have clinician approval provenance but remain local/persisted artifacts only.
- External FHIR submission, production image optimization, Caddy, CI, and rollback scripts remain Phase 10 or later.
- Existing DB-backed tests must include `dedupeKey` when manually seeding patient memory.

## Validation

- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- `docker compose config`
- `docker compose up --build -d postgres api web`
- API `/health` and `/ready`
- Web `/review`
- `pnpm --filter @matria/api test`
- `pnpm test`
- `pnpm e2e`

## Risks And Follow-up

- The FHIR bundle is R4-compatible and export-ready, but not profile-constrained for SATUSEHAT.
- Memory extraction is conservative and deterministic, but future UX may need explicit clinician-selected memory candidates.
- Phase 10 should add production Dockerfiles, CI, hosted Compose/Caddy artifacts, smoke checks, and deployment docs.
