# Matria Implementation Phases

Document status: Active  
Created: 2026-06-22  
Last updated: 2026-06-22  
Purpose: canonical implementation roadmap, sequencing, and progress tracker for Matria  
Source of truth: `.agent/PRD.md`

## Progress Convention

Use these exact statuses:

- `not_started`: planned but no implementation work has begun.
- `in_progress`: actively being worked on now.
- `blocked`: cannot progress without a decision, dependency, access, or external change.
- `done`: implemented, verified, and reflected in docs/handoff.
- `deferred`: intentionally postponed with rationale.

Progress maintenance rules:

- Keep only one current phase/subphase marked `in_progress`.
- Mark completed subphases `done`.
- Preserve blockers and deferred items explicitly.
- Never silently skip a dependency.
- Update this file whenever phase/subphase status, scope, ordering, dependencies, or acceptance criteria materially change.
- Update `.agent/sessionHandoff.md` at the end of every substantive task/session.

## Current Execution State

- Current phase: Phase 10 - CI And Hosted Runtime Preparation
- Current subphase: 10.1 - CI workflow
- Last completed subphase: 9.11 - Backend-driven progressive web flow
- Active blockers: none
- Next recommended task: begin Phase 10 CI and hosted runtime preparation after reviewing the Phase 9 local Compose runtime split from future production Dockerfiles.

## Phase Template

Each phase follows this structure:

- Objective: what this phase must accomplish.
- Status: current phase status.
- Dependencies: prior work required before starting.
- Subphases: detailed implementation slices with status and expected output.
- Deliverables: concrete artifacts that must exist.
- Acceptance checks: how to verify the phase is complete.
- Test plan: concrete checks to run or add during the phase.
- Update notes: phase-specific maintenance notes.

## Phase 0: Product Memory And Governance

Objective: establish the project memory, sequencing rules, handoff habit, and clinical safety invariants before code implementation starts.  
Status: `done`
Dependencies: `.agent/PRD.md`

### Subphases

| ID  | Name                                   | Status | Expected output                                                                                                                  |
| --- | -------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------- |
| 0.1 | Align `.agent` source docs             | `done` | `.agent/RULES.md` and `.agent/PRD.md` use `.agent/` as canonical project memory.                                                 |
| 0.2 | Lock source-of-truth rules             | `done` | Rules preserve PRD authority, clinical safety posture, and doc-update triggers.                                                  |
| 0.3 | Define status conventions              | `done` | Roadmap statuses and progress rules are defined in this file.                                                                    |
| 0.4 | Create stable session handoff          | `done` | `.agent/sessionHandoff.md` exists and records the current session.                                                               |
| 0.5 | Document clinical safety invariants    | `done` | Safety invariants are summarized in phase notes and preserved in future implementation tasks.                                    |
| 0.6 | Confirm deleted deployment docs policy | `done` | RULES states deployment/environment docs are recreated only when deployment work starts.                                         |
| 0.7 | Define ADR and commit governance       | `done` | RULES requires behavior-based commit messages with no phase references and comprehensive ADR updates after substantive sessions. |

### Deliverables

- `.agent/RULES.md` with required phase and handoff update policy.
- `.agent/implementationPhases.md` with all phases and subphases.
- `.agent/sessionHandoff.md` as the stable latest handoff file.
- Clear policy that `deploymentGuide.md` and `environmentMatrix.md` are not recreated until deployment work is ready.
- ADR governance requiring comprehensive `docs/adr/` updates after substantive sessions.
- Commit message governance requiring behavior-based subjects with no phase references.

### Acceptance Checks

- `implementationPhases.md` is non-empty and contains Phases 0 through 11.
- `RULES.md` references `.agent/sessionHandoff.md`, not dated handoff files.
- `RULES.md` requires updating both implementation phases and handoff after substantive sessions.
- `RULES.md` requires ADR updates after substantive sessions.
- `RULES.md` requires behavior-based commit messages and prohibits phase references in commit subjects.
- Markdown fences are balanced.
- Files are ASCII-only.

### Test Plan

- Run a docs validation pass that counts numbered phases 0 through 11.
- Run a Markdown sanity check for balanced code fences.
- Run an ASCII check for `.agent/RULES.md`, `.agent/implementationPhases.md`, and `.agent/sessionHandoff.md`.
- Search for stale dated handoff references such as `sessionHandoff-YYYY-MM-DD.md`.
- Search for deleted deployment/environment docs being treated as required source files.
- Search for commit-message guidance that permits phase-based subjects.
- Verify at least one ADR exists under `docs/adr/` for this governance decision.

### Update Notes

- Completed before application scaffolding. Clinical safety invariants remain enforced through RBAC, consent gates, audit logging, clinician authority, and deferred AI/STT/MedGemma boundaries.

## Phase 1: Repository And App Foundation

Objective: create the runnable local app skeleton and project tooling foundation.  
Status: `done`
Dependencies: Phase 0

### Subphases

