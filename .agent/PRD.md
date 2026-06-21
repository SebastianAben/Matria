# Matria Technical PRD

Document status: Draft for implementation  
Created: 2026-06-09  
Updated: 2026-06-22  
Primary timezone: Asia/Jakarta  
Scope type: hospital-ready product and AI architecture contract

## 1. Product Summary

Matria is a hospital-ready ambient antenatal care copilot for maternal risk detection, structured clinical documentation, and referral preparation. It supports clinicians during ANC encounters by passively listening to consented consultation conversations, converting the conversation into a two-person transcript, combining the live transcript with structured ANC data and clinical media, and continuously updating clinician-facing outputs as the consultation progresses.

The core experience is ambient intelligence: the system listens in the background while the clinician continues the encounter. It periodically updates a progressive consultation summary, highlight cards, actionable suggestions, editable ANC notes, missing-question prompts, red-flag synthesis, teleconsult/referral drafts, patient-scoped memory candidates, and FHIR R4 export drafts. The clinician can edit a session note during the visit, and that session note is always included in the LLM context for subsequent AI updates.

Matria is decision support only. It must not diagnose, prescribe, autonomously triage, or replace qualified clinicians. AI-generated summaries, notes, suggestions, media findings, durable patient memory writes, and FHIR exports remain drafts until an authorized clinician reviews, edits, approves, or rejects them.

The first hospital-ready release targets a single-hospital deployment:

- Backend API: Express.js, Node.js, TypeScript.
- Database: self-hosted PostgreSQL with pgvector.
- Web frontend: Next.js, TypeScript.
- Speech transcription: Google Cloud Speech-to-Text.
- AI orchestration: Gemini 3.1 Pro Preview as stateful session orchestrator and planner.
- Lightweight diarization post-processing for future multilingual support: `gemini-flash-lite-latest`.
- Medical image/text evidence: MedGemma 4B/MedGemma 1.5 4B as a clinical evidence tool.
- Deployment: one VM with Docker Compose, Caddy reverse proxy/TLS, GitHub Actions CI/CD.
- Production domains: `matriacare.site` for web and `api.matriacare.site` for API.
- Tests: Vitest for backend and Playwright for end-to-end workflows.

## 2. Source Baseline and External References

This PRD is grounded in:

- `PH_BandungInstitutofTechnology_AgenticVibing_Roadmap.pdf`.
- `Public Health and Telemedicine_Bandung Institute of Technology_Agentic Vibing_AI_Report.pdf`.
- Google Cloud Speech-to-Text diarization documentation: https://docs.cloud.google.com/speech-to-text/docs/multiple-voices.
- Google Cloud Speech-to-Text supported language/model table: https://docs.cloud.google.com/speech-to-text/docs/speech-to-text-supported-languages.
- Gemini 3.1 Pro Preview model documentation: https://ai.google.dev/gemini-api/docs/models/gemini-3.1-pro-preview.
- Gemini/Vertex AI global endpoint documentation: https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/locations.
- Gemini/Vertex AI quickstart and authentication documentation: https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/start.
- MedGemma 1.5 model card: https://developers.google.com/health-ai-developer-foundations/medgemma/model-card.

Implementation must re-check provider model names, regional availability, quotas, privacy terms, and deprecation notices before production rollout because preview model and cloud API behavior can change.

## 3. Goals, Success Metrics, and Non-goals

### 3.1 Primary Goals

- Support a full ANC encounter workflow from patient setup to clinician-reviewed output.
- Provide ambient clinical intelligence that passively listens and progressively updates useful outputs without interrupting the consultation.
- Improve consistency of maternal risk screening by combining structured data, advisory deterministic rules, patient-scoped memory, and LLM synthesis.
- Identify missing, uncertain, contradictory, or clinically important information early enough for the clinician to ask follow-up questions during the visit.
- Keep all clinical decisions under clinician control.
- Provide auditable patient memory scoped by patient and pregnancy episode.
- Produce referral-ready summaries and FHIR R4 export artifacts after clinician approval.
- Support low-resource and primary-care settings by handling noisy audio, incomplete records, variable ultrasound quality, and fragmented ANC information.
- Run reliably in a single-hospital production environment with rollbackable VM deployment.

### 3.2 Success Metrics

- Clinicians can run an ambient ANC session with consented audio, live transcript updates, manual session notes, vitals, uploaded lab/record photos, and ultrasound frame/video inputs.
- The consultation summary visibly progresses as more transcript turns, observations, notes, and media findings arrive.
- Highlight cards identify important risks, possible issues, uncertainty, missing context, contradictions, and relevant patient-memory findings.
- Suggestions are actionable, can be marked done/skipped/needs follow-up, and support structured result options plus optional free-text result notes.
- Native Google STT diarization is used for supported English-centered model/region combinations, and the transcript can be corrected by clinical staff.
- Deterministic maternal rules surface critical findings without unnecessarily blocking LLM reasoning.
- Hard safety blocks are narrow, auditable, and limited to consent, scope, authorization, unsafe write/export, and unacknowledged critical safety warnings.
- Gemini-generated UI patches preserve rule hits, uncertainty, source evidence, and clinician authority.
- MedGemma analysis runs periodically on active ultrasound/video frame samples every 5-10 seconds where feasible and returns evidence for clinician review.
- No durable memory write or FHIR export occurs without clinician approval.
- RBAC prevents unauthorized users from viewing, editing, approving, exporting, or administering patient data.
- Audit logs record sensitive access, audio processing, diarization, model/tool calls, rule evaluations, suggestions, approvals, edits, exports, and rejected AI outputs.
- Production deploy can validate readiness and roll back to the previous release after failed smoke checks.

