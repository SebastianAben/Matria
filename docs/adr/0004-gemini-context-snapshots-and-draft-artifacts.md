# ADR 0004: Gemini Context Snapshots And Draft Artifacts

Status: Accepted  
Date: 2026-06-22  
Decision owners: Matria project owner and Codex agents  
Related sources: `.agent/PRD.md`, `.agent/implementationPhases.md`, `.agent/sessionHandoff.md`

## Context

Matria's Phase 6 work needed to turn the completed advisory rule and ambient transcript foundation into a stateful AI orchestration layer. The PRD requires Gemini to operate over versioned context snapshots, return validated JSON patches, preserve deterministic rule hits and uncertainty, and keep clinicians in control of all generated outputs.

The implementation also needed a local/test-safe provider boundary. Production Gemini calls must use Vertex AI / Gemini Enterprise Agent Platform with `GOOGLE_CLOUD_LOCATION=global`, while local development and automated tests must not require Google credentials or live provider availability.

Phase 6 had to stop before MedGemma execution, output approval, durable memory writeback, and FHIR export. Those later capabilities need the Phase 6 draft artifact and provenance spine, but they must not be accidentally introduced as side effects of synthesis.

## Decision

Matria now implements a stateful Gemini orchestration boundary with:

1. `GEMINI_PROVIDER=mock | vertex_ai`, defaulting to `mock` for local/test.
2. A Vertex AI Gemini adapter using `@google/genai`, `gemini-3.1-pro-preview`, `GOOGLE_CLOUD_PROJECT`, and `GOOGLE_CLOUD_LOCATION=global`.
3. Shared Zod contracts for context snapshot payloads, Gemini UI patches, synthesis responses, summaries, highlights, suggestions, suggestion results, and synthesis tick requests.
4. Persisted AI state: `AiToolCall`, `ContextSnapshot`, `AiArtifactRevision`, `SummaryRevision`, `HighlightCard`, `Suggestion`, `SuggestionResult`, `PatientMemoryFact`, and `SynthesisTick`.
5. A context builder that persists immutable snapshots containing patient, pregnancy episode, encounter, ambient session state, session note, structured observations, transcript turns, transcript candidates, rule results, suggestions and results, prior artifact revisions, clinical file metadata, and scoped patient memory.
6. A synthesis orchestrator that runs advisory preflight first, creates a snapshot, calls Gemini, validates structured JSON patches, writes audit events, persists draft artifact revisions, and projects summaries/highlights/suggestions.
7. A stale-patch guard that compares the snapshot's ambient session state version and session note version against current state before projecting Gemini output.
8. Suggestion resolution and result APIs that make clinician actions available to future context snapshots.

## Rationale

Versioned context snapshots are required for clinical auditability and reproducibility. They make it possible to understand what Gemini saw when it produced a draft, including clinician note edits, corrected transcript turns, rule results, and suggestion state.

The JSON patch contract keeps Gemini from returning unstructured prose where the backend expects typed UI artifacts. Runtime validation plus post-parse safety checks preserve source references, deterministic rule references, uncertainty, and clinician-review requirements.

Persisting both raw artifact revisions and projected summary/highlight/suggestion rows supports two needs at once: an audit trail of model output and efficient UI reads for the current clinical workspace.

Mock-first local behavior prevents cloud credentials from becoming a development or CI dependency. The Vertex adapter remains present and configuration-gated so deployment can switch providers without rewriting orchestration logic.

Patient memory is intentionally read-only in Phase 6. The context builder can retrieve approved scoped facts, but creating durable memory remains Phase 9 because it requires explicit clinician approval semantics.

## Alternatives Considered

- One-shot Gemini summarization without persisted context: rejected because it would not satisfy auditability, stale-write protection, or progressive stateful session requirements.
- Storing Gemini output only as loose JSON: rejected because summaries, highlights, suggestions, and suggestion results need queryable UI and workflow state.
- Calling Vertex AI directly from route handlers: rejected because orchestration needs testable provider boundaries, tool-call audit rows, validation, and failure handling.
- Letting Gemini update active UI rows without artifact revision history: rejected because clinicians need provenance and future sessions need stale-patch protection.
- Implementing memory writeback in Phase 6: rejected because durable memory writes require clinician approval and deduplication, which are Phase 9 responsibilities.
- Executing MedGemma handoffs in Phase 6: deferred to Phase 7. Gemini may emit draft handoff request artifacts, but no media evidence execution occurs yet.

## Implementation Details

Environment behavior:

