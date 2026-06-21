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

- Current phase: Phase 0 - Product Memory And Governance
- Current subphase: 0.5 - Document clinical safety invariants
- Last completed subphase: 0.7 - Define ADR and commit governance
- Active blockers: none
- Next recommended task: finish Phase 0 docs validation, then begin Phase 1 repository and app foundation.

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
Status: `in_progress`  
Dependencies: `.agent/PRD.md`

### Subphases

| ID | Name | Status | Expected output |
| --- | --- | --- | --- |
| 0.1 | Align `.agent` source docs | `done` | `.agent/RULES.md` and `.agent/PRD.md` use `.agent/` as canonical project memory. |
| 0.2 | Lock source-of-truth rules | `done` | Rules preserve PRD authority, clinical safety posture, and doc-update triggers. |
| 0.3 | Define status conventions | `done` | Roadmap statuses and progress rules are defined in this file. |
| 0.4 | Create stable session handoff | `done` | `.agent/sessionHandoff.md` exists and records the current session. |
| 0.5 | Document clinical safety invariants | `in_progress` | Safety invariants are summarized in phase notes and preserved in future implementation tasks. |
| 0.6 | Confirm deleted deployment docs policy | `done` | RULES states deployment/environment docs are recreated only when deployment work starts. |
| 0.7 | Define ADR and commit governance | `done` | RULES requires behavior-based commit messages with no phase references and comprehensive ADR updates after substantive sessions. |

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

- When this phase completes, set Phase 1 as the current phase and identify the first app-foundation task in `.agent/sessionHandoff.md`.

## Phase 1: Repository And App Foundation

Objective: create the runnable local app skeleton and project tooling foundation.  
Status: `not_started`  
Dependencies: Phase 0

### Subphases

| ID | Name | Status | Expected output |
| --- | --- | --- | --- |
| 1.1 | Choose repository layout | `not_started` | Decide and document monorepo layout, likely `apps/api`, `apps/web`, `packages/shared`, and `apps/e2e` if Playwright is separated. |
| 1.2 | Initialize package manager and scripts | `not_started` | Root package scripts for install, dev, format, lint, typecheck, test, build, e2e, and compose validation. |
| 1.3 | Configure TypeScript baseline | `not_started` | Shared strict TypeScript config and per-app configs. |
| 1.4 | Configure formatting and linting | `not_started` | Formatter/linter config with deterministic CI commands. |
| 1.5 | Scaffold backend app | `not_started` | Express.js TypeScript API with `/health`, `/ready`, structured errors, env loading, and request logging. |
| 1.6 | Scaffold web app | `not_started` | Next.js TypeScript app with authenticated workspace shell placeholder and basic layout system. |
| 1.7 | Scaffold shared package | `not_started` | Shared types, constants, validation helpers, and API response shapes. |
| 1.8 | Configure Vitest | `not_started` | Unit/integration test setup for backend and shared packages. |
| 1.9 | Configure Playwright | `not_started` | E2E harness that starts API/web locally and verifies a basic route. |
| 1.10 | Add env examples | `not_started` | `.env.example` files for local API/web plus production placeholders without secrets. |

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

- Do not add clinical workflow logic before app foundation and test harness are stable.

## Phase 2: Database, Auth, RBAC, And Audit Core

Objective: build the secure clinical data foundation.  
Status: `not_started`  
Dependencies: Phase 1

### Subphases

| ID | Name | Status | Expected output |
| --- | --- | --- | --- |
| 2.1 | Docker PostgreSQL and pgvector setup | `not_started` | Local Docker-managed PostgreSQL configuration with pgvector enabled through Compose, plus hosted-ready PostgreSQL assumptions. |
| 2.2 | Migration framework | `not_started` | Repeatable migrations with local reset/apply commands and CI-safe validation. |
| 2.3 | Base identity entities | `not_started` | `User`, auth metadata, account status, password hashing, and seed/bootstrap admin path. |
| 2.4 | Session authentication | `not_started` | Secure session/cookie handling and authenticated route guard. |
| 2.5 | Role and permission model | `not_started` | `Role`, `Permission`, `UserRole`, default roles, and permission constants. |
| 2.6 | RBAC middleware | `not_started` | Permission checks for protected routes and audit-visible denials. |
| 2.7 | Audit log writer | `not_started` | Immutable `AuditLog` entity and helper used by sensitive actions. |
| 2.8 | Admin user management APIs | `not_started` | Initial admin routes for users, roles, and permissions. |
| 2.9 | Security tests | `not_started` | Tests for auth required, permission denied, and audit logging behavior. |

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