### 3.3 Non-goals for First Hospital-ready Release

- No autonomous diagnosis, prescribing, final triage, or escalation decision.
- No model training or fine-tuning on patient data.
- No multi-hospital or multi-tenant organization model.
- No live SATUSEHAT or external FHIR server synchronization.
- No patient-facing mobile app.
- No public unauthenticated access.
- No direct database access from frontend clients.
- No use of AI outputs in clinical records without clinician approval.
- No guarantee that ultrasound media analysis detects all abnormalities.
- No claim that MedGemma output is clinically validated for standalone use.
- No unreviewed text-to-speech patient advice.

## 4. Confirmed Decisions

- Matria targets a single hospital first.
- Patient data must not be used for model training.
- Access control uses full RBAC, not only coarse clinician/admin roles.
- All ANC encounter inputs are in scope: consented audio, live transcript, manual vitals, lab or maternal record photos, ultrasound frames or clips, clinician session notes, structured observations, and clinician decisions.
- Google Cloud Speech-to-Text is the primary ASR provider.
- First release prioritizes English-centered consultation support.
- Native Google STT diarization is the primary two-speaker transcription strategy where the selected language, model, and region support it.
- Future ASEAN multilingual support may use raw Google STT transcript output plus a crafted diarization/post-processing layer using `gemini-flash-lite-latest`.
- Gemini 3.1 Pro Preview is the primary session orchestrator.
- Gemini must be accessed through Google Cloud Vertex AI / Gemini Enterprise Agent Platform using the configured GCP project, not through a standalone Gemini API key.
- The Gemini/Vertex AI location for the first production release is `global`.
- Gemini must operate from context snapshots and structured outputs; it is not the real-time audio transport.
- MedGemma 4B/MedGemma 1.5 4B is used as a medical multimodal evidence tool.
- Deterministic maternal safety rules are an advisory safety envelope, not the main reasoning engine.
- Rule hits, missing fields, and uncertainty must be preserved in AI outputs.
- FHIR scope is export-ready FHIR R4 artifacts, not live integration.
- Hosted production uses one VM with Docker Compose and Caddy.
- Production web domain is `matriacare.site`; production API domain is `api.matriacare.site`.
- PostgreSQL is self-hosted and pgvector is enabled for embeddings and scoped memory retrieval.

## 5. Users and Roles

Matria uses full RBAC. The implementation must support configurable role definitions and permissions without hard-coding only two roles.

Core role profiles:

- `clinician`: creates ANC encounters, runs ambient sessions, reviews AI outputs, edits notes, resolves suggestions, approves or rejects summaries.
- `obgyn_specialist`: reviews escalated cases, teleconsult summaries, media evidence, and referral summaries.
- `nurse_midwife`: captures intake, consent, vitals, files, session context, and draft encounter data.
- `lab_staff`: uploads and verifies lab-related files and extracted values.
- `radiology_sonographer`: uploads ultrasound media, validates frame/video metadata, and can mark media quality issues.
- `hospital_admin`: manages users, roles, facilities, departments, and configuration.
- `auditor`: reads audit logs and compliance reports without mutating clinical content.
- `it_operator`: manages deployment configuration and operational health without clinical approval authority.

Permissions must be explicit for patient read, encounter write, ambient session start/stop, audio processing, transcript correction, file upload, AI synthesis request, suggestion resolution, output approval, FHIR export, user administration, audit access, and system configuration.

## 6. Hospital Workflows

### 6.1 Patient and Pregnancy Setup

1. Authorized staff registers or finds a patient.
2. Staff creates or selects the active pregnancy episode.
3. System scopes all encounter data, files, transcript turns, session notes, memory retrieval, and memory writes by patient and pregnancy episode.
4. System records consent status before audio, transcript, uploaded media, MedGemma, or LLM processing.
5. System records visit type, facility, responsible clinician, and relevant care pathway such as routine ANC, same-day teleconsultation, referral preparation, or follow-up.

### 6.2 Ambient ANC Session

1. Staff starts an ANC encounter and, after consent, starts the ambient session.
2. Browser/client streams or uploads audio to the backend audio pipeline.
3. Google STT produces timestamped transcript events.
4. Speaker diarization converts transcript events into two-person conversation turns where supported.
5. Transcript turns are normalized into clinical candidate facts, symptoms, history, medication references, gestational-age statements, danger signs, clinician plans, and unresolved questions.
6. Staff enters or updates vital signs, labs, history, and manual observations.
7. Clinician edits the session note during the visit; the note is preserved as explicit clinician-authored context.
8. Staff uploads lab photos, maternal record photos, ultrasound frames, or ultrasound clips.
9. MedGemma receives frame samples and current context when media is active.
10. Gemini receives periodic context snapshots and returns structured UI patches for summary, highlights, suggestions, missing questions, and note/referral drafts.

### 6.3 Clinician Review During the Encounter

1. The dashboard shows live transcript turns with speaker labels, confidence, and correction affordances.
2. The dashboard shows deterministic rule hits separately from AI interpretation.
3. The progressive consultation summary updates as the encounter evolves.
4. Highlight cards surface high-signal findings, possible issues, contradictions, missing context, uncertain data, and relevant memory.
5. Suggestions appear as actionable tasks that can be marked done, skipped, or needing follow-up.
6. Suggestions can include result options and an optional free-text input for clinician notes.
7. The clinician can edit the session note and generated draft note content at any time.
8. Subsequent LLM context must include the latest clinician edits and suggestion states.

### 6.4 Encounter Closeout