- `GEMINI_PROVIDER=mock` is the local/test default.
- `GEMINI_PROVIDER=vertex_ai` requires `GOOGLE_CLOUD_PROJECT`.
- `GEMINI_PRIMARY_MODEL` defaults to `gemini-3.1-pro-preview`.
- `GEMINI_DIARIZATION_MODEL` remains `gemini-flash-lite-latest` for the future multilingual diarization boundary.
- `GOOGLE_CLOUD_LOCATION` defaults to `global`.
- `GOOGLE_GENAI_USE_ENTERPRISE=True` is documented in env examples.

New API routes:

- `POST /ambient-sessions/:sessionId/synthesis-ticks`
- `GET /ambient-sessions/:sessionId/artifacts`
- `GET /ambient-sessions/:sessionId/highlights`
- `GET /ambient-sessions/:sessionId/suggestions`
- `PATCH /suggestions/:suggestionId`
- `POST /suggestions/:suggestionId/results`
- `GET /ambient-sessions/:sessionId/context-snapshots`

Enforcement behavior:

- `ai:synthesis` is required for synthesis ticks.
- `suggestion:resolve` is required for suggestion status and result changes.
- `encounter:read` is required for artifact, highlight, suggestion, and snapshot reads.
- AI consent is required before context snapshot creation or Gemini calls.
- Patient and pregnancy episode scope consistency is checked before snapshot persistence.
- Synthesis ticks run advisory preflight and include the latest non-superseded rule results.
- Provider calls, validation failures, stale ticks, completed ticks, and suggestion actions are audited.

Draft artifact behavior:

- Gemini patches are persisted as `AiArtifactRevision` rows.
- Valid non-stale summary patches project to `SummaryRevision`.
- Valid non-stale highlight patches project to `HighlightCard`.
- Valid non-stale suggestion patches project to `Suggestion`.
- Stale patches are retained as stale revisions but are not projected into active UI rows.
- No Phase 6 route approves outputs, writes durable memory, or exports FHIR.

## Consequences

Positive consequences:

- Gemini synthesis now has a durable, auditable context contract.
- Clinician session note edits and transcript corrections are included in subsequent AI context.
- Deterministic rule hits remain visible in Gemini draft artifacts.
- Suggestions can be resolved and their results become future synthesis context.
- AI failures and validation failures do not remove transcript, notes, rules, observations, or prior artifacts.
- Local and CI workflows remain credential-free through the mock provider.

Tradeoffs:

- The first mock provider creates deterministic conservative artifacts rather than modeling full production reasoning.
- Patient memory retrieval is scoped and persisted but not semantically ranked until embeddings are populated and retrieval policy matures.
- Synthesis scheduling prevents duplicate pending/running ticks for the same session version but does not yet include a background worker or queue.
- The compact frontend panel is useful for verification but is not the full Phase 8 clinical ambient workspace.

## Validation

Completed validation:

- `pnpm --filter @matria/api prisma:generate`
- `pnpm --filter @matria/api typecheck`
- `pnpm db:up`
- `pnpm --filter @matria/api prisma:migrate`
- `pnpm --filter @matria/api test`
- `pnpm install`
- `pnpm typecheck`
- `pnpm format`
- `pnpm format:check`
- `pnpm lint`
- `pnpm test`
- `pnpm e2e`
- `pnpm build` after clearing a generated Next.js `.next` cache error for `/_document`

Added tests include:

- Gemini env validation for mock and Vertex AI modes.
- Context snapshot tests covering session note edits, clinician-corrected transcript turns, transcript candidates, suggestions/results, observations, and scoped memory.
- Cross-patient and cross-pregnancy memory non-leakage.
- AI consent and RBAC denial behavior.
- Mock synthesis persistence of summaries, highlights, suggestions, audit events, and suggestion results.
- Stale-patch behavior when clinician context changes after snapshot creation.

## Risks

- Real Vertex AI behavior, IAM, quotas, regional/model availability, and provider terms still require deployment-time validation.
- Output validation is intentionally conservative and may reject some useful model output until production prompts mature.
- Synthesis is synchronous in the API process for Phase 6; a worker/queue may be needed as provider latency grows.
- Clinical quality of Gemini artifacts depends on future prompt tuning and clinician validation.
- Patient memory writeback, approval workflow, and FHIR export remain unimplemented until Phase 9.

## Follow-up Work

1. Begin Phase 7 with real clinical file upload/storage validation, media quality metadata, and frame sampling.
2. Add a MedGemma evidence boundary that consumes context snapshots without converting media evidence into approved facts.
3. Build the full Phase 8 clinical workspace over the persisted summaries, highlights, suggestions, rules, transcript, evidence, and artifact history.
4. Implement Phase 9 approval, memory writeback, referral/teleconsult summaries, and FHIR R4 export from approved content only.
5. Validate Vertex AI Gemini credentials, IAM, quota, and model availability during hosted runtime preparation.
