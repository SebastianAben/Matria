# ADR 0003: Advisory Rules And Ambient Transcript Boundary

Status: Accepted  
Date: 2026-06-22  
Decision owners: Matria project owner and Codex agents  
Related sources: `.agent/PRD.md`, `.agent/implementationPhases.md`, `.agent/sessionHandoff.md`

## Context

Matria needs ambient ANC intelligence, but the next implementation slice had to stop before Gemini synthesis, MedGemma analysis, durable patient memory, approvals, and FHIR export. The user explicitly requested a deeper implementation through the advisory rule engine and ambient session transcript pipeline.

The PRD requires deterministic maternal safety rules to support clinical safety without overblocking LLM performance. The rule engine must surface red flags, missing context, contradictions, and acknowledgement needs, but routine gaps should become suggestions, prompts, or uncertainty markers rather than global hard stops.

The PRD also requires a consented ambient system that passively listens to a two-person consultation, uses Google Cloud Speech-to-Text where configured, performs diarization, persists timestamped transcript turns, allows clinician correction, and stores transcript-derived candidates as unverified evidence for future Gemini context.

## Decision

Matria now implements:

1. A versioned advisory rule engine with JSON rule definitions and typed deterministic evaluators.
2. Persisted `RuleEvaluationRun` and `RuleResult` records with severity, blocking level, evidence, source references, confidence, suggested action, local guideline validation flags, status, and acknowledgement metadata.
3. Rule APIs for preflight, active rule listing, and clinician acknowledgement or resolution.
4. New `rule:evaluate` and `rule:acknowledge` permissions granted to appropriate clinical roles.
5. A deterministic rules panel in the encounter capture UI, visually separated from manual notes and ambient transcript data.
6. An ambient session model with `AmbientSessionState`, `AudioSegment`, `TranscriptTurn`, and `TranscriptClinicalCandidate`.
7. Consent-gated ambient APIs for create, start, stop, audio event ingestion, transcript listing, manual transcript creation, and transcript correction.
8. A `SpeechToTextProvider` interface with a local mock provider and a configuration-gated Google Cloud Speech-to-Text provider.
9. A diarization mapper that converts word-level speaker tags into two-person transcript turns grouped by speaker, punctuation, and time gap.
10. Lightweight transcript candidate extraction for symptoms, danger signs, medication, history, gestational age, clinician plan, and unresolved questions.
11. Frontend ambient controls for consent state visibility, session create/start/stop, mock transcript input, transcript display, and correction workflow.

## Rationale

The rule engine is intentionally advisory-first. Clinical rules are important safety scaffolding, but they should not prevent the LLM from receiving context or prevent clinicians from continuing ordinary documentation. The implemented posture preserves critical visibility without turning every missing field into a blocking error.

JSON rule definitions make rule metadata reviewable, but executable clinical logic remains in typed code. This prevents arbitrary code execution from rule files and keeps condition evaluation testable.

Persisting rule runs and results gives future Gemini context a durable view of deterministic safety evidence. It also supports auditability and lets clinicians acknowledge or resolve active findings explicitly.

The ambient transcript pipeline is designed as a stateful boundary rather than a one-off transcription helper. Transcript turns, corrections, audio segment references, provider state, and unverified candidates are all stored as first-class state so Phase 6 Gemini orchestration can build context snapshots from durable records.

The Google STT adapter is configuration-gated because local development and CI should not require live Google credentials. Mock STT keeps tests deterministic while preserving the production integration boundary.

## Alternatives Considered

- Hard-blocking all missing ANC context before AI synthesis: rejected because it would make the system brittle and could degrade LLM usefulness. Missing gestational age is currently a soft prompt unless a later export or clinical action requires it.
- Storing all rule outputs as loose JSON on the encounter: rejected because rule status, acknowledgement, evidence, and source references need queryable audit-friendly records.
- Executing arbitrary rule conditions from JSON: rejected because clinical rule execution must remain deterministic and type-checked.
- Directly calling Google STT from route code: rejected because provider boundaries are needed for tests, local development, future streaming paths, and failure handling.
- Treating transcript candidate extraction as structured observations: rejected because transcript-derived evidence is unverified and must not become approved clinical fact without clinician action.
- Implementing browser microphone streaming in this slice: deferred because Phase 5 only needed backend ingestion contracts and transcript workflow.
- Calling Gemini for multilingual diarization now: deferred until Phase 6 because Gemini orchestration and context snapshots are not yet implemented.

## Implementation Details

Shared contracts now include:

- Rule severity, blocking level, result status, and action type enums.
- Ambient session status, transcript correction status, speaker role guess, and transcript clinical candidate type enums.
- Validators for rule result updates, ambient session creation, audio events, transcript turn creation, and transcript correction.

Database additions include:

- `RuleEvaluationRun`
- `RuleResult`
- `AmbientSessionState`
- `AudioSegment`
- `TranscriptTurn`
- `TranscriptClinicalCandidate`

Initial rule families include:

- Severe hypertension from structured vitals.
- Bleeding mention from notes or transcript candidates.
- Reduced fetal movement mention.
- Anemia indicator from hemoglobin values.
- Fever/infection indicator.
- Abnormal urine protein or glucose indicator.
- Missing gestational age.
- Gestational age inconsistency.
- Basic session-note contradiction.

Ambient APIs include:

- `POST /encounters/:encounterId/ambient-sessions`
- `GET /ambient-sessions/:sessionId`
- `POST /ambient-sessions/:sessionId/start`
- `POST /ambient-sessions/:sessionId/stop`
- `POST /ambient-sessions/:sessionId/audio-events`
- `GET /ambient-sessions/:sessionId/transcript-turns`
- `POST /ambient-sessions/:sessionId/transcript-turns`
- `PATCH /transcript-turns/:turnId`

Rule APIs include:

- `POST /encounters/:encounterId/preflight`
- `GET /encounters/:encounterId/rule-results`
- `PATCH /rule-results/:ruleResultId`

Environment configuration now includes:

- `STT_PROVIDER=mock | google`
- `GOOGLE_STT_LANGUAGE_CODE=en-US`
- `GOOGLE_STT_MODEL=latest_long`
- `GOOGLE_STT_ENABLE_DIARIZATION=true`
- `GOOGLE_STT_SPEAKER_COUNT=2`

## Consequences

Positive consequences:

- Phase 2 and Phase 3 are now validated against Docker PostgreSQL instead of remaining blocked.
- Clinical rules are visible, auditable, and acknowledgeable without overblocking routine workflow.
- The backend now has a stateful ambient transcript foundation for Phase 6 Gemini context engineering.
- Google STT is available through a clean adapter, while tests remain credential-free.
- Clinician-corrected transcript text and speaker roles are persisted as higher-quality context for future synthesis.
- The frontend exposes rule and ambient transcript state without pretending full AI synthesis exists yet.

Tradeoffs:

- Initial thresholds are placeholders and require local guideline validation.
- Rule definitions and evaluators must be kept in sync when adding new condition types.
- The Google STT adapter currently supports backend audio event ingestion and cloud URI recognition, not browser streaming.
- Transcript candidate extraction is intentionally lightweight and will need richer context once Gemini synthesis starts.
- A shared Docker test database requires serial API test files to avoid reset/seed deadlocks.

## Validation

Completed validation:

- `pnpm db:up`
- `pnpm --filter @matria/api prisma:migrate`
- `pnpm --filter @matria/api seed`
- `pnpm --filter @matria/api prisma:generate`
- `pnpm --filter @matria/api test`
- `pnpm typecheck`
- `pnpm test`
- `pnpm format`
- `pnpm format:check`
- `pnpm build`
- `pnpm lint`
- `pnpm e2e`

Added tests include:

- Rule runner unit test for severe hypertension and missing gestational age.
- Diarization mapper unit test for two-speaker grouping.
- API integration test for rule preflight, severe BP, acknowledgement, and audit.
- API integration test for consent-gated ambient session start, mock STT transcript turns, correction, and candidate extraction.

## Risks

- Local clinical teams must validate thresholds and escalation wording before production use.
- Google STT language/model/region diarization support must be validated during deployment work.
- Audio retention and browser microphone streaming policies are unresolved.
- Transcript candidate extraction may produce false positives and must remain unverified evidence.
- Future Gemini synthesis must preserve rule hits and clinician corrections without overwriting manual notes.

## Follow-up Work

1. Begin Phase 6 with Vertex AI Gemini adapter configuration using `GOOGLE_CLOUD_LOCATION=global`.
2. Add `ContextSnapshot` persistence and a context builder that includes patient, pregnancy, encounter, session note, observations, rule results, transcript turns, transcript candidates, and clinician edits.
3. Define Gemini structured JSON patch schemas for progressive summary, highlights, suggestions, missing questions, and draft notes/referrals.
4. Add stale-patch and clinician-edit protection before any AI-generated artifact updates the UI.
5. Validate Google STT diarization behavior with deployment-time credentials and target language/model settings.
6. Decide browser microphone streaming and raw audio retention policy before moving beyond backend audio event ingestion.