1. Clinician reviews the latest summary, structured note, rule results, suggestions, MedGemma evidence, and referral/teleconsult drafts.
2. Clinician approves, edits, rejects, or marks AI artifacts as uncertain.
3. Only approved or clinician-edited content can become durable patient memory.
4. Only approved content can be used for FHIR export artifacts.
5. Rejected content remains audit-visible but must not be exported or written to durable memory.

## 7. Ambient Intelligence Session Model

### 7.1 Core Principle

The ambient intelligence layer is stateful. It must not treat every AI call as an isolated prompt. Each synthesis tick must be based on a versioned context snapshot that includes the current session state, recent transcript turns, clinician-authored session note, structured observations, relevant patient memory, rule results, MedGemma findings, prior AI artifact revisions, and suggestion resolution state.

### 7.2 Session Lifecycle

An ambient session moves through these states:

- `initialized`: encounter exists; patient and pregnancy episode scope are resolved.
- `consent_pending`: session exists but audio/media processing cannot start.
- `listening`: audio capture is active and STT events may arrive.
- `transcribing`: Google STT is producing transcript events.
- `diarizing`: speaker labels and two-person turns are being created or revised.
- `normalizing`: transcript and manual inputs are converted into structured ANC candidates.
- `preflight_running`: advisory rules evaluate red flags, missing fields, contradictions, and required acknowledgements.
- `synthesizing`: Gemini receives a context snapshot and returns structured UI patches.
- `media_analyzing`: MedGemma receives frame/image samples plus context and returns evidence.
- `reviewing`: clinician reviews AI artifacts and rule outputs.
- `closed`: session has stopped listening and no further automatic synthesis ticks run.
- `approved`: clinician-approved outputs are ready for memory write or export.
- `archived`: session is retained for audit and longitudinal patient context.

### 7.3 Stateful Objects

The session state must include:

- `AmbientSessionState`: session lifecycle, patient scope, pregnancy scope, consent, active providers, last synthesis tick, and current state version.
- `TranscriptTurn`: diarized speaker turn with timestamp range, text, confidence, speaker role guess, correction status, source audio segment, and language.
- `SessionNote`: editable clinician note with current content, author, timestamps, version, and explicit inclusion in LLM context.
- `StructuredObservation`: vitals, labs, symptoms, history, medication, allergies, gestational age, ultrasound metadata, and extracted clinical facts.
- `RuleResult`: advisory or blocking rule output with severity, evidence, source field, confidence, action type, blocking level, and acknowledgement status.
- `SummaryRevision`: progressive consultation summary version with sources and superseded revision pointer.
- `HighlightCard`: important finding, possible issue, missing context, contradiction, uncertainty, or relevant memory item.
- `Suggestion`: actionable recommendation for medical personnel with status, priority, source evidence, result options, optional free-text result note, and completion metadata.
- `SuggestionResult`: selected result option, optional clinician text, actor, timestamp, and downstream context impact.
- `MedGemmaFrameSample`: sampled frame/video metadata, source media, timestamp, sampling reason, quality metadata, and processing status.
- `MedGemmaHandoff`: Gemini-to-MedGemma task packet with exact question, context, frames, prior findings, and expected output schema.
- `AiArtifactRevision`: versioned AI patch or draft output, including source context snapshot, model/tool, validation status, and clinician review status.
- `ContextSnapshot`: immutable record of what was sent to Gemini or MedGemma.
- `PatientMemoryFact`: approved scoped memory fact with provenance.
- `ClinicalApproval`: approval, edit, rejection, uncertainty marking, or acknowledgement.

### 7.4 Progressive Context Engineering

Gemini context must be assembled by a context builder, not ad hoc prompt concatenation. Each context snapshot must include:

- Patient profile and pregnancy episode identifiers.
- Encounter metadata and current lifecycle state.
- Consent and allowed processing modes.
- Latest structured observations and their verification state.
- Rolling transcript window, prioritizing recent turns and clinically important earlier turns.
- Full current clinician session note or a lossless note summary plus latest edits when the note grows too large.
- Active rule hits, missing fields, contradictions, and acknowledgement requirements.
- Active unresolved suggestions and completed suggestion results.
- Current progressive summary and prior artifact revisions.
- MedGemma findings and referenced frame/sample IDs.
- Relevant patient-scoped memory retrieved by patient and pregnancy episode.
- Uploaded media references and OCR/document extraction outputs.
- Explicit safety posture and output schema.

Long context should be used intentionally. The implementation should prefer maximum clinically relevant context, while also maintaining compact, versioned summaries of older low-signal transcript segments to keep prompts stable and auditable.

### 7.5 Update Cadence

- Transcript events should stream as near-real-time UI updates when technically available.
- Diarized transcript turns may revise prior turns as speaker labels improve.
- Rule evaluation should run after new structured observations, clinically important transcript extractions, or clinician note edits.
- Gemini synthesis ticks should run periodically and on meaningful events, with debouncing to avoid excessive model calls.
- MedGemma should receive ultrasound/video frame samples every 5-10 seconds while media analysis is active and system capacity allows.
- Manual clinician edits must take precedence in the next context snapshot.

## 8. Audio, STT, and Diarization Architecture

### 8.1 Google STT Primary Provider

Google Cloud Speech-to-Text is the primary ASR provider. It must be configured per deployment with explicit language code, model, region, diarization capability, automatic punctuation, word-level timing, confidence where available, and audit logging.

The first release prioritizes English-centered consultations. Implementation may use English language/model combinations with native Google STT diarization where the selected region and model support it. Google documentation states that diarization labels different speakers in audio and requires expected speaker counts; for Matria, the expected speaker count is two by default.

### 8.2 Two-person Conversation Contract

Every consultation transcript presented to Gemini must be converted into `TranscriptTurn` objects:

- `transcriptTurnId`
- `ambientSessionId`
- `speakerLabel`
- `speakerRoleGuess`: `clinician`, `patient`, `companion`, `unknown`
- `roleConfidence`
- `startTimeMs`
- `endTimeMs`
- `text`
- `languageCode`
- `sttConfidence`
- `diarizationConfidence`
- `correctionStatus`: `raw`, `auto_diarized`, `clinician_corrected`, `system_revised`
- `sourceAudioSegmentId`
- `createdAt`
- `updatedAt`

The role guess must be editable. Clinician correction becomes higher-priority context than automated speaker labeling.

### 8.3 Future ASEAN Multilingual Diarization

ASEAN multilingual support is planned as a provider-aware post-processing layer. When native Google STT diarization is unavailable or unreliable for a chosen language/model/region, the system may:

1. Receive raw timestamped transcript segments from Google STT.
2. Use `gemini-flash-lite-latest` with a crafted diarization prompt to infer two-speaker turns from raw transcript text, timing, clinical role cues, and conversation structure.
3. Mark the result as AI-inferred diarization, not provider-native diarization.
4. Require visible confidence and correction workflow in the UI.

This layer must not invent clinical statements. It may split, merge, and label turns, but it must preserve original text and source segment references.

### 8.4 Audio Safety and Privacy

- Audio capture requires explicit consent before processing.
- Audio processing must stop when the ambient session is stopped.
- Raw audio retention must be configurable by hospital policy.
- Logs must minimize patient identifiers and avoid raw transcript content unless required for an audited clinical record.
- Audio, transcript, and speaker corrections are sensitive clinical data.

## 9. AI Agent Architecture

### 9.1 Gemini Provider and Runtime Configuration

Gemini must run through Google Cloud Vertex AI / Gemini Enterprise Agent Platform using the hospital deployment's configured GCP project. The production runtime must use:

- provider mode: `vertex_ai`
- primary model: `gemini-3.1-pro-preview`
- lightweight diarization helper model: `gemini-flash-lite-latest`
- Google Cloud project: provided by deployment configuration, not hard-coded
- Google Cloud location: `global`
- authentication: VM runtime service account credentials or a GitHub-rendered service account credential file with minimum required IAM

The app configuration must expose stable internal variables even if Google SDK environment names change:

- `GEMINI_PROVIDER=vertex_ai`
- `GEMINI_PRIMARY_MODEL=gemini-3.1-pro-preview`
- `GEMINI_DIARIZATION_MODEL=gemini-flash-lite-latest`
- `GOOGLE_CLOUD_PROJECT=<gcp-project-id>`
- `GOOGLE_CLOUD_LOCATION=global`

When using the Google Gen AI SDK, the implementation may map these to the current SDK-required environment variables or explicit client constructor options. Do not use Google AI Studio API keys for production Gemini calls.

### 9.2 Gemini 3.1 Pro Primary Agent

Gemini 3.1 Pro Preview is the primary session orchestrator, planner, synthesis coordinator, and clinician-facing writer. It must be treated as a stateful orchestration agent operating over versioned context snapshots, not as a one-shot summarizer.

Gemini responsibilities:

- Interpret the current session state and decide what UI artifacts should update.
- Generate progressive consultation summary patches.
- Generate highlight cards for risks, possible issues, uncertainty, contradictions, missing context, and relevant memory.
- Generate actionable suggestions for medical personnel.
- Generate missing-question prompts.
- Draft structured ANC notes, teleconsult summaries, referral-ready summaries, and FHIR-ready narrative content.
- Decide when to request MedGemma analysis and prepare MedGemma handoff packets.
- Compare MedGemma results with transcript, session note, structured observations, patient memory, and rules.
- Preserve deterministic rule hits and uncertainty.
- Ask for clinician confirmation when context is weak, contradictory, or high-impact.

Gemini must not:

- Diagnose, prescribe, or make final triage decisions.
- Hide or downgrade deterministic safety rule hits.
- Convert unverified OCR, ASR, or MedGemma findings into approved facts.
- Write durable memory or export FHIR without clinician approval.
- Produce unstructured free text when a validated JSON patch is required.

### 9.3 Gemini Context Inputs

Gemini must receive maximum relevant clinical context:

- Patient profile and pregnancy episode.
- Encounter and facility context.
- Live diarized transcript turns.
- Current clinician session note.
- Manual vitals, symptoms, history, medications, allergies, labs, and gestational-age data.
- Uploaded lab/maternal record photos and extracted OCR/document values.
- Ultrasound image/video references and sampled frame metadata.
- MedGemma findings.
- Rule results and missing-field checks.
- Patient-scoped memory retrieval.
- Prior AI artifact revisions.
- Current suggestion statuses and results.
- Clinician edits and approvals.
- Safety posture and exact output schema.

### 9.4 Structured Gemini Outputs

Gemini must return validated JSON patches. Supported patch targets:

- `summary_update`
- `highlight_cards`
- `suggestions`
- `missing_questions`
- `session_note_draft_sections`
- `anc_note_draft`
- `teleconsult_summary_draft`
- `referral_summary_draft`
- `fhir_export_draft_inputs`
- `medgemma_handoff_request`
- `requires_human_review`

Each patch must include:

- `artifactType`
- `operation`: `create`, `update`, `replace`, `archive`, `no_change`
- `artifactId` when updating an existing artifact
- `content`
- `sourceReferences`
- `confidence`
- `uncertaintyReasons`
- `ruleResultReferences`
- `memoryReferences`
- `medGemmaReferences`
- `clinicianActionRequired`

### 9.5 Tool Router

