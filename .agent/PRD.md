# Matria Technical PRD

Document status: Draft for implementation  
Created: 2026-06-09  
Primary timezone: Asia/Jakarta  
Scope type: hospital-ready product contract

## 1. Product Summary

Matria is a hospital-ready agentic antenatal care copilot for maternal risk detection, structured clinical documentation, and referral preparation. It supports clinicians during ANC encounters by capturing consented consultation audio, manual vital signs, lab or maternal record photos, ultrasound frames or short clips, and clinician notes. The system converts these inputs into structured ANC context, runs deterministic maternal safety rules before LLM synthesis, then uses Gemini 3.1 Pro and MedGemma-backed clinical evidence tooling to produce missing-question prompts, risk synthesis, editable ANC notes, and referral-ready summaries.

Matria is a decision-support system only. It does not diagnose, prescribe, triage autonomously, or replace qualified clinicians. AI-generated notes, risk summaries, durable patient memory writes, and FHIR exports are unusable until an authorized clinician approves, edits, or rejects them.

The target deployment is a single-hospital production installation:

- Backend API: Express.js, Node.js, TypeScript.
- Database: self-hosted PostgreSQL with pgvector.
- Web frontend: Next.js, TypeScript.
- AI orchestration: Gemini 3.1 Pro as session orchestrator and planner.
- Clinical image/text evidence: MedGemma clinical evidence tool.
- Deployment: one VM with Docker Compose, Caddy reverse proxy/TLS, GitHub Actions CI/CD.
- Tests: Vitest for backend and Playwright for end-to-end workflows.

## 2. Goals, Success Metrics, and Non-goals

### 2.1 Primary Goals

- Support a full ANC encounter workflow from intake to clinician-reviewed output.
- Improve consistency of maternal risk screening by combining deterministic rules, structured inputs, and AI synthesis.
- Identify missing or uncertain clinical information before summary generation.
- Keep all clinical decisions under clinician control.
- Provide auditable patient memory scoped by patient and pregnancy episode.
- Produce referral-ready summaries and FHIR R4 export artifacts after clinician approval.
- Run reliably in a single-hospital production environment with rollbackable VM deployment.

### 2.2 Success Metrics

- Clinicians can complete an ANC encounter with all mandatory input types in one guided workflow.
- Mandatory-field and red-flag preflight runs before any LLM-generated clinical synthesis is shown.
- High-risk maternal rule hits are traceable to source fields and thresholds.
- AI-generated outputs preserve hard safety flags and uncertainty markers.
- No durable memory write or FHIR export occurs without clinician approval.
- RBAC prevents unauthorized users from viewing, editing, approving, exporting, or administering patient data.
- Audit logs record sensitive access, tool calls, approvals, edits, exports, and rejected AI outputs.
- Production deploy can validate readiness and roll back to the previous release after failed smoke checks.

### 2.3 Non-goals for First Hospital-ready Release

- No autonomous diagnosis or final triage.
- No model training or fine-tuning on patient data.
- No multi-hospital or multi-tenant organization model.
- No live SATUSEHAT or external FHIR server synchronization.
- No patient-facing mobile app.
- No public unauthenticated access.
- No direct database access from frontend clients.
- No use of AI outputs in clinical records without clinician approval.

## 3. Confirmed Decisions

- Matria targets a single hospital first.
- Patient data must not be used for model training.
- Access control uses full RBAC, not only coarse clinician/admin roles.
- All diagram inputs are in scope: consented audio, manual vitals, lab or record photo, ultrasound frame or clip, and clinician manual notes.
- Gemini 3.1 Pro is the main session orchestrator.
- MedGemma is used as the clinical text-image evidence tool.
- Deterministic rules run before LLM synthesis.
- FHIR scope is export-ready FHIR R4 artifacts, not live integration.
- Hosted production uses one VM with Docker Compose and Caddy.
- PostgreSQL is self-hosted and pgvector is enabled for embeddings and scoped memory retrieval.

## 4. Users and Roles

Matria uses full RBAC. The implementation must support role definitions and permissions without hard-coding only two roles.

Core role profiles:

- `clinician`: creates ANC encounters, reviews AI outputs, edits notes, approves or rejects summaries.
- `obgyn_specialist`: reviews escalated cases and teleconsult/referral summaries.
- `nurse_midwife`: captures intake, vitals, consent, files, and draft encounter context.
- `lab_staff`: uploads and verifies lab-related files and extracted values.
- `radiology_sonographer`: uploads ultrasound media and metadata.
- `hospital_admin`: manages users, roles, facilities, departments, and configuration.
- `auditor`: reads audit logs and compliance reports without mutating clinical content.
- `it_operator`: manages deployment configuration and operational health without clinical approval authority.

Permissions must be explicit for patient read, encounter write, file upload, AI synthesis request, output approval, FHIR export, user administration, audit access, and system configuration.