| ID   | Name                                   | Status | Expected output                                                                                             |
| ---- | -------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------- |
| 1.1  | Choose repository layout               | `done` | `apps/api`, `apps/web`, `packages/shared`, and `apps/e2e` workspace layout exists.                          |
| 1.2  | Initialize package manager and scripts | `done` | Root `pnpm` scripts exist for dev, format, lint, typecheck, test, build, e2e, and Docker database commands. |
| 1.3  | Configure TypeScript baseline          | `done` | Shared strict TypeScript config and per-app configs exist.                                                  |
| 1.4  | Configure formatting and linting       | `done` | Prettier and ESLint are configured with deterministic check commands.                                       |
| 1.5  | Scaffold backend app                   | `done` | Express.js TypeScript API has `/health`, `/ready`, structured errors, env loading, request IDs, and CORS.   |
| 1.6  | Scaffold web app                       | `done` | Next.js TypeScript app has login, workspace, patients, and admin shells with clinical product styling.      |
| 1.7  | Scaffold shared package                | `done` | Shared enums, validators, API envelopes, and error codes exist.                                             |
| 1.8  | Configure Vitest                       | `done` | Vitest is configured for shared and API tests.                                                              |
| 1.9  | Configure Playwright                   | `done` | Playwright harness verifies workspace and patient capture routes.                                           |
| 1.10 | Add env examples                       | `done` | Root/API/web `.env.example` files include local, production placeholder, and Vertex AI global variables.    |

### Deliverables

- Runnable local API and web apps.
- Root scripts for all basic developer workflows.
- Basic health/readiness tests.
- Empty but navigable clinical workspace shell.

### Acceptance Checks