- Patient data work must not proceed until patient-scope and RBAC patterns are established.

## Phase 3: ANC Domain Model And Encounter Workflow

Objective: implement the core ANC data model and encounter capture workflow.  
Status: `not_started`  
Dependencies: Phase 2

### Subphases

| ID | Name | Status | Expected output |
| --- | --- | --- | --- |
| 3.1 | Patient records | `not_started` | `Patient` entity, create/read APIs, RBAC, and audit logging. |
| 3.2 | Pregnancy episodes | `not_started` | `PregnancyEpisode` entity and patient-scoped episode APIs. |
| 3.3 | Encounter lifecycle | `not_started` | `Encounter` entity with draft, active, reviewing, closed, approved, archived states. |
| 3.4 | Consent records | `not_started` | `ConsentRecord` entity and processing-mode checks for audio/media/AI. |
| 3.5 | Clinical file metadata | `not_started` | `ClinicalFile` metadata for audio, image, document, and ultrasound media. |
| 3.6 | Structured observations | `not_started` | Vitals, labs, symptoms, history, medications, allergies, and gestational-age observations. |
| 3.7 | Session notes | `not_started` | Clinician-editable note entity and APIs tied to encounter/ambient session. |
| 3.8 | Encounter capture UI | `not_started` | Web screens for patient lookup, episode selection, encounter creation, and structured capture. |
| 3.9 | Scoping tests | `not_started` | Tests proving patient and pregnancy episode scoping on all reads/writes. |

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

- Keep raw clinical media storage minimal until the media pipeline phase defines storage policy.

## Phase 4: Advisory Rule Engine And Clinical Preflight

Objective: build the maternal safety envelope without turning rules into an overblocking gatekeeper.  
Status: `not_started`  
Dependencies: Phase 3

### Subphases

| ID | Name | Status | Expected output |
| --- | --- | --- | --- |
| 4.1 | Rule schema | `not_started` | Versioned YAML/JSON or database-backed rule definition shape. |
| 4.2 | Rule runner | `not_started` | Deterministic evaluator over structured observations, transcript candidates, and notes. |
| 4.3 | Rule result persistence | `not_started` | `RuleResult` entity with severity, evidence, confidence, blocking level, and status. |
| 4.4 | Blocking policy implementation | `not_started` | Hard blocks only for consent, scope, authorization, unsafe write/export, and critical acknowledgement cases. |
| 4.5 | Maternal safety rule family | `not_started` | Initial rules for severe hypertension, bleeding, fetal movement, anemia, infection, urine values, history, and gestational context. |
| 4.6 | Missing-field checks | `not_started` | Missing context produces prompts/suggestions instead of global synthesis blocks. |
| 4.7 | Contradiction checks | `not_started` | Detect contradictions among manual inputs, transcript candidates, session notes, OCR, and media evidence. |
| 4.8 | Preflight APIs | `not_started` | `POST /encounters/:encounterId/preflight` and internal rule evaluation hooks. |
| 4.9 | Rule UI panel | `not_started` | Frontend displays deterministic rules separately from AI synthesis. |
| 4.10 | Rule tests | `not_started` | Unit tests for severity, blocking level, evidence references, and nonblocking missing fields. |

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

- Clinical thresholds must remain implementation placeholders until validated against local clinical guidance.

## Phase 5: Ambient Session, Audio, STT, And Diarization

Objective: implement consented ambient session capture and editable two-person transcript turns.  
Status: `not_started`  
Dependencies: Phase 4

### Subphases

