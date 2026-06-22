# ADR 0005: Medical Evidence Provider And File Storage

Status: Accepted  
Date: 2026-06-22

## Context

Matria needed Phase 7 support for clinical files, media frame sampling, document/image evidence extraction, and MedGemma-style handoffs while preserving the clinical safety rule that evidence-provider output is never an approved fact by itself.

The original roadmap named MedGemma as the evidence tool. The implementation decision for Phase 7 changed the runtime policy: tests and scripted validation must never call live models; local and hosted deployments should default to Gemini 3.5 Flash for evidence analysis; local developers may explicitly opt into Ollama-hosted MedGemma 1.5 4B.

Phase 7 also needed actual uploaded bytes instead of metadata-only `ClinicalFile` rows, but production object storage is not ready until hosted runtime work.

## Decision

Matria now implements a provider-routed medical evidence boundary:

1. `MEDICAL_EVIDENCE_PROVIDER=mock | gemini_flash | ollama_medgemma`.
2. Tests/scripts default to `mock`.
3. Local and hosted runtime default to `gemini_flash` with `MEDICAL_EVIDENCE_MODEL=gemini-3.5-flash`.
4. Local MedGemma is opt-in through Ollama using `OLLAMA_BASE_URL` and `OLLAMA_MEDGEMMA_MODEL=medgemma1.5:4b`.
5. Clinical file bytes are stored through a local filesystem storage abstraction under `.local-data/clinical-files` for Phase 7.
6. Uploaded files store safe storage keys, storage URIs, MIME type, size, SHA-256 checksum, and metadata, but raw bytes are not logged.
7. Frame samples, handoffs, and findings are persisted separately from approved clinical facts.
8. Gemini `medgemma_handoff_request` draft artifacts create executable evidence handoff rows, but provider execution remains explicit and auditable.

## Rationale

Provider routing lets Matria support the user's requested Gemini Flash default without deleting the MedGemma path required by the PRD. The mock provider keeps CI and tests deterministic and credential-free.

Local filesystem storage is sufficient for the current single-repo development phase and keeps production object storage decisions out of Phase 7. The abstraction and storage metadata allow a later backend to replace local files with a VM volume or object storage without changing clinical evidence contracts.

Persisting evidence separately from `StructuredObservation`, `PatientMemoryFact`, approvals, and FHIR prevents unreviewed model output from becoming durable clinical truth.

## Alternatives Considered

- MedGemma-only evidence provider: rejected because the requested runtime policy requires Gemini Flash as the local/hosted default.
- Gemini Flash-only provider: rejected because local Ollama MedGemma remains useful for development and aligns with the PRD's MedGemma evidence concept.
- Metadata-only clinical files: rejected because evidence analysis, frame sampling, and provider calls need actual stored file bytes.
- Production object storage now: deferred because hosted runtime and deployment storage policy are Phase 10 concerns.
- Writing extracted values directly to structured observations: rejected because evidence requires clinician review before becoming an approved fact.

## Implementation Details

- Shared contracts now define evidence providers, storage provider, evidence task types, processing statuses, handoff creation, frame sampling, extracted values, and review-required findings.
- Prisma now stores extended `ClinicalFile` storage fields plus `MedicalEvidenceFrameSample`, `MedicalEvidenceHandoff`, handoff link tables, and `MedicalEvidenceFinding`.
- The API exposes multipart upload, file listing/download, frame sampling, handoff creation/run, and evidence listing endpoints.
- Image sampling uses `sharp`; uploaded video file sampling uses bundled FFmpeg and records degraded evidence only when extraction fails.
- Provider calls write `AiToolCall` rows and audit events for success/failure.
- Context snapshots include clinical files, media frame samples, and medical evidence findings.
- The frontend patient page includes compact upload, sampling, handoff, run, and findings controls until the full Phase 8 workspace is built.

## Consequences

- Phase 7 is usable in tests and local development without live model credentials when `MEDICAL_EVIDENCE_PROVIDER=mock`.
- Local and hosted Gemini Flash evidence mode requires Google Cloud project configuration.
- Ollama MedGemma calls require a local Ollama server and the `medgemma1.5:4b` model installed.
- Video frame extraction depends on the bundled FFmpeg binary or an operator-supplied `FFMPEG_PATH`; invalid videos degrade safely.
- Evidence outputs are queryable and context-visible but remain review-required.

## Validation

- `pnpm --filter @matria/api prisma:generate`
- `pnpm --filter @matria/api typecheck`
- `pnpm --filter @matria/web typecheck`
- `pnpm --filter @matria/api prisma:migrate`
- `pnpm --filter @matria/api test`

## Risks And Follow-up

- Gemini Flash and MedGemma evidence quality require clinician validation before production use.
- Production object storage, malware scanning, retention policy, and backup behavior remain future deployment work.
- A worker/queue may be needed if evidence provider latency grows.
- Dedicated OCR/document extraction may be added later if Gemini Flash or MedGemma evidence extraction is insufficient.