## 5. Hospital Workflows

### 5.1 Patient and Pregnancy Setup

1. Authorized staff registers or finds a patient.
2. Staff creates or selects the active pregnancy episode.
3. System scopes all encounter data, files, memory retrieval, and memory writes by patient and pregnancy episode.
4. System records consent status before audio or media processing.

### 5.2 ANC Encounter Capture

1. Staff starts an ANC encounter.
2. System accepts consented audio and ASR transcript.
3. Staff enters vital signs: blood pressure, heart rate, temperature, weight, gestational age, and clinically required context.
4. Staff uploads lab or maternal record photos.
5. Staff uploads ultrasound frames or short clips for review support.
6. Clinician adds manual notes such as visit type, chief complaint, obstetric history, medications, and follow-up plan.

### 5.3 Rules-first Clinical Preflight

1. Structured ANC normalizer builds an encounter packet.
2. Mandatory-field checker identifies missing gestational age, symptoms, history, vitals, labs, or other required fields.
3. Maternal red-flag rules evaluate severe hypertension, bleeding, reduced fetal movement, anemia indicators, abnormal labs, infection signs, high-risk history, and other configured conditions.
4. Uncertainty annotator marks missing, low-confidence, contradictory, or unverified inputs.
5. Escalation guardrail blocks dismissing must-not-ignore flags without explicit clinician acknowledgement.

### 5.4 Agentic Synthesis and Review

1. Gemini orchestrator receives a compact context packet with rule hits, missing fields, approved memory, and media references.
2. Tool router calls MedGemma for text-image clinical evidence, patient memory retriever, FHIR formatter, text-to-speech if enabled, and audit logger.
3. Output validator ensures hard flags and uncertainty are preserved.
4. Clinician-facing writer produces an editable ANC note, risk synthesis, missing-question prompts, teleconsult summary, and referral-ready summary.
5. Clinician approves, edits, or rejects each AI-generated output.
6. Only approved facts are written to patient memory or exported.

## 6. Functional Requirements

### 6.1 Backend API

- Provide health and readiness endpoints at `/health` and `/ready`.
- Implement RBAC middleware and permission checks for every protected route.
- Store patients, pregnancy episodes, encounters, files, structured observations, rule results, AI tool calls, generated outputs, approvals, FHIR exports, and audit logs.
- Enforce patient and pregnancy episode scoping on retrieval and memory writes.
- Run red-flag and mandatory-field checks before AI synthesis.
- Persist AI outputs as drafts until approved, edited, or rejected.
- Persist immutable audit events for sensitive actions.
- Provide FHIR R4 export generation after clinician approval.
- Never expose raw database credentials to frontend clients.

### 6.2 Web Frontend

- Provide authenticated clinical workspace routes for encounter capture and review.
- Provide admin routes for users, roles, permissions, and system configuration.
- Provide audit views for authorized auditors.
- Show deterministic rule hits separately from AI-generated interpretation.
- Make missing fields and uncertainty visible before approval.
- Require explicit clinician action for approve, edit, or reject.
- Prevent UI affordances for unauthorized actions based on RBAC.

### 6.3 AI and Tooling

- Gemini 3.1 Pro acts as main session orchestrator, planner, and synthesis coordinator.
- MedGemma is used for clinical text-image evidence over lab records, maternal records, and ultrasound media where appropriate.
- AI prompts must include the safety posture: decision support only, no diagnosis, preserve uncertainty, preserve deterministic rule hits.
- AI outputs must be structured and validated before display.
- Tool calls and model outputs must be audited.
- Patient memory retriever and writer must operate only within patient and pregnancy episode scope.
- Memory writes require clinician approval.

### 6.4 FHIR Export

- Generate FHIR R4-compatible export artifacts for approved referral or teleconsult summaries.
- Represent encounter summary, observations, service request, composition, and relevant patient context where sufficient data exists.
- Include provenance showing clinician approval and generation timestamp.
- Do not perform live external submission in the first release.

## 7. Domain Model

Required entities:

- `User`: identity, status, authentication metadata.
- `Role`: role name and description.
- `Permission`: action-level capability.
- `UserRole`: mapping of users to roles.
- `Patient`: hospital-scoped patient record.
- `PregnancyEpisode`: active or historical pregnancy context.
- `Encounter`: ANC visit and lifecycle state.
- `ConsentRecord`: consent type, status, actor, timestamp.
- `ClinicalFile`: uploaded audio, image, document, or ultrasound media metadata.
- `StructuredObservation`: normalized vitals, labs, symptoms, history, and measurements.
- `RuleResult`: deterministic rule evaluation, severity, evidence, and threshold.
- `AiToolCall`: model/tool invocation metadata and status.
- `GeneratedOutput`: draft note, risk synthesis, missing questions, or referral summary.
- `ClinicalApproval`: approval, edit, rejection, and approver metadata.
- `PatientMemoryFact`: approved scoped memory fact with provenance.
- `FhirExport`: generated FHIR artifact and export status.
- `AuditLog`: immutable security and clinical governance event.