The backend tool router exposes controlled tools to Gemini:

- patient-scoped memory retriever
- MedGemma handoff executor
- OCR/document extraction utility
- rule result retriever
- FHIR formatter
- audit logger
- optional text-to-speech for clinician-approved patient instructions

Tools must enforce RBAC, patient scope, pregnancy scope, consent, and audit logging. Gemini cannot bypass backend authorization.

## 10. MedGemma Clinical Evidence Architecture

### 10.1 Role and Limits

MedGemma 4B/MedGemma 1.5 4B is a medical multimodal evidence tool for image-grounded and document-grounded support. It can help extract visible lab values, summarize clinical media, review ultrasound frame adequacy for clinician review, identify visible non-standard findings for attention, and process medical document content.

MedGemma output is evidence, not a diagnosis. It must always be labeled as requiring clinician review. The implementation must not present MedGemma output as independently authoritative or clinically validated for final decisions.

### 10.2 Periodic Frame Sampling

When ultrasound video or active media capture is enabled:

- The media sampler should extract frames every 5-10 seconds, subject to client capability, network constraints, and system load.
- The sampler should prioritize nonduplicate, focused, nonblurred, and clinically useful frames where possible.
- Each frame sample must preserve timestamp, media source, frame hash, quality metadata, and processing state.
- MedGemma receives the frame sample plus current consultation context so analysis is progressive and stateful.
- Prior MedGemma findings for the same media session should be included to reduce repetition and support longitudinal interpretation.

### 10.3 Gemini-to-MedGemma Handoff

Gemini may request a MedGemma handoff when an image-grounded question matters. A handoff packet must include:

- `handoffId`
- `ambientSessionId`
- `requestingArtifactId`
- `taskType`: `lab_value_extraction`, `document_extraction`, `ultrasound_frame_adequacy`, `visible_finding_description`, `media_summary`, `other`
- `exactQuestion`
- `clinicalContext`
- `relevantTranscriptSnippets`
- `sessionNoteExcerpt`
- `structuredObservations`
- `ruleResults`
- `priorMedGemmaFindings`
- `frameSampleIds` or `clinicalFileIds`
- `expectedOutputSchema`
- `safetyInstructions`

MedGemma response must include:

- `handoffId`
- `taskType`
- `findings`
- `extractedValues`
- `frameReferences`
- `sourceEvidence`
- `confidence`
- `uncertaintyReasons`
- `qualityLimitations`
- `clinicianReviewRequired: true`

Gemini must inspect MedGemma output before writing clinician-facing synthesis and must preserve source references and uncertainty.

## 11. Rule-based Safety Envelope

### 11.1 Design Posture

Rules are an advisory safety envelope. They create a safe, auditable input envelope for the LLM, but they must not become a rigid checklist that blocks useful AI support in routine situations. The rule engine should surface maternal safety issues, missing fields, contradictions, and acknowledgement requirements while allowing Gemini to continue summarizing what is known and asking for what is missing.

### 11.2 Rule Outputs

Every `RuleResult` must include:

- rule ID and version
- severity: `info`, `watch`, `warning`, `critical`
- blocking level: `none`, `soft`, `ack_required`, `hard`
- evidence and source field/turn/file
- threshold or logic explanation
- confidence and uncertainty
- suggested clinician action
- acknowledgement requirement
- status: `active`, `acknowledged`, `resolved`, `overridden`, `superseded`

### 11.3 Blocking Policy

Hard blocks are allowed only for:

- missing consent for audio, media, transcript, or AI processing
- unresolved patient or pregnancy episode scope
- unauthorized user or missing permission
- unsafe durable memory write
- unsafe FHIR export
- unacknowledged critical safety warning when the requested action would hide, dismiss, export, or finalize the encounter

Soft or acknowledgement-based outputs should be used for:

- missing gestational age
- missing lab value
- low-confidence OCR
- uncertain speaker attribution
- contradictory transcript and manual note
- incomplete history
- noncritical missing questions
- media quality limitations

Missing data should usually generate a suggestion, missing-question prompt, highlight, or uncertainty marker rather than blocking all Gemini synthesis.

### 11.4 Maternal Safety Rule Families

The first rule set should include:

- severe hypertension and blood pressure trend concerns
- bleeding
- reduced or absent fetal movement statements
- anemia indicators
- infection signs
- abnormal urine protein/glucose when available
- high-risk obstetric history
- gestational-age missingness or inconsistency
- danger symptom mentions in transcript or session note
- low-confidence or contradictory clinical evidence
- referral/escalation acknowledgement requirements

Rules must be versioned YAML/JSON or database-backed configuration with tests. The PRD does not lock exact clinical thresholds; those require clinician validation and local guideline review before production use.

## 12. Functional Requirements

### 12.1 Backend API

- Provide health and readiness endpoints at `/health` and `/ready`.
- Implement RBAC middleware and permission checks for every protected route.
- Store patients, pregnancy episodes, encounters, consent records, ambient sessions, transcript turns, session notes, files, structured observations, rule results, AI tool calls, context snapshots, generated outputs, artifact revisions, suggestions, approvals, FHIR exports, and audit logs.
- Enforce patient and pregnancy episode scoping on retrieval, context building, memory writes, and exports.
- Run advisory red-flag, mandatory-field, contradiction, and uncertainty checks before and during AI synthesis.
- Persist AI outputs as drafts until approved, edited, rejected, or marked uncertain.
- Persist immutable audit events for sensitive actions.
- Provide FHIR R4 export generation after clinician approval.
- Never expose raw database credentials to frontend clients.
- Debounce synthesis ticks and prevent duplicate concurrent AI jobs for the same session version.
- Preserve context snapshots for auditability and reproducibility.