| ID | Name | Status | Expected output |
| --- | --- | --- | --- |
| 5.1 | Ambient session lifecycle | `not_started` | `AmbientSessionState` entity and start/stop APIs. |
| 5.2 | Audio event ingestion | `not_started` | Backend endpoint or stream boundary for audio/transcript events. |
| 5.3 | Google STT integration boundary | `not_started` | Provider adapter for Google Cloud Speech-to-Text with mockable interface. |
| 5.4 | Native diarization path | `not_started` | Two-speaker native STT diarization for supported English-centered model/region combos. |
| 5.5 | Transcript turn persistence | `not_started` | `TranscriptTurn` entity and APIs for list/create/update. |
| 5.6 | Speaker role correction | `not_started` | Clinician-correctable speaker labels and role guesses. |
| 5.7 | Transcript clinical extraction candidates | `not_started` | Lightweight extraction of candidate facts, symptoms, questions, and danger signs. |
| 5.8 | Future multilingual diarization boundary | `not_started` | Interface reserved for `gemini-flash-lite-latest` post-STT diarization. |
| 5.9 | Failure/degraded mode | `not_started` | Manual notes and structured observations remain usable when STT fails. |
| 5.10 | Ambient transcript UI | `not_started` | Live transcript panel with timestamps, confidence, and corrections. |

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

- Do not depend on real Google STT in unit tests; use provider mocks and integration boundaries.

## Phase 6: Stateful Context Engineering And Gemini Orchestrator

Objective: make Gemini a stateful session orchestrator that updates UI artifacts through validated JSON patches.  
Status: `not_started`  
Dependencies: Phase 5

### Subphases

| ID | Name | Status | Expected output |
| --- | --- | --- | --- |
| 6.1 | Vertex AI runtime config | `not_started` | Provider config for `GEMINI_PROVIDER=vertex_ai`, `GOOGLE_CLOUD_PROJECT`, and `GOOGLE_CLOUD_LOCATION=global`. |
| 6.2 | Gemini client adapter | `not_started` | Mockable adapter for `gemini-3.1-pro-preview` and structured output calls. |
| 6.3 | Context snapshot entity | `not_started` | `ContextSnapshot` persistence with patient/pregnancy/encounter/session scope. |
| 6.4 | Context builder | `not_started` | Builder assembles patient, pregnancy, transcript, session note, observations, rules, suggestions, memory, media, and artifact revisions. |
| 6.5 | Patient-scoped memory retrieval | `not_started` | pgvector-backed retrieval scoped by patient and pregnancy episode. |
| 6.6 | Gemini patch schema | `not_started` | Runtime validation for summary, highlights, suggestions, notes, referral drafts, and handoff requests. |
| 6.7 | Summary/highlight/suggestion generation | `not_started` | Orchestrator tick creates progressive artifacts from context snapshots. |
| 6.8 | Output validator | `not_started` | Ensures uncertainty, rule references, source references, and clinician review requirements are preserved. |
| 6.9 | Artifact revision history | `not_started` | `AiArtifactRevision` stores patch history and prevents stale patches from overwriting clinician edits. |
| 6.10 | Synthesis tick scheduling | `not_started` | Debounced event-driven and periodic synthesis triggers. |
| 6.11 | Gemini failure mode | `not_started` | Existing transcript, rules, notes, and structured data remain visible when AI fails. |

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

- Do not use standalone Google AI Studio API keys for production Gemini calls.

## Phase 7: MedGemma, Media, And Document Evidence

Objective: integrate clinical media/document evidence as reviewable support for Gemini and clinicians.  
Status: `not_started`  
Dependencies: Phase 6

### Subphases

| ID | Name | Status | Expected output |
| --- | --- | --- | --- |
| 7.1 | Clinical file upload pipeline | `not_started` | Upload handling, metadata persistence, type/size validation, and storage abstraction. |
| 7.2 | Media quality metadata | `not_started` | Store frame/video quality signals and source references. |
| 7.3 | Frame sampler | `not_started` | Sample ultrasound/video frames every 5-10 seconds when media analysis is active. |
| 7.4 | MedGemma hosting boundary | `not_started` | Mockable client/service boundary for MedGemma 4B/1.5 4B. |
| 7.5 | MedGemma handoff packets | `not_started` | `MedGemmaHandoff` schema and Gemini handoff executor. |
| 7.6 | MedGemma response schema | `not_started` | Findings, extracted values, frame references, confidence, limitations, and clinician review flag. |
| 7.7 | OCR/document extraction boundary | `not_started` | Adapter boundary for lab and maternal record image extraction. |
| 7.8 | Evidence persistence | `not_started` | Store media/document evidence separately from approved clinical facts. |
| 7.9 | Evidence UI | `not_started` | Display MedGemma/OCR findings with uncertainty and clinician review requirement. |
| 7.10 | Media failure/degraded mode | `not_started` | Poor media quality and provider failures remain visible without blocking manual workflow. |