## 8. API Contract Overview

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
- `POST /encounters/:encounterId/files`
- `POST /encounters/:encounterId/observations`
- `POST /encounters/:encounterId/preflight`
- `POST /encounters/:encounterId/synthesis`
- `POST /outputs/:outputId/approve`
- `POST /outputs/:outputId/edit`
- `POST /outputs/:outputId/reject`
- `POST /encounters/:encounterId/fhir-export`
- `GET /audit-logs`

## 9. Security, Privacy, and Compliance Requirements

- Encrypt sensitive data in transit with TLS.
- Store secrets only in environment variables or secret stores, never in repo files.
- Hash passwords with a modern password hashing algorithm.
- Use secure HTTP-only cookies or equivalent secure session handling.
- Apply rate limits to authentication and sensitive endpoints.
- Minimize patient identifiers in logs.
- Never send patient data to model training pipelines.
- Keep audit logs immutable from application-level users.
- Record consent before processing audio or uploaded clinical media.
- Provide least-privilege permissions for every role.
- Prevent cross-patient and cross-pregnancy memory leakage.

## 10. Non-functional Requirements

- Readiness checks must verify API dependencies, database connectivity, migration state, and configured AI provider availability where practical.
- The backend must handle repeated synthesis attempts without duplicating approved memory facts.
- The system must degrade clearly when AI providers fail: deterministic rule results remain visible and no fabricated summary is shown.
- Uploaded file handling must validate type, size, and malware scanning integration points.
- The web UI must remain usable by clinical staff under repeated daily workflows.
- Clinical output pages must avoid marketing-style layouts and prioritize dense, scannable, work-focused information.

## 11. Deployment Topology

Production runs on one VM:

- `caddy`: reverse proxy and TLS termination.
- `postgres`: self-hosted PostgreSQL with pgvector.
- `api`: Express.js backend.
- `web`: Next.js frontend.

GitHub Actions deploys by uploading a source release archive over SSH. The VM builds and starts containers with Docker Compose. Deployment scripts must support preflight checks, service readiness waits, smoke checks, current release tracking, and rollback to the previous release.

## 12. CI/CD Requirements

CI must run on pull requests and main branch pushes:

- install dependencies
- format check
- lint
- typecheck
- backend Vitest suite
- Playwright E2E suite
- production build
- Docker Compose config validation
- hosted image build
- security scans such as dependency review, CodeQL, secret scan, and container or filesystem vulnerability scan

Production deploy runs only after successful CI on `main` or through manual dispatch.

## 13. Acceptance Criteria

### 13.1 Backend

- RBAC protects all patient, encounter, approval, export, and admin routes.
- Mandatory-field and red-flag rules run before AI synthesis.
- AI outputs cannot be approved by unauthorized users.
- Approved facts are written to memory with patient and pregnancy episode scope.
- Rejected AI outputs are retained for audit but not exported or written to memory.
- FHIR R4 export is generated only from approved content.

### 13.2 Web

- Clinician can complete an ANC encounter with all mandatory inputs.
- Clinician can see rule hits, missing fields, uncertainty, and draft outputs.
- Clinician can approve, edit, or reject generated outputs.
- Admin can manage users, roles, and permissions.
- Auditor can inspect audit logs without mutating clinical records.

### 13.3 Deployment

- `docker compose config` passes with production env example.
- API `/health` and `/ready` pass after deployment.
- Web home route responds successfully.
- Failed production validation triggers rollback when a previous release exists.

## 14. Test Scenarios

- Severe hypertension vital signs trigger deterministic high-risk flag before AI synthesis.
- Missing gestational age blocks complete summary and creates a missing-question prompt.
- Lab photo OCR with low confidence is marked uncertain and requires clinician verification.
- Ultrasound media evidence is referenced as review support, not as autonomous diagnosis.
- Unauthorized nurse or lab role cannot approve final outputs.
- Clinician edits AI summary and approved edited text becomes the export source.
- Patient memory retrieval never returns facts from another patient or pregnancy episode.
- FHIR export includes clinician approval provenance.
- AI provider failure leaves rule results visible and produces no unvalidated clinical summary.
- Production readiness fails when database is unavailable.

## 15. Deferred Decisions

- Exact ASR provider selection: Whisper-based local/cloud ASR or managed cloud ASR.
- Exact OCR provider selection.
- Exact MedGemma hosting strategy and hardware requirements.
- File object storage location for production uploads.
- Hospital identity provider integration.
- SATUSEHAT or external FHIR server live submission.
- Backup retention period and disaster recovery RPO/RTO.