### 12.2 Web Frontend

- Provide authenticated clinical workspace routes for ambient encounter capture and review.
- Provide admin routes for users, roles, permissions, and system configuration.
- Provide audit views for authorized auditors.
- Show a live transcript panel with speaker labels, timestamps, confidence, and correction workflow.
- Show a progressive consultation summary panel.
- Show highlight cards for key findings, possible issues, uncertainty, missing context, contradictions, and relevant memory.
- Show suggestions as a checklist with status, result options, optional free-text note, priority, and evidence.
- Provide a session note editor and make clear that the session note is included in AI context.
- Show deterministic rule hits separately from Gemini synthesis and MedGemma evidence.
- Make missing fields and uncertainty visible before approval.
- Show artifact history/versioning so clinicians can see what changed.
- Require explicit clinician action for approve, edit, reject, acknowledge, or mark uncertain.
- Prevent UI affordances for unauthorized actions based on RBAC.
- Avoid marketing-style layouts; clinical screens must be dense, scannable, and work-focused.

### 12.3 AI and Tooling

- Gemini 3.1 Pro Preview acts as main session orchestrator, planner, and synthesis coordinator.
- Gemini receives context snapshots and returns validated structured JSON patches.
- MedGemma is used for clinical text-image evidence over lab records, maternal records, and ultrasound media where appropriate.
- MedGemma receives current consultation context for periodic and handoff-based analysis.
- AI prompts must include the safety posture: decision support only, no diagnosis, no prescription, no final triage, preserve uncertainty, preserve deterministic rule hits.
- AI outputs must be structured and validated before display.
- Tool calls and model outputs must be audited.
- Patient memory retriever and writer must operate only within patient and pregnancy episode scope.
- Memory writes require clinician approval.
- AI failure must never erase transcript, manual notes, rule results, or clinician-entered data.

### 12.4 Optional Text-to-Speech

- TTS may be used only for clinician-approved patient instructions, safety reminders, or follow-up explanations.
- TTS output must not be generated as unreviewed medical advice.
- TTS generation and playback must be auditable if tied to patient care.

### 12.5 FHIR Export

- Generate FHIR R4-compatible export artifacts for approved referral or teleconsult summaries.
- Represent encounter summary, observations, service request, composition, relevant patient context, and provenance where sufficient data exists.
- Include provenance showing clinician approval and generation timestamp.
- Do not perform live external submission in the first release.

## 13. Domain Model

Required entities:

- `User`: identity, status, authentication metadata.
- `Role`: role name and description.
- `Permission`: action-level capability.
- `UserRole`: mapping of users to roles.
- `Patient`: hospital-scoped patient record.
- `PregnancyEpisode`: active or historical pregnancy context.
- `Encounter`: ANC visit and lifecycle state.
- `ConsentRecord`: consent type, status, actor, timestamp, and allowed processing mode.
- `AmbientSessionState`: live session lifecycle, provider state, current version, and timing.
- `TranscriptTurn`: diarized speaker turn with timing, confidence, speaker role guess, correction status, and source audio reference.
- `SessionNote`: clinician-editable note included in LLM context.
- `ClinicalFile`: uploaded audio, image, document, or ultrasound media metadata.
- `StructuredObservation`: normalized vitals, labs, symptoms, history, measurements, and extracted clinical facts.
- `RuleResult`: deterministic rule evaluation, severity, evidence, blocking level, and acknowledgement state.
- `SummaryRevision`: progressive consultation summary version.
- `HighlightCard`: important finding, possible issue, missing context, contradiction, uncertainty, or memory card.
- `Suggestion`: actionable recommendation with state, evidence, result options, and review metadata.
- `SuggestionResult`: selected result, optional free-text note, actor, and timestamp.
- `MedGemmaFrameSample`: sampled media frame metadata and processing state.
- `MedGemmaHandoff`: Gemini-requested MedGemma task packet.
- `ContextSnapshot`: immutable prompt/tool context record.
- `AiToolCall`: model/tool invocation metadata and status.
- `AiArtifactRevision`: versioned AI patch or generated draft.
- `GeneratedOutput`: draft note, risk synthesis, missing questions, referral summary, teleconsult summary, or FHIR draft input.
- `ClinicalApproval`: approval, edit, rejection, uncertainty marking, acknowledgement, and approver metadata.
- `PatientMemoryFact`: approved scoped memory fact with provenance.
- `FhirExport`: generated FHIR artifact and export status.
- `AuditLog`: immutable security and clinical governance event.

## 14. API Contract Overview

API responses must be JSON and use stable error codes. Protected routes must require authentication and RBAC authorization.

Core route groups:

- `GET /health`
- `GET /ready`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/session`
- `GET /admin/users`
- `POST /admin/users`
- `GET /admin/roles`
- `POST /admin/roles`
- `POST /patients`
- `GET /patients/:patientId`
- `POST /patients/:patientId/pregnancy-episodes`
- `POST /encounters`
- `GET /encounters/:encounterId`
- `POST /encounters/:encounterId/ambient-sessions`
- `GET /ambient-sessions/:sessionId`
- `POST /ambient-sessions/:sessionId/start`
- `POST /ambient-sessions/:sessionId/stop`
- `POST /ambient-sessions/:sessionId/audio-events`
- `GET /ambient-sessions/:sessionId/transcript-turns`
- `POST /ambient-sessions/:sessionId/transcript-turns`
- `PATCH /transcript-turns/:turnId`
- `GET /ambient-sessions/:sessionId/session-note`
- `PUT /ambient-sessions/:sessionId/session-note`
- `POST /encounters/:encounterId/files`
- `POST /encounters/:encounterId/observations`
- `POST /encounters/:encounterId/preflight`
- `POST /ambient-sessions/:sessionId/synthesis-ticks`
- `POST /ambient-sessions/:sessionId/medgemma-frame-samples`
- `POST /ambient-sessions/:sessionId/medgemma-handoffs`
- `GET /ambient-sessions/:sessionId/artifacts`
- `GET /ambient-sessions/:sessionId/highlights`
- `GET /ambient-sessions/:sessionId/suggestions`
- `PATCH /suggestions/:suggestionId`
- `POST /suggestions/:suggestionId/results`
- `POST /outputs/:outputId/approve`
- `POST /outputs/:outputId/edit`
- `POST /outputs/:outputId/reject`
- `POST /outputs/:outputId/mark-uncertain`
- `POST /encounters/:encounterId/fhir-export`
- `GET /audit-logs`

## 15. Structured Data Contracts

### 15.1 Suggestion

```json
{
  "suggestionId": "string",
  "ambientSessionId": "string",
  "title": "string",
  "rationale": "string",
  "priority": "low | medium | high | urgent",
  "status": "open | done | skipped | needs_follow_up | superseded",
  "sourceReferences": ["TranscriptTurn:id", "RuleResult:id"],
  "resultOptions": [
    { "value": "asked_patient", "label": "Asked patient" },
    { "value": "not_applicable", "label": "Not applicable" }
  ],
  "freeTextAllowed": true,
  "clinicianActionRequired": true
}
```

### 15.2 Highlight Card

```json
{
  "highlightId": "string",
  "type": "risk | missing_context | contradiction | uncertainty | memory | media_evidence | follow_up",
  "severity": "info | watch | warning | critical",
  "title": "string",
  "body": "string",
  "sourceReferences": ["string"],
  "confidence": 0.0,
  "requiresAcknowledgement": false
}
```

### 15.3 Gemini UI Patch

```json
{
  "patchId": "string",
  "contextSnapshotId": "string",
  "artifactType": "summary_update | highlight_cards | suggestions | missing_questions | anc_note_draft | referral_summary_draft | medgemma_handoff_request",
  "operation": "create | update | replace | archive | no_change",
  "content": {},
  "sourceReferences": ["string"],
  "uncertaintyReasons": ["string"],
  "clinicianActionRequired": true
}
```

### 15.4 Rule Result

```json
{
  "ruleResultId": "string",
  "ruleId": "string",
  "ruleVersion": "string",
  "severity": "info | watch | warning | critical",
  "blockingLevel": "none | soft | ack_required | hard",
  "evidence": ["string"],
  "sourceReferences": ["string"],
  "suggestedAction": "string",
  "status": "active | acknowledged | resolved | overridden | superseded"
}
```

## 16. Security, Privacy, and Compliance Requirements

- Encrypt sensitive data in transit with TLS.
- Encrypt sensitive stored data where supported by deployment architecture.
- Store secrets only in environment variables or secret stores, never in repo files.
- Hash passwords with a modern password hashing algorithm.
- Use secure HTTP-only cookies or equivalent secure session handling.
- Apply rate limits to authentication and sensitive endpoints.
- Minimize patient identifiers in logs.
- Never send patient data to model training pipelines.
- Keep audit logs immutable from application-level users.
- Record consent before processing audio, transcript, uploaded clinical media, MedGemma calls, or Gemini calls.
- Provide least-privilege permissions for every role.
- Prevent cross-patient and cross-pregnancy memory leakage.
- Scope every memory query and write by patient ID and pregnancy episode ID.
- Avoid raw transcript or raw audio exposure outside authorized clinical workflows.
- Preserve clinician edits and approvals as provenance.

## 17. Non-functional Requirements

- Readiness checks must verify API dependencies, database connectivity, migration state, configured STT provider, and configured AI provider availability where practical.
- Ambient UI must remain usable if AI synthesis is delayed.
- Transcript capture and manual session note editing must remain usable when Gemini or MedGemma fails.
- The backend must handle repeated synthesis attempts without duplicating approved memory facts.
- The backend must prevent stale AI patches from overwriting newer clinician edits.
- The system must degrade clearly when AI providers fail: deterministic rule results remain visible and no fabricated summary is shown.
- Uploaded file handling must validate type, size, and malware scanning integration points.
- Ultrasound/video processing must handle poor quality, dropped frames, and network interruptions.
- Clinical output pages must prioritize dense, scannable, work-focused information.
- Provider latency and cost must be observable by session and by tool type.

## 18. Deployment Topology

Production runs on one VM:

- `caddy`: reverse proxy and TLS termination.
- `postgres`: self-hosted PostgreSQL with pgvector.
- `api`: Express.js backend.
- `web`: Next.js frontend.
- Optional worker process: background synthesis, STT event handling, MedGemma frame analysis, OCR/document extraction, and FHIR generation.

Production network and release layout:

- Web: `https://matriacare.site`.
- API: `https://api.matriacare.site`.
- VM base directory: `/opt/matria/hosted`.
- Release directories: `/opt/matria/hosted/releases/<sha>`.
- Current release symlink: `/opt/matria/hosted/current`.
- Current release marker: `/opt/matria/hosted/current_release`.
- Shared runtime env: `/opt/matria/hosted/shared/runtime.env`.
- Persistent PostgreSQL data: `/opt/matria/hosted/shared/postgres-data`.
- Caddy state: `/opt/matria/hosted/shared/caddy-data` and `/opt/matria/hosted/shared/caddy-config`.