### Deliverables

- Clinical file upload and metadata handling.
- Frame sampling pipeline.
- MedGemma handoff and response handling.
- Reviewable media/document evidence UI.

### Acceptance Checks

- MedGemma receives current consultation context with frame samples.
- Gemini can request a targeted MedGemma handoff.
- MedGemma output is never stored as approved fact without clinician approval.
- Low-confidence or poor-quality media is marked uncertain.

### Test Plan

- Add upload tests for allowed/denied file types, size limits, metadata persistence, and RBAC.
- Add frame sampler unit tests for 5-10 second sampling cadence, deduplication hooks, timestamps, and quality metadata.
- Add MedGemma client boundary tests with mocked successful, low-confidence, and failed responses.
- Add handoff packet tests proving exact question, context, transcript snippets, session note excerpt, rule results, prior findings, and frame IDs are included.
- Add response schema tests for findings, extracted values, frame references, confidence, uncertainty, limitations, and `clinicianReviewRequired`.
- Add evidence persistence tests proving media/document findings stay separate from approved clinical facts.
- Add frontend tests for evidence display, uncertainty, and degraded media/provider states.

### Update Notes

- Exact MedGemma hosting remains deferred until implementation reaches this phase.

## Phase 8: Clinical Workspace Frontend

Objective: provide the clinician-facing ambient ANC workspace.  
Status: `not_started`  
Dependencies: Phases 3 through 7

### Subphases

| ID | Name | Status | Expected output |
| --- | --- | --- | --- |
| 8.1 | Patient and encounter navigation | `not_started` | Clinician can find patient, select pregnancy episode, and enter an encounter. |
| 8.2 | Encounter capture layout | `not_started` | Dense work-focused clinical layout for repeated use. |
| 8.3 | Live transcript panel | `not_started` | Speaker-labeled transcript with timestamps, confidence, and correction controls. |
| 8.4 | Session note editor | `not_started` | Editable clinician note with autosave/version behavior. |
| 8.5 | Progressive summary panel | `not_started` | Shows summary revisions and source references. |
| 8.6 | Highlight cards | `not_started` | Cards for risks, possible issues, uncertainty, contradictions, missing context, and memory. |
| 8.7 | Suggestions checklist | `not_started` | Suggestions can be done, skipped, or marked follow-up with result options and free text. |
| 8.8 | Rules panel | `not_started` | Deterministic rule hits separated from AI interpretation. |
| 8.9 | MedGemma evidence panel | `not_started` | Reviewable media/document evidence with limitations and confidence. |
| 8.10 | Approval/rejection UI | `not_started` | Clinician can approve, edit, reject, acknowledge, or mark uncertain. |
| 8.11 | Artifact history UI | `not_started` | Show AI revision history and what changed. |
| 8.12 | RBAC-aware affordances | `not_started` | Unauthorized actions are hidden or disabled and server-enforced. |

### Deliverables

- Usable clinical workspace for ambient ANC sessions.
- Clear separation of transcript, rules, Gemini outputs, MedGemma evidence, and clinician-approved facts.
- Responsive and scannable UI for clinical workflows.

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

- Frontend must stay operational when AI/STT/media providers fail.

## Phase 9: Approvals, Memory, FHIR, And Referral Outputs

Objective: convert clinician-reviewed outputs into approved memory, referral, teleconsult, and FHIR artifacts.  
Status: `not_started`  
Dependencies: Phase 8

### Subphases

| ID | Name | Status | Expected output |
| --- | --- | --- | --- |
| 9.1 | Generated output review model | `not_started` | `GeneratedOutput` and review states for notes, summaries, and FHIR draft inputs. |
| 9.2 | Approval/edit/reject APIs | `not_started` | Approve, edit, reject, mark uncertain, and acknowledge endpoints. |
| 9.3 | Clinician edit provenance | `not_started` | Edited AI output becomes canonical approved content with provenance. |
| 9.4 | Durable memory writeback | `not_started` | `PatientMemoryFact` creation only after clinician approval. |
| 9.5 | Memory deduplication | `not_started` | Repeated synthesis does not duplicate approved facts. |
| 9.6 | Referral summary output | `not_started` | Approved referral-ready summary generation and review. |
| 9.7 | Teleconsult summary output | `not_started` | Approved teleconsult summary generation and review. |
| 9.8 | FHIR R4 formatter | `not_started` | Export-ready FHIR resources and composition where sufficient data exists. |
| 9.9 | FHIR provenance | `not_started` | Clinician approval, timestamp, source artifact, and generation provenance. |
| 9.10 | Rejection audit behavior | `not_started` | Rejected content retained for audit but excluded from export and memory. |