- `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `npm run e2e` or their chosen equivalents pass.
- API `/health` returns healthy status.
- API `/ready` returns dependency-aware readiness, even if dependencies are stubbed locally.
- Web app loads without runtime errors.

### Test Plan

- Add unit tests for shared validation helpers and API response helpers.
- Add backend tests for `/health`, `/ready`, structured error responses, and unknown-route behavior.
- Add frontend smoke tests for the initial Next.js route and clinical workspace shell.
- Add a Playwright smoke test that starts API/web and verifies the app loads.
- Add CI-equivalent local commands for format, lint, typecheck, unit tests, build, and E2E.

### Update Notes

- Phase completed with `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm build`, shared tests, API health tests, and Playwright smoke tests passing.

## Phase 2: Database, Auth, RBAC, And Audit Core

Objective: build the secure clinical data foundation.  
Status: `done`  
Dependencies: Phase 1

### Subphases

| ID  | Name                                 | Status | Expected output                                                                                   |
| --- | ------------------------------------ | ------ | ------------------------------------------------------------------------------------------------- |
| 2.1 | Docker PostgreSQL and pgvector setup | `done` | Compose config starts local Docker PostgreSQL with pgvector and Prisma validates against it.      |
| 2.2 | Migration framework                  | `done` | Prisma schema and initial SQL migration exist, including `CREATE EXTENSION IF NOT EXISTS vector`. |
| 2.3 | Base identity entities               | `done` | `User`, auth metadata, account status, password hashing, and seed/bootstrap admin path exist.     |
| 2.4 | Session authentication               | `done` | Secure cookie session creation, read, and revocation are implemented.                             |
| 2.5 | Role and permission model            | `done` | `Role`, `Permission`, `UserRole`, default roles, and permission constants are implemented.        |
| 2.6 | RBAC middleware                      | `done` | Permission checks protect routes and write audit-visible denials.                                 |
| 2.7 | Audit log writer                     | `done` | Immutable `AuditLog` entity and helper are implemented for sensitive actions.                     |
| 2.8 | Admin user management APIs           | `done` | Initial admin users, roles, and role assignment routes exist.                                     |
| 2.9 | Security tests                       | `done` | DB-backed auth, RBAC, audit, and denial tests pass against the Docker database.                   |

### Deliverables

- Database schema and migrations for users, roles, permissions, sessions, and audit logs.
- Authenticated backend routes.
- RBAC-enforced admin and clinical route scaffolding.
- Audit log helper used by sensitive paths.

### Acceptance Checks

- Unauthorized users cannot access protected routes.
- Users without required permission receive stable error codes.
- Sensitive action attempts produce audit events.
- Tests cover allow, deny, and audit cases.

### Test Plan

- Add migration tests or dry-run checks that apply the schema from a clean database.
- Add Docker database lifecycle checks for starting, stopping, resetting, and connecting to the local PostgreSQL/pgvector instance.
- Add a pgvector availability test against the Docker database.
- Add password hashing tests for successful verification and failed verification.
- Add auth integration tests for login, logout, session read, expired/invalid session, and unauthenticated protected-route access.
- Add RBAC tests for each default role against representative allowed and denied permissions.
- Add audit tests confirming sensitive allow/deny actions produce immutable audit records.
- Add admin API tests for creating users, assigning roles, and rejecting unauthorized administration.

### Update Notes

- Completed after Docker PostgreSQL started successfully, migrations applied, seed completed, and the API auth/RBAC/audit tests passed. Prisma scripts now default to the local Docker database URL when `DATABASE_URL` is not set.

## Phase 3: ANC Domain Model And Encounter Workflow

Objective: implement the core ANC data model and encounter capture workflow.  
Status: `done`  
Dependencies: Phase 2

### Subphases

| ID  | Name                    | Status | Expected output                                                                                                                             |
| --- | ----------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.1 | Patient records         | `done` | `Patient` entity, create/read/search APIs, RBAC, and audit logging are implemented.                                                         |
| 3.2 | Pregnancy episodes      | `done` | `PregnancyEpisode` entity and patient-scoped episode APIs are implemented.                                                                  |
| 3.3 | Encounter lifecycle     | `done` | `Encounter` entity and draft/active/reviewing/closed/approved/archived transition policy are implemented.                                   |
| 3.4 | Consent records         | `done` | `ConsentRecord` entity and processing-mode checks for audio/media/AI placeholders are implemented.                                          |
| 3.5 | Clinical file metadata  | `done` | `ClinicalFile` metadata route exists for audio, image, document, and ultrasound media.                                                      |
| 3.6 | Structured observations | `done` | Vitals, labs, symptoms, history, medications, allergies, and gestational-age observation contracts are implemented.                         |
| 3.7 | Session notes           | `done` | Clinician-editable session note entity and APIs are implemented and modeled as future LLM context.                                          |
| 3.8 | Encounter capture UI    | `done` | Web screens exist for patient lookup/create, episode selection/create, encounter creation, consent, observations, file metadata, and notes. |
| 3.9 | Scoping tests           | `done` | DB-backed cross-patient, cross-pregnancy, consent, lifecycle, observation, and note tests pass.                                             |

### Deliverables

- Patient, pregnancy episode, encounter, consent, file, observation, and session note schemas.
- Backend APIs for ANC workflow.
- Initial frontend flow for capturing structured ANC context.

### Acceptance Checks

- Clinician can create/select patient, create/select pregnancy episode, and start encounter.
- Consent is required before audio/media/AI actions.
- Cross-patient and cross-pregnancy access is denied.
- Session note edits persist and are audit-visible where appropriate.

### Test Plan

- Add API integration tests for patient create/read with RBAC and audit checks.
- Add pregnancy episode tests for patient-scoped creation, retrieval, active episode selection, and cross-patient denial.
- Add encounter lifecycle tests for valid state transitions and invalid transition rejection.
- Add consent tests proving audio/media/AI actions fail before consent and pass after valid consent.
- Add structured observation tests for vitals, labs, symptoms, history, medications, allergies, and gestational-age persistence.
- Add frontend/E2E tests for patient lookup, pregnancy episode selection, encounter creation, and session note editing.

### Update Notes

- Raw clinical media storage remains metadata-only. Phase completion was validated with Docker PostgreSQL migrations, seed, consent checks, scoping tests, lifecycle tests, observations, and session note persistence.

## Phase 4: Advisory Rule Engine And Clinical Preflight

Objective: build the maternal safety envelope without turning rules into an overblocking gatekeeper.  
Status: `done`  
Dependencies: Phase 3

### Subphases

| ID   | Name                           | Status | Expected output                                                                                                                                    |
| ---- | ------------------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.1  | Rule schema                    | `done` | Versioned JSON rule definitions and shared rule enums/contracts are implemented.                                                                   |
| 4.2  | Rule runner                    | `done` | Typed deterministic evaluator runs over structured observations, transcript candidates, and session notes.                                         |
| 4.3  | Rule result persistence        | `done` | `RuleEvaluationRun` and `RuleResult` persist severity, evidence, confidence, blocking level, suggested action, and status.                         |
| 4.4  | Blocking policy implementation | `done` | Rules are advisory-first; severe BP is `ack_required`, missing gestational age is `soft`, and hard blocks remain reserved for narrow safety gates. |
| 4.5  | Maternal safety rule family    | `done` | Initial rules cover severe hypertension, bleeding, reduced fetal movement, anemia, fever/infection, abnormal urine, and gestational context.       |
| 4.6  | Missing-field checks           | `done` | Missing gestational age produces a nonblocking missing-question style result.                                                                      |
| 4.7  | Contradiction checks           | `done` | Basic session-note and gestational-age contradiction checks are implemented as advisory review findings.                                           |
| 4.8  | Preflight APIs                 | `done` | `POST /encounters/:encounterId/preflight`, `GET /encounters/:encounterId/rule-results`, and `PATCH /rule-results/:id` exist.                       |
| 4.9  | Rule UI panel                  | `done` | Frontend displays deterministic rule findings separately from ambient transcript and manual notes.                                                 |
| 4.10 | Rule tests                     | `done` | Unit and API tests cover severe BP, missing gestational age, persistence, acknowledgement, and audit behavior.                                     |

### Deliverables

- Advisory rule engine.
- Persisted rule results.
- Clinical preflight API and UI.
- Rule test fixtures for routine and high-risk ANC examples.

### Acceptance Checks

- Severe hypertension creates a visible critical rule result.
- Missing gestational age creates a prompt/suggestion, not a blanket synthesis block.
- Rule results preserve evidence and threshold explanation.
- Gemini-facing context can include active rule results.

### Test Plan

- Add unit tests for rule schema validation and rule version parsing.
- Add rule runner tests for severe hypertension, bleeding, reduced fetal movement, anemia indicators, infection signs, abnormal urine values, high-risk history, and gestational-age missingness.
- Add blocking-policy tests proving only consent, scope, authorization, unsafe write/export, and critical acknowledgement cases hard-block.
- Add contradiction tests across manual observations, transcript candidates, session notes, OCR values, and media evidence.
- Add preflight API tests for persisted `RuleResult` evidence, severity, confidence, blocking level, and acknowledgement state.
- Add frontend tests showing deterministic rule hits separately from AI interpretation.

### Update Notes

- Clinical thresholds are implementation placeholders and are marked as requiring local guideline validation where relevant. Rule results are deterministic evidence for clinician review, not autonomous triage.

## Phase 5: Ambient Session, Audio, STT, And Diarization

Objective: implement consented ambient session capture and editable two-person transcript turns.  
Status: `done`  
Dependencies: Phase 4

### Subphases

| ID   | Name                                      | Status | Expected output                                                                                                            |
| ---- | ----------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------- |
| 5.1  | Ambient session lifecycle                 | `done` | `AmbientSessionState` entity plus create, start, stop, and read APIs are implemented.                                      |
| 5.2  | Audio event ingestion                     | `done` | Audio event ingestion endpoint stores `AudioSegment` rows and routes events through the STT boundary.                      |
| 5.3  | Google STT integration boundary           | `done` | Mockable `SpeechToTextProvider` interface exists with mock and Google Cloud Speech adapters.                               |
| 5.4  | Native diarization path                   | `done` | Word-level speaker tags map into two-person transcript turns by speaker, punctuation, and time gap.                        |
| 5.5  | Transcript turn persistence               | `done` | `TranscriptTurn` model and list/create/update APIs are implemented.                                                        |
| 5.6  | Speaker role correction                   | `done` | Clinicians can correct speaker label, role guess, and transcript text.                                                     |
| 5.7  | Transcript clinical extraction candidates | `done` | Lightweight unverified candidates are extracted for symptoms, danger signs, medication, history, GA, plans, and questions. |
| 5.8  | Future multilingual diarization boundary  | `done` | STT provider and diarization interfaces leave room for future `gemini-flash-lite-latest` post-processing.                  |
| 5.9  | Failure/degraded mode                     | `done` | STT failures mark the ambient session failed while preserving manual notes and structured data.                            |
| 5.10 | Ambient transcript UI                     | `done` | Encounter UI includes ambient controls, mock transcript submission, transcript list, confidence, and correction controls.  |

### Deliverables

- Ambient session model and API.
- Google STT adapter with mock path.
- Editable transcript turn workflow.
- Consent enforcement for audio/transcript processing.

### Acceptance Checks

- Ambient session cannot start audio processing without consent.
- Transcript turns preserve timestamp, speaker label, confidence, source segment, and correction status.
- Clinician correction becomes higher-priority context than automated diarization.
- STT failure does not erase session notes or structured encounter data.

### Test Plan

- Add unit tests for ambient session state transitions and invalid transitions.
- Add integration tests for start/stop APIs with consent, RBAC, patient scope, and audit logging.
- Add Google STT adapter tests using mocked provider responses for transcript events and diarization labels.
- Add transcript persistence tests for create, list, correction, revision, and source audio segment references.
- Add diarization contract tests for two-speaker turns, role guesses, confidence, and clinician correction precedence.
- Add failure-mode tests proving STT/provider errors leave manual notes and structured observations usable.
- Add frontend/E2E tests for live transcript rendering and speaker/text correction.

### Update Notes

- Real Google STT is configuration-gated behind `STT_PROVIDER=google`; tests use the mock provider and mocked normalized contracts. Browser microphone streaming remains deferred to a later real-time capture slice.

## Phase 6: Stateful Context Engineering And Gemini Orchestrator

Objective: make Gemini a stateful session orchestrator that updates UI artifacts through validated JSON patches.  
Status: `done`  
Dependencies: Phase 5

### Subphases

| ID   | Name                                    | Status | Expected output                                                                                                                          |
| ---- | --------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 6.1  | Vertex AI runtime config                | `done` | Provider config for `GEMINI_PROVIDER=vertex_ai`, `GOOGLE_CLOUD_PROJECT`, and `GOOGLE_CLOUD_LOCATION=global`.                             |
| 6.2  | Gemini client adapter                   | `done` | Mockable adapter for `gemini-3.1-pro-preview` and structured output calls.                                                               |
| 6.3  | Context snapshot entity                 | `done` | `ContextSnapshot` persistence with patient/pregnancy/encounter/session scope.                                                            |
| 6.4  | Context builder                         | `done` | Builder assembles patient, pregnancy, transcript, session note, observations, rules, suggestions, memory, media, and artifact revisions. |
| 6.5  | Patient-scoped memory retrieval         | `done` | pgvector-backed retrieval scoped by patient and pregnancy episode.                                                                       |
| 6.6  | Gemini patch schema                     | `done` | Runtime validation for summary, highlights, suggestions, notes, referral drafts, and handoff requests.                                   |
| 6.7  | Summary/highlight/suggestion generation | `done` | Orchestrator tick creates progressive artifacts from context snapshots.                                                                  |
| 6.8  | Output validator                        | `done` | Ensures uncertainty, rule references, source references, and clinician review requirements are preserved.                                |
| 6.9  | Artifact revision history               | `done` | `AiArtifactRevision` stores patch history and prevents stale patches from overwriting clinician edits.                                   |
| 6.10 | Synthesis tick scheduling               | `done` | Debounced event-driven and periodic synthesis triggers.                                                                                  |
| 6.11 | Gemini failure mode                     | `done` | Existing transcript, rules, notes, and structured data remain visible when AI fails.                                                     |

### Deliverables

- Vertex AI Gemini configuration.
- Context snapshot builder.
- Gemini orchestrator service.
- Validated JSON patch pipeline.
- Progressive summary, highlight, and suggestion artifacts.

### Acceptance Checks

- Session note edits are included in the next context snapshot.
- Gemini cannot produce unstructured output where JSON patches are required.
- Rule hits and uncertainty remain visible in Gemini artifacts.
- Stale AI patches cannot overwrite newer clinician edits.

### Test Plan

- Add config tests for required Vertex AI settings: `GEMINI_PROVIDER=vertex_ai`, `GOOGLE_CLOUD_PROJECT`, and `GOOGLE_CLOUD_LOCATION=global`.
- Add Gemini client adapter tests with mocked structured responses and provider failures.
- Add context builder tests proving patient, pregnancy, encounter, transcript, session note, observations, rules, suggestions, memory, media, and artifact revisions are included or intentionally summarized.
- Add patient-scoped memory retrieval tests preventing cross-patient and cross-pregnancy leakage.
- Add JSON patch schema tests for accepted and rejected Gemini outputs.
- Add output validator tests proving rule references, uncertainty, source references, and clinician review flags are preserved.
- Add stale patch tests proving newer clinician edits cannot be overwritten by older synthesis ticks.

### Update Notes

- Completed with a mock local/test Gemini provider and a configuration-gated Vertex AI provider using `@google/genai`, `gemini-3.1-pro-preview`, and `GOOGLE_CLOUD_LOCATION=global`.
- Local development defaults to `GEMINI_PROVIDER=mock`; production Vertex mode requires `GOOGLE_CLOUD_PROJECT` and must not use standalone AI Studio API keys.
- `ContextSnapshot`, `AiToolCall`, `AiArtifactRevision`, `SummaryRevision`, `HighlightCard`, `Suggestion`, `SuggestionResult`, `PatientMemoryFact`, and `SynthesisTick` are persisted.
- Phase 6 reads patient memory scoped by patient and pregnancy episode, but approval-based memory writes remain Phase 9.
- Gemini patches are stored as clinician-review drafts only. Phase 6 does not approve outputs, write durable memory, export FHIR, or execute MedGemma handoffs.
- Synthesis ticks run advisory preflight first, audit provider calls and validation failures, reject unsafe/stale patches, and leave transcript, notes, rules, and observations usable when AI fails.
- The encounter capture UI has a compact draft synthesis panel; the full ambient workspace remains Phase 8.

## Phase 7: Medical Evidence, Media, And Document Analysis

Objective: integrate clinical media/document evidence as reviewable support for Gemini and clinicians.  
Status: `done`  
Dependencies: Phase 6

### Subphases

| ID   | Name                               | Status | Expected output                                                                                                                      |
| ---- | ---------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| 7.1  | Clinical file upload pipeline      | `done` | Multipart upload handling, metadata persistence, type/size validation, checksums, and local storage abstraction.                     |
| 7.2  | Media quality metadata             | `done` | Store frame/video quality signals, dimensions, hashes, degraded states, and source references.                                       |
| 7.3  | Frame sampler                      | `done` | Image sampling and FFmpeg-based 5-second frame extraction from uploaded video files, with degraded fallback on extraction failure.   |
| 7.4  | Medical evidence provider modes    | `done` | Mock for tests/scripts, Gemini 3.5 Flash default for local/hosted, Ollama MedGemma opt-in for local dev.                             |
| 7.5  | Medical evidence provider boundary | `done` | Mockable client/service boundary for Gemini Flash and Ollama MedGemma-compatible evidence calls.                                     |
| 7.6  | Evidence handoff packets           | `done` | Handoff schema and Gemini `medgemma_handoff_request` artifact-to-job executor glue.                                                  |
| 7.7  | Evidence response schema           | `done` | Findings, extracted values, frame references, confidence, limitations, and clinician review flag.                                    |
| 7.8  | OCR/document extraction boundary   | `done` | Document extraction modeled as evidence-provider task type without a separate production OCR engine yet.                             |
| 7.9  | Evidence persistence               | `done` | Store media/document evidence separately from approved observations, memory, FHIR, and approvals.                                    |
| 7.10 | Evidence UI                        | `done` | Compact encounter UI displays uploads, samples, handoffs, findings, uncertainty, and review requirement.                             |
| 7.11 | Medical evidence degraded mode     | `done` | Poor media quality, invalid uploaded videos, FFmpeg failures, and provider failures remain visible without blocking manual workflow. |

### Deliverables

- Clinical file upload and metadata handling with local filesystem storage.
- Frame sampling pipeline with image sampling and FFmpeg extraction from uploaded video files.
- Provider-routed medical evidence handoff and response handling.
- Reviewable media/document evidence UI.

### Acceptance Checks

- The configured medical evidence provider receives current consultation context with frame samples.
- Gemini can request a targeted evidence handoff through `medgemma_handoff_request` artifacts.
- Evidence-provider output is never stored as approved fact without clinician approval.
- Low-confidence or poor-quality media is marked uncertain.

### Test Plan

- Add upload tests for allowed/denied file types, size limits, metadata persistence, and RBAC.
- Add frame sampler unit tests for 5-10 second sampling cadence, deduplication hooks, timestamps, and quality metadata.
- Add medical evidence client boundary tests with mocked successful, low-confidence, and failed responses.
- Add handoff packet tests proving exact question, context, transcript snippets, session note excerpt, rule results, prior findings, and frame IDs are included.
- Add response schema tests for findings, extracted values, frame references, confidence, uncertainty, limitations, and `clinicianReviewRequired`.
- Add evidence persistence tests proving media/document findings stay separate from approved clinical facts.
- Add frontend tests for evidence display, uncertainty, and degraded media/provider states.

### Update Notes

- Completed with local filesystem storage, deterministic mock evidence tests, Gemini Flash evidence default, Ollama MedGemma 1.5 local opt-in, image frame sampling, bundled FFmpeg video file frame extraction, degraded fallback for invalid video extraction, review-required evidence persistence, context snapshot re-entry, and compact frontend evidence controls.
- Production object storage and specialized production OCR remain deferred to hosted runtime and future evidence-provider hardening.

## Phase 8: Clinical Workspace Frontend

Objective: provide the clinician-facing ambient ANC workspace.
Status: `done`
Dependencies: Phases 3 through 7

### Subphases

| ID   | Name                                    | Status | Expected output                                                                                                                |
| ---- | --------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------ |
| 8.1  | Patient and encounter navigation        | `done` | Clinician can find patient, select pregnancy episode, and enter an encounter.                                                  |
| 8.2  | Encounter capture layout                | `done` | Dense work-focused clinical layout for repeated use.                                                                           |
| 8.3  | Live transcript panel                   | `done` | Speaker-labeled transcript with timestamps, confidence, and correction controls.                                               |
| 8.4  | Session note editor                     | `done` | Editable clinician note with save/regenerate affordances.                                                                      |
| 8.5  | Progressive summary panel               | `done` | Shows summary revisions and source references.                                                                                 |
| 8.6  | Highlight cards                         | `done` | Cards for risks, possible issues, uncertainty, contradictions, missing context, and memory.                                    |
| 8.7  | Suggestions checklist                   | `done` | Suggestions are visible with status, priority, and action state.                                                               |
| 8.8  | Rules panel                             | `done` | Deterministic rule hits separated from AI interpretation.                                                                      |
| 8.9  | Medical evidence panel                  | `done` | Reviewable media/document evidence with limitations and confidence.                                                            |
| 8.10 | Approval/rejection UI and persistence   | `done` | Clinician can approve, edit, reject, acknowledge, or mark uncertain, with backend persistence.                                 |
| 8.11 | Artifact history UI                     | `done` | Show AI revision history and what changed.                                                                                     |
| 8.12 | RBAC-aware affordances                  | `done` | Unauthorized actions are server-enforced and covered by API tests.                                                             |
| 8.13 | Reference-image frontend implementation | `done` | Six supplied reference images implemented as `/patients`, `/workspace/setup`, `/workspace`, `/review`, `/admin`, and `/audit`. |

### Deliverables

- `.agent/pages.md` frontend UX contract for Phase 8 pages, flows, screen contents, component responsibilities, brand-system UX guidance, and non-design interaction behavior.
- Usable clinical workspace for ambient ANC sessions.
- Clear separation of transcript, rules, Gemini outputs, MedGemma evidence, and clinician-approved facts.
- Responsive and scannable UI for clinical workflows.
- Backend aggregate, audit, admin health/user patch, generated-output, and clinical approval APIs needed by the reference pages.

### Acceptance Checks

- Clinician can complete a simulated ambient ANC workflow end to end.
- Session note edits are visible and included in subsequent AI context.
- Suggestions support structured result and optional note.
- Unauthorized users cannot approve final outputs.

### Test Plan

- Add component tests for patient navigation, encounter capture, transcript panel, session note editor, summary panel, highlight cards, suggestions checklist, rules panel, evidence panel, approval controls, and artifact history.
- Add accessibility checks for keyboard navigation, labels, focus states, and readable error/status messages.
- Add E2E tests for the integrated clinical workspace from patient selection through ambient session review.
- Add RBAC UI tests confirming unauthorized actions are hidden/disabled and server-denied.
- Add responsive layout tests for clinically useful desktop and tablet/mobile widths.
- Add degraded-state UI tests for AI unavailable, STT unavailable, and media evidence unavailable.

### Update Notes

- Completed against the six supplied reference images in `.agent/design-reference-images/` with a shared clinical app shell, hybrid demo/live data, and smoke tests for all six critical pages.
- Scope change: generated output review model, approve/edit/reject/mark-uncertain APIs, clinician edit provenance, and rejection audit retention were pulled forward from Phase 9 into Phase 8 by user decision.
- Memory writeback, referral/teleconsult finalization, FHIR generation, FHIR provenance, export, and live SATUSEHAT/external submission remain deferred to Phase 9 or later.
- Frontend must stay operational when AI/STT/media providers fail.

## Phase 9: Approvals, Memory, FHIR, And Referral Outputs

Objective: convert clinician-reviewed outputs into approved memory, referral, teleconsult, and FHIR artifacts.
Status: `done`
Dependencies: Phase 8

### Subphases

| ID   | Name                          | Status | Expected output                                                                                                 |
| ---- | ----------------------------- | ------ | --------------------------------------------------------------------------------------------------------------- |
| 9.1  | Generated output review model | `done` | Pulled forward to Phase 8.                                                                                      |
| 9.2  | Approval/edit/reject APIs     | `done` | Pulled forward to Phase 8.                                                                                      |
| 9.3  | Clinician edit provenance     | `done` | Pulled forward to Phase 8.                                                                                      |
| 9.4  | Durable memory writeback      | `done` | `PatientMemoryFact` creation only after clinician approval.                                                     |
| 9.5  | Memory deduplication          | `done` | Repeated synthesis does not duplicate approved facts.                                                           |
| 9.6  | Referral summary output       | `done` | Approved referral-ready summary generation and review.                                                          |
| 9.7  | Teleconsult summary output    | `done` | Approved teleconsult summary generation and review.                                                             |
| 9.8  | FHIR R4 formatter             | `done` | Export-ready FHIR resources and composition where sufficient data exists.                                       |
| 9.9  | FHIR provenance               | `done` | Clinician approval, timestamp, source artifact, and generation provenance.                                      |
| 9.10 | Rejection audit behavior      | `done` | Pulled forward to Phase 8 for generated outputs; memory/export exclusion remains enforced by Phase 9 consumers. |
| 9.11 | Progressive web flow          | `done` | Frontend pages use backend data only, with no local clinical fixtures or demo fallback behavior.                 |

### Deliverables

- Patient memory writeback.
- Referral and teleconsult summaries.
- FHIR R4 export artifacts.
- Backend-driven patient, setup, workspace, review, admin, and audit pages.

### Acceptance Checks

- Approved edited text becomes export and memory source.
- Rejected AI outputs are not exported or written to memory.
- FHIR export includes clinician approval provenance.
- Frontend clinical pages show backend data, loading states, empty states, or server errors only.
- No frontend clinical fixture file or demo fallback path exists.

### Test Plan

- Add memory writeback tests for approval-only writes, deduplication, patient/pregnancy scoping, and rejected-output exclusion.
- Add referral and teleconsult summary tests for approved-source-only generation.
- Add FHIR formatter tests for expected R4 resources, missing-data handling, and approval provenance.
- Add audit tests for approval, edit, rejection, memory write, and FHIR export events.
- Add E2E tests for clinician-edited summary becoming the export source.
- Add frontend fixture guards and progressive Playwright flow from admin-created clinician through patient setup, consultation, approval, memory, and FHIR export.

### Update Notes

- Generated-output review and rejection audit retention are already implemented in Phase 8.
- Live SATUSEHAT/external FHIR submission remains out of scope.
- Phase 9 is complete with approved/edited generated-output canonical content as the only memory and FHIR export source.
- `PatientMemoryFact.dedupeKey` prevents repeated writeback duplication within patient and pregnancy episode scope.
- `FhirExport` persists export-ready FHIR R4 document bundles with `Composition` first, `ServiceRequest` draft/proposal intent, structured-observation entries, and `Provenance` tied to clinician approval.
- Local Docker Compose now starts Postgres, API, and web in mock-provider mode for developer verification; production image/runtime hardening remains Phase 10.
- Frontend demo clinical fixtures were removed after Phase 9 so consultation data appears only after clinician actions persist through the API.

## Phase 10: CI And Hosted Runtime Preparation

Objective: prepare the project for hosted runtime and automated validation without recreating full deployment docs prematurely.  
Status: `not_started`  
Dependencies: Phases 1 through 9

### Subphases

| ID   | Name                         | Status        | Expected output                                                                                  |
| ---- | ---------------------------- | ------------- | ------------------------------------------------------------------------------------------------ |
| 10.1 | CI workflow                  | `not_started` | GitHub Actions CI for install, format, lint, typecheck, tests, build, E2E, Compose config/build. |
| 10.2 | Dockerfiles                  | `not_started` | Production Dockerfiles for API, web, and optional worker.                                        |
| 10.3 | Docker Compose remote config | `not_started` | Compose services for postgres, api, web, caddy, and optional worker.                             |
| 10.4 | Runtime env examples         | `not_started` | Production env examples without secrets, including Vertex AI `global` config.                    |
| 10.5 | VM script contracts          | `not_started` | Bootstrap/preflight/deploy/rollback script interfaces.                                           |
| 10.6 | Caddy/domain assumptions     | `not_started` | `matriacare.site` and `api.matriacare.site` assumptions wired into runtime examples.             |
| 10.7 | Smoke check scripts          | `not_started` | Health, ready, and web route checks.                                                             |
| 10.8 | Deployment docs trigger      | `not_started` | Recreate deployment/environment docs only once implementation reaches hosted deployment work.    |

### Deliverables

- CI workflow and hosted runtime artifacts.
- Remote Compose config and runtime env examples.
- Preflight/deploy/rollback script contracts.

### Acceptance Checks

- CI runs all required checks and no first-release security scan jobs.
- Docker Compose config validates with production env example.
- Hosted images build in CI.
- VM deploy path does not rerun tests that CI already ran.

### Test Plan

- Add CI workflow validation by running the same local commands documented for CI before merge.
- Add Docker Compose config validation using the production env example.
- Add hosted image build checks for API, web, and optional worker.
- Add smoke-check script tests or shell lint where practical for health, ready, and web route probes.
- Add env example validation confirming required production keys are present and no secret values are committed.
- Add deploy-script dry-run or static checks confirming VM deploy does not run format, lint, typecheck, Vitest, or Playwright.

### Update Notes

- Do not recreate `.agent/deploymentGuide.md` or `.agent/environmentMatrix.md` before this phase unless the user explicitly asks.

## Phase 11: End-to-end Validation And Clinical Safety Hardening

Objective: validate the hospital-ready first-release workflow and harden safety behavior.  
Status: `not_started`  
Dependencies: Phases 1 through 10

### Subphases

| ID    | Name                                      | Status        | Expected output                                                                             |
| ----- | ----------------------------------------- | ------------- | ------------------------------------------------------------------------------------------- |
| 11.1  | PRD E2E scenario suite                    | `not_started` | Playwright scenarios covering ambient ANC workflow and approval paths.                      |
| 11.2  | AI failure modes                          | `not_started` | Gemini/MedGemma failures leave transcript, rules, notes, and manual data usable.            |
| 11.3  | STT failure modes                         | `not_started` | Google STT failure permits manual note and structured observation workflow.                 |
| 11.4  | RBAC denial cases                         | `not_started` | Unauthorized roles cannot approve/export/administer.                                        |
| 11.5  | Cross-patient memory tests                | `not_started` | Memory retrieval and writes never leak across patient or pregnancy episode.                 |
| 11.6  | Clinical safety cases                     | `not_started` | Severe BP, bleeding, fetal movement, missing gestational age, and low-confidence OCR cases. |
| 11.7  | UI usability and accessibility pass       | `not_started` | Clinical workspace remains scannable, responsive, and keyboard/screen-reader reasonable.    |
| 11.8  | Demo data and fixtures                    | `in_progress` | Isolated 06-LUS mid-consultation presenter demo added; broader routine/high-risk suite remains. |
| 11.9  | Performance and provider-cost observation | `not_started` | Basic timings and provider-call visibility by session/tool type.                            |
| 11.10 | Release readiness review                  | `not_started` | Final checklist of docs, tests, known gaps, and deferred decisions.                         |

### Deliverables

- End-to-end validation suite.
- Clinical safety regression tests.
- Demo data for routine and high-risk ANC flows. Initial 06-LUS route is isolated under `/demo/06-lus` and does not reintroduce frontend fallback data into normal clinical pages.
- First-release readiness summary.

### Acceptance Checks

- All PRD acceptance scenarios are represented in tests or explicit manual validation notes.
- AI provider failures degrade safely.
- STT provider failures degrade safely.
- Cross-patient memory leakage tests pass.
- Clinician authority and approval gates are preserved.

### Test Plan

- Add Playwright E2E scenarios for routine ANC, high-risk ANC, missing gestational age, transcript correction, session note edit, suggestion completion, MedGemma handoff, approval, and FHIR export.
- Add backend integration tests for AI provider failure, STT provider failure, MedGemma failure, low-confidence OCR, and stale synthesis ticks.
- Add security/RBAC regression tests for nurse/lab/auditor/admin role boundaries.
- Add cross-patient and cross-pregnancy memory leakage regression tests.
- Add clinical safety regression tests for severe BP, bleeding, reduced fetal movement, anemia indicators, infection signs, and contradictory evidence.
- Add manual validation checklist for usability, accessibility, and demo-readiness where automation is insufficient.

### Update Notes

- Any safety gap found here must update `.agent/PRD.md`, this roadmap, and `.agent/sessionHandoff.md`.

## Deferred Or Future Phase Candidates

- Deployment guide and environment matrix recreation after hosted deployment implementation begins.
- Live SATUSEHAT or external FHIR submission.
- Multi-hospital tenancy.
- Patient-facing mobile app.
- ASEAN multilingual rollout beyond the post-STT diarization boundary.
- Clinical guideline threshold validation with local clinicians.