GitHub Actions deploys by uploading a source release archive over SSH, rendering the shared runtime environment, running a VM preflight, building and starting containers with Docker Compose on the VM, smoke-checking production, and rolling back to the previous release when post-deploy validation fails. VM deploy scripts must not rerun unit, integration, typecheck, lint, or Playwright tests because those are CI responsibilities.

## 19. CI/CD Requirements

CI must run on pull requests and `main` branch pushes when application, deployment, or test code changes:

- install dependencies
- format check
- lint
- typecheck
- backend Vitest suite
- Playwright E2E suite
- production build
- Docker Compose config validation
- hosted image build

Security scans such as dependency review, CodeQL, secret scanning, and container/filesystem vulnerability scanning are not required for the first Matria CI/CD release.

Production deployment requirements:

- A separate `Deploy Production` workflow starts automatically after successful `CI` on `main`.
- The deploy workflow also supports manual dispatch with a `git_ref` input.
- Deploy concurrency is serialized so two production deployments cannot run at the same time.
- The workflow checks out the resolved release SHA, validates required deployment secrets, starts an SSH agent, configures pinned known hosts, prepares remote release/shared directories, captures the previous release, uploads a source archive, renders `/opt/matria/hosted/shared/runtime.env`, runs VM preflight, runs VM deploy, smoke-checks production, and rolls back to the previous release on failed validation.
- VM preflight may check Docker access, required directories, runtime env presence, DNS for `matriacare.site` and `api.matriacare.site`, and Compose configuration.
- VM deploy builds and starts Compose services; it does not rerun tests.
- Smoke checks must include `https://api.matriacare.site/health`, `https://api.matriacare.site/ready`, and `https://matriacare.site`.
- Readiness validation must verify database connectivity, migration state where available, and configured AI/STT provider status where practical.
- Runtime env must include Vertex AI/Gemini configuration with `GOOGLE_CLOUD_PROJECT` and `GOOGLE_CLOUD_LOCATION=global`.

## 20. Acceptance Criteria

### 20.1 Ambient Intelligence

- A consented two-person English-centered consultation can produce timestamped transcript turns with speaker labels.
- Clinician can correct transcript text and speaker roles.
- Progressive summary updates during the session as transcript turns, observations, session notes, and media findings arrive.
- Highlight cards and suggestions update progressively and preserve source references.
- Session note edits are included in the next Gemini context snapshot.
- AI artifact history shows what changed between revisions.

### 20.2 Backend

- RBAC protects all patient, encounter, ambient session, transcript, suggestion, approval, export, and admin routes.
- Advisory mandatory-field, red-flag, contradiction, and uncertainty rules run before and during AI synthesis.
- Hard blocks are limited to consent, scope, authorization, unsafe write/export, and unacknowledged critical safety warnings.
- AI outputs cannot be approved by unauthorized users.
- Approved facts are written to memory with patient and pregnancy episode scope.
- Rejected AI outputs are retained for audit but not exported or written to memory.
- FHIR R4 export is generated only from approved content.
- Context snapshots are persisted for AI calls.

### 20.3 Web

- Clinician can complete an ANC encounter with ambient transcript, vitals, file/media inputs, session note, summary, highlights, and suggestions.
- Clinician can see rule hits, missing fields, uncertainty, MedGemma evidence, and draft outputs.
- Clinician can mark suggestions done, skipped, or needing follow-up with result options and optional text.
- Clinician can approve, edit, reject, or mark generated outputs uncertain.
- Admin can manage users, roles, and permissions.
- Auditor can inspect audit logs without mutating clinical records.

### 20.4 Deployment

- `docker compose config` passes with production env example.
- API `/health` and `/ready` pass after deployment.
- Web clinical workspace route responds successfully.
- Failed production validation triggers rollback when a previous release exists.

## 21. Test Scenarios

- Two-person English consultation with native Google STT diarization updates the live transcript and progressive summary.
- Clinician corrects a speaker label and the next Gemini synthesis tick reflects the correction.
- Clinician edits the session note and the next Gemini tick incorporates the edit.
- Suggestion is marked done with a selected result and optional note, then reflected in summary context.
- Severe hypertension vital signs trigger a deterministic high-risk flag before AI synthesis and remain visible even if Gemini summary is uncertain.
- Missing gestational age creates a nonblocking prompt unless it is required for a specific export or finalization action.
- Lab photo OCR with low confidence is marked uncertain and requires clinician verification.
- MedGemma receives ultrasound frames every 5-10 seconds plus current consultation context.
- Gemini hands off a specific ultrasound question to MedGemma and incorporates the returned evidence with uncertainty.
- Ultrasound media evidence is referenced as review support, not autonomous diagnosis.
- Unauthorized nurse or lab role cannot approve final outputs.
- Clinician edits AI summary and approved edited text becomes the export source.
- Patient memory retrieval never returns facts from another patient or pregnancy episode.
- FHIR export includes clinician approval provenance.
- AI provider failure leaves transcript, rules, manual notes, and existing approved data usable.
- Google STT provider failure allows manual note and structured observation workflow to continue.
- Production readiness fails when database is unavailable.

## 22. Deferred Decisions

- Exact Google STT model/region/language configuration for the first hospital deployment.
- Exact ASEAN language rollout order and validation plan.
- Exact prompt and validation strategy for `gemini-flash-lite-latest` diarization post-processing.
- Exact OCR/document extraction provider.
- Exact MedGemma hosting strategy and hardware requirements.
- File object storage location for production uploads.
- Raw audio retention period.
- Hospital identity provider integration.
- SATUSEHAT or external FHIR server live submission.
- Backup retention period and disaster recovery RPO/RTO.
- Local clinical guideline thresholds and clinician-validated rule versions.