### Deliverables

- Review and approval workflow.
- Patient memory writeback.
- Referral and teleconsult summaries.
- FHIR R4 export artifacts.

### Acceptance Checks

- Only authorized clinicians can approve outputs.
- Approved edited text becomes export and memory source.
- Rejected AI outputs are not exported or written to memory.
- FHIR export includes clinician approval provenance.

### Test Plan

- Add API tests for approve, edit, reject, mark uncertain, and acknowledge endpoints with allowed and denied roles.
- Add provenance tests proving clinician edits become canonical approved content.
- Add memory writeback tests for approval-only writes, deduplication, patient/pregnancy scoping, and rejected-output exclusion.
- Add referral and teleconsult summary tests for approved-source-only generation.
- Add FHIR formatter tests for expected R4 resources, missing-data handling, and approval provenance.
- Add audit tests for approval, edit, rejection, memory write, and FHIR export events.
- Add E2E tests for clinician-edited summary becoming the export source.

### Update Notes

- Live SATUSEHAT/external FHIR submission remains out of scope.

## Phase 10: CI And Hosted Runtime Preparation

Objective: prepare the project for hosted runtime and automated validation without recreating full deployment docs prematurely.  
Status: `not_started`  
Dependencies: Phases 1 through 9

### Subphases

| ID | Name | Status | Expected output |
| --- | --- | --- | --- |
| 10.1 | CI workflow | `not_started` | GitHub Actions CI for install, format, lint, typecheck, tests, build, E2E, Compose config/build. |
| 10.2 | Dockerfiles | `not_started` | Production Dockerfiles for API, web, and optional worker. |
| 10.3 | Docker Compose remote config | `not_started` | Compose services for postgres, api, web, caddy, and optional worker. |
| 10.4 | Runtime env examples | `not_started` | Production env examples without secrets, including Vertex AI `global` config. |
| 10.5 | VM script contracts | `not_started` | Bootstrap/preflight/deploy/rollback script interfaces. |
| 10.6 | Caddy/domain assumptions | `not_started` | `matriacare.site` and `api.matriacare.site` assumptions wired into runtime examples. |
| 10.7 | Smoke check scripts | `not_started` | Health, ready, and web route checks. |
| 10.8 | Deployment docs trigger | `not_started` | Recreate deployment/environment docs only once implementation reaches hosted deployment work. |

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

| ID | Name | Status | Expected output |
| --- | --- | --- | --- |
| 11.1 | PRD E2E scenario suite | `not_started` | Playwright scenarios covering ambient ANC workflow and approval paths. |
| 11.2 | AI failure modes | `not_started` | Gemini/MedGemma failures leave transcript, rules, notes, and manual data usable. |
| 11.3 | STT failure modes | `not_started` | Google STT failure permits manual note and structured observation workflow. |
| 11.4 | RBAC denial cases | `not_started` | Unauthorized roles cannot approve/export/administer. |
| 11.5 | Cross-patient memory tests | `not_started` | Memory retrieval and writes never leak across patient or pregnancy episode. |
| 11.6 | Clinical safety cases | `not_started` | Severe BP, bleeding, fetal movement, missing gestational age, and low-confidence OCR cases. |
| 11.7 | UI usability and accessibility pass | `not_started` | Clinical workspace remains scannable, responsive, and keyboard/screen-reader reasonable. |
| 11.8 | Demo data and fixtures | `not_started` | Synthetic ANC scenarios for routine and high-risk workflows. |
| 11.9 | Performance and provider-cost observation | `not_started` | Basic timings and provider-call visibility by session/tool type. |
| 11.10 | Release readiness review | `not_started` | Final checklist of docs, tests, known gaps, and deferred decisions. |

### Deliverables

- End-to-end validation suite.
- Clinical safety regression tests.
- Demo data for routine and high-risk ANC flows.
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
