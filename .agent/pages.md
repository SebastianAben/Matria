# Matria Frontend Pages And UX Flows

Document status: Phase 8 planning baseline  
Created: 2026-06-22  
Purpose: describe Matria's frontend pages, user flows, screen contents, and interaction behavior before implementing the full clinical workspace.  
Design scope: this document intentionally avoids component styling, fonts, colors, spacing, and visual treatment. It describes what each page must contain and how it should behave.

## 1. Product Experience Principle

Matria's frontend is a clinical work surface for antenatal care, not a marketing site or patient-facing app.

The user experience should help hospital staff move through an ANC encounter without losing the patient scope, pregnancy scope, consent status, clinical evidence, AI draft status, or clinician authority. The interface should make it clear what is clinician-entered, what is deterministic rule output, what is AI-drafted, what is media evidence, and what has been reviewed or approved.

The main UX rule is separation of responsibility:

- Clinician-entered information is editable clinical context.
- Deterministic rule findings are advisory safety checks.
- AI outputs are drafts until reviewed.
- Media/document evidence is review-required supporting evidence.
- Approvals, rejections, acknowledgements, and uncertainty markings are explicit clinician actions.

## 1.1 Brand-System UX Guidelines

These guidelines translate the Matria brand into product behavior, content hierarchy, and page composition expectations. They do not define visual styles, colors, fonts, spacing, or component appearance.

### Brand Strategy

Matria is a hospital-ready ambient ANC copilot. Its product role is to preserve the thread of care during antenatal encounters: patient scope, pregnancy context, consent, transcript, notes, observations, safety checks, evidence, AI drafts, clinician review, and export readiness.

The brand should represent:

- protected clinical continuity
- calm decision support
- careful evidence handling
- clinician authority
- maternal safety without alarmism
- hospital-grade accountability

The brand should not represent:

- autonomous diagnosis
- AI spectacle
- generic chatbot personality
- decorative healthcare sentimentality
- vague wellness language
- cluttered operational noise
- unsupported clinical certainty

### Core Metaphor

The product metaphor is a protected clinical thread.

Every page should help the user understand where the thread begins, what has been added to it, what still needs review, and what can safely move forward. This metaphor should guide information behavior rather than visual decoration.

Examples:

- Patient, pregnancy episode, and encounter context should remain connected across pages.
- Transcript, observations, notes, rules, evidence, and AI drafts should be traceable back to the active encounter.
- Review-required content should remain visible until acted on or superseded.
- Approved or clinician-edited content should feel meaningfully different from drafts in workflow terms, not just wording.

### Brand Voice

Matria's product language should be precise, restrained, and clinically accountable.

Good product language:

- names the action or state directly
- distinguishes draft, review-required, approved, rejected, uncertain, and stale content
- explains why an action is blocked
- uses short labels for high-frequency clinical work
- keeps clinician authority explicit
- uses "AI draft" or "draft synthesis" when content is not reviewed

Avoid product language that:

- implies the system diagnoses, prescribes, or finalizes care
- treats AI output as certain
- uses vague encouragement in place of clinical status
- overexplains routine actions
- hides missing consent, missing context, uncertainty, or failed provider states
- uses buzzwords where a plain clinical state is clearer

### Brand Presence In The Product

Matria's brand should appear through coherence, restraint, and trustworthy behavior.

The interface should feel ownable because:

- patient and pregnancy scope are always protected
- clinical objects have consistent names across pages
- draft and approved states are never blurred
- AI, rules, evidence, and clinician-authored content stay distinct
- actions have clear consequences
- history and provenance are available when users need them

The brand should not depend on decorative moments inside the clinical workflow. Brand marks, identity assets, or expressive imagery should never compete with patient context, safety findings, consent, review states, or clinician actions.

### Logo And Identity Use

No logo design is specified in this document.

When a Matria identity mark or wordmark exists, the product should use it as an orientation and trust cue, not as repeated decoration. It should be most useful in:

- login and session entry
- global navigation
- printable or export-ready artifacts where product provenance matters
- admin or audit areas where system identity helps orient the user
- approved output provenance when appropriate

The identity should avoid:

- implying medical certification beyond the actual product scope
- resembling a final clinical approval stamp unless the content is truly approved
- using generic medical symbols as a substitute for clear product meaning
- appearing inside clinical findings in ways that could be confused with evidence or approval

### Brand Applications Across Pages

Login should feel like entry into a protected clinical system, not a product pitch.

Workspace home should communicate readiness, scope, and unresolved work. It should not behave like a marketing dashboard.

Patient and encounter pages should make continuity obvious: the user should always know which patient, pregnancy episode, and encounter they are affecting.

The clinical workspace should express the brand through ordered responsibilities: clinician input, transcript, observations, rules, AI drafts, evidence, suggestions, history, and closeout each have a clear role.

Admin pages should express operational accountability. They should make roles and permissions understandable without borrowing clinical authority.

Audit pages should express traceability. They should help users reconstruct what happened without turning audit review into the primary clinical workspace.

### Image And Asset Direction

This document does not prescribe an image style. If future screens, decks, or exported artifacts use imagery or branded assets, they should be purposeful and clinically appropriate.

Acceptable asset behavior:

- supports orientation or provenance
- reinforces the protected clinical thread
- helps distinguish patient care, evidence, review, and export contexts
- remains secondary to clinical information

Avoid asset behavior:

- generic stock healthcare scenes
- decorative AI motifs unrelated to clinical workflow
- emotional imagery that could trivialize maternal risk
- busy mockups that obscure actual product state
- imagery that suggests diagnosis, treatment, or final triage authority

### Brand Quality Bar For Phase 8

Phase 8 implementation should feel:

- intentional: every page has a clear clinical job
- coherent: the same concepts behave consistently across pages
- restrained: the product does not over-narrate or over-decorate clinical work
- accountable: review states, uncertainty, source references, and permission boundaries are visible
- human-centered: the clinician can keep working when automation fails
- implementation-ready: page behavior is specific enough to test

### Anti-Generic UX Rules

Do not build Phase 8 as:

- a single overloaded demo page
- a generic AI assistant console
- a decorative dashboard with clinical data placed into cards without workflow logic
- a chat-first experience that hides structured encounter work
- a final-answer generator
- a file upload surface disconnected from clinical review
- an approval flow that hides uncertainty or source provenance
- a patient-facing wellness app

Matria should feel like a serious clinical product because its workflows are careful, scoped, reviewable, and calm under failure.

## 2. Primary Users And UX Needs

### Clinician

Needs to start and complete an ANC encounter, review ambient transcript and AI drafts, edit notes, resolve suggestions, acknowledge rule findings, and approve or reject outputs.

The clinician experience should prioritize:

- preserving patient and pregnancy context throughout the visit
- keeping the live encounter usable even when AI, speech, or evidence analysis is delayed
- making review-required content obvious before closeout
- allowing edits without forcing the clinician to leave the encounter workspace

### Nurse Or Midwife

Needs to find or create patients, select pregnancy episodes, record consent, capture vitals and history, upload files, and prepare the encounter for clinician review.

The nurse or midwife experience should prioritize:

- quick patient lookup and registration
- clear consent capture before processing audio, transcript, AI, media, or export data
- structured data entry that remains usable without AI
- easy handoff to the clinician within the same encounter

### OBGYN Specialist

Needs to review escalated or referral-oriented cases, evidence findings, draft summaries, and clinician-approved context.

The specialist experience should prioritize:

- fast understanding of why the case needs attention
- access to rule findings, highlights, transcript excerpts, evidence findings, and draft referral content
- ability to see what has and has not been reviewed

### Lab Staff

Needs to upload lab-related files and verify extracted values where permitted.

The lab staff experience should prioritize:

- attaching files to the correct encounter
- seeing upload status and whether evidence extraction is pending, degraded, or complete
- avoiding approval actions outside their authority

### Radiology Sonographer

Needs to upload ultrasound frames or clips, mark quality issues, and support evidence review.

The sonographer experience should prioritize:

- uploading ultrasound media to the correct encounter
- seeing whether frame sampling or analysis succeeded
- clearly recording limitations or quality concerns

### Hospital Admin

Needs to manage users, roles, and operational configuration.

The admin experience should prioritize:

- user setup
- role assignment
- permission visibility
- no access to clinical approval workflows unless separately authorized

### Auditor

Needs read-only visibility into sensitive actions and clinical governance events.

The auditor experience should prioritize:

- traceability of access, edits, provider calls, rule evaluations, approvals, exports, and rejections
- filtering by patient, encounter, actor, action, and date
- no ability to mutate clinical content

## 3. Navigation Model

The frontend should expose these top-level areas:

- Workspace: the active clinical work area and primary entry point for daily ANC work.
- Patients: patient lookup, registration, pregnancy episode selection, and encounter entry.
- Admin: user, role, and permission management.
- Audit: compliance and sensitive-action review for authorized auditors.
- Login and session: authentication, current user, and sign-out.

The active clinical encounter should remain easy to re-enter after navigation. Once a patient, pregnancy episode, and encounter are selected, the workspace should keep that context visible and avoid making the user repeat lookup steps.

## 4. Global Behaviors

### Authentication And Session

Unauthenticated users see the login experience before accessing protected pages.

After login, the app should show the user's identity and make available only the areas and actions allowed by their permissions. If the session expires, the user should be guided back to login without losing the explanation of what action failed.

### Permission-Aware Actions

The UI should not invite users to perform actions they are not authorized to perform. If an unauthorized action is still attempted or fails from the server, the page should show a clear message and keep the current clinical context intact.

Examples:

- A user without approval permission should not see final approval controls as available actions.
- A user without admin permissions should not be able to create users or roles.
- A user without transcript correction permission should be able to read permitted transcript content but not edit transcript turns.

### Patient And Pregnancy Scope

Every clinical page must make the active patient, pregnancy episode, and encounter clear. Actions that create, edit, review, upload, synthesize, or approve content must feel attached to that active scope.

If no patient or encounter is selected, workspace pages should guide the user to patient lookup or encounter creation instead of showing empty clinical panels with no context.

### Consent Awareness

Consent status should be visible wherever it affects user action.

The app should distinguish between:

- audio consent
- transcript consent
- AI consent
- media consent
- FHIR/export consent

Actions that depend on consent should explain what consent is missing and allow authorized staff to record it from the encounter flow.

### Draft And Review Language

AI-generated summaries, suggestions, missing questions, note drafts, evidence findings, referral drafts, and export inputs should be treated as drafts or review-required content until acted on by an authorized clinician.

The UI should never imply that AI output is final clinical truth.

### Degraded States

The encounter workspace must remain useful if:

- speech transcription fails
- diarization is uncertain
- AI synthesis is unavailable
- media evidence analysis fails or is degraded
- uploaded video cannot be sampled
- consent blocks a processing mode

In these cases, the user should be able to continue with manual notes, structured observations, deterministic rules, and clinical review.

## 5. Page Map

### 5.1 Login Page

Primary purpose: allow authorized staff to start a session.

The page should contain:

- email input
- password input
- sign-in action
- sign-in progress and failure messages
- successful sign-in confirmation or navigation to the workspace

Behavior:

- Invalid credentials should show a clear failure message without revealing sensitive account details.
- Successful login should establish the user session and allow access to permitted pages.
- Users who are already authenticated should be able to continue to the workspace.

### 5.2 Workspace Home

Primary purpose: orient staff to current ANC work and provide fast entry into active or recent encounters.

The page should contain:

- current user context
- entry points for patient lookup and encounter creation
- recent or active encounters when available
- encounter status indicators such as draft, active, reviewing, closed, approved, or archived
- high-level counts for review-required items, unresolved rule findings, open suggestions, and pending evidence
- clear path into the full encounter workspace

Behavior:

- If no encounter is active, guide the user to find or create a patient.
- If an encounter is active, allow re-entry without repeating the setup flow.
- If user permissions are limited, show only permitted work queues and actions.

### 5.3 Patient Search And Registration

Primary purpose: find an existing patient or create a new hospital-scoped patient record.

The page should contain:

- search by name or hospital number
- patient result list with enough identifying information to select safely
- create-patient form for authorized users
- selected patient summary
- path to pregnancy episode selection

Behavior:

- Search should support partial name or hospital number lookup.
- Empty search results should make patient creation available to authorized users.
- Creating a patient should immediately select that patient.
- Selecting a patient should load pregnancy episodes and clear any previous encounter context that belongs to a different patient.
- Patient creation should require the minimum safe identity fields and allow optional demographic/contact details when available.

### 5.4 Patient Detail

Primary purpose: give staff a patient-centered view before entering or creating a visit.

The page should contain:

- patient identity summary
- pregnancy episode list
- recent encounters
- active pregnancy episode indication
- known consent or processing limitations when relevant
- action to create a pregnancy episode
- action to start or continue an encounter

Behavior:

- Users should be able to choose an existing pregnancy episode or create a new one.
- Historical episodes should remain readable but should not be confused with the active episode.
- Recent encounters should show their lifecycle state and allow authorized re-entry.

### 5.5 Pregnancy Episode Setup

Primary purpose: choose or create the pregnancy episode that scopes the encounter.

The page or page section should contain:

- current patient summary
- list of active and historical pregnancy episodes
- create episode fields such as label, gestational age when known, estimated due date when known, and status
- selected episode summary
- action to create an encounter

Behavior:

- Selecting an episode should make it the active scope for encounter creation.
- Creating an episode should select it immediately.
- If gestational age is missing, the UI should allow the encounter to continue but make the missing context visible for rules and AI review.

### 5.6 Encounter Setup

Primary purpose: create or enter an ANC encounter under the selected patient and pregnancy episode.

The page or page section should contain:

- selected patient
- selected pregnancy episode
- visit type
- facility or clinic context
- responsible clinician or care team context when available
- encounter lifecycle state
- action to create, activate, review, close, approve, archive, or reopen where allowed by policy

Behavior:

- Encounter creation should not proceed without patient and pregnancy episode scope.
- Lifecycle transitions should be explicit and show clear confirmation or failure messages.
- Invalid transitions should leave the encounter unchanged and explain that the transition is not allowed.
- Closed or archived encounters should remain readable, with mutation controls limited according to role and policy.

### 5.7 Consent Capture

Primary purpose: record and display consent for processing modes.

The section should contain:

- consent status for audio
- consent status for transcript
- consent status for AI
- consent status for media
- consent status for FHIR/export
- consent note field
- consent history
- action to record granted, declined, or withdrawn consent

Behavior:

- Latest consent status should control dependent actions.
- Declined or withdrawn consent should prevent the affected processing action and explain the dependency.
- Consent history should remain visible for review.
- Recording consent should not erase prior records.

### 5.8 Clinical Workspace

Primary purpose: support the live ambient ANC encounter from intake through review.

This is the central Phase 8 page. It should bring together encounter setup, consent status, structured observations, session note, transcript, deterministic rules, AI drafts, evidence review, suggestions, and review actions without forcing the user to leave the encounter context.

The page should contain:

- active patient, pregnancy episode, and encounter context
- encounter lifecycle controls
- consent summary and missing-consent prompts
- ambient session controls
- live transcript
- structured observations
- session note editor
- deterministic rule panel
- progressive summary
- highlight cards
- suggestions checklist
- medical evidence panel
- draft outputs and review-required items
- artifact history
- closeout and approval area

Behavior:

- The page should load existing encounter content when re-entered.
- New observations, note edits, transcript corrections, suggestion results, evidence findings, and rule acknowledgements should update the encounter state without changing patient scope.
- The page should support manual clinical work even when ambient or AI features are unavailable.
- Review-required content should remain visible until acted on or superseded.

## 6. Clinical Workspace Sections

### 6.1 Encounter Context Header

Purpose: keep the current clinical scope unmistakable.

Should show:

- patient name and hospital number
- pregnancy episode label and status
- gestational age or missing gestational-age indication
- encounter status
- visit type and facility
- active ambient session status when present
- review-required count or unresolved item count

Behavior:

- Changing patient or episode should be a deliberate navigation action, not an accidental inline change.
- If the encounter is closed, approved, or archived, the header should make that state clear and reduce mutation actions accordingly.

### 6.2 Encounter Timeline Or Activity Summary

Purpose: help users understand what has happened in the encounter.

Should include:

- created encounter
- consent records
- observations added
- session note versions
- transcript events or corrections
- preflight runs
- synthesis ticks
- evidence handoffs and findings
- suggestion updates
- review or approval actions when available

Behavior:

- Users should be able to scan the latest activity.
- Sensitive details can be summarized while deeper audit views remain in the audit area.

### 6.3 Ambient Session Controls

Purpose: manage listening and transcript capture.

Should include:

- create ambient session action
- start listening action
- stop listening action
- session status
- provider/degraded status
- missing consent explanation when start is blocked
- manual or mock transcript entry only where appropriate for local/demo workflows

Behavior:

- Starting should require audio and transcript consent.
- Stopping should preserve transcript turns and session notes.
- Failure should show a degraded state and allow continued manual documentation.
- Re-starting a closed or failed session should be explicit and audit-visible.

### 6.4 Live Transcript

Purpose: show the consultation conversation as it develops.

Should include:

- speaker label
- speaker role guess such as clinician, patient, companion, or unknown
- timestamp range
- transcript text
- speech confidence when available
- diarization confidence when available
- correction status
- correction controls for authorized users

Behavior:

- New transcript turns should appear in time order.
- Correcting a turn should allow speaker label, speaker role, and text changes.
- Corrections should preserve that the content was clinician-corrected.
- Low confidence or unknown speaker role should remain visible so the clinician can correct it.
- Transcript absence should not block session notes or structured observations.

### 6.5 Structured Observations

Purpose: capture manual clinical facts and observations.

Should include:

- vitals
- labs
- symptoms
- history
- medications
- allergies
- gestational age
- source and verification status when available
- list of recorded observations

Behavior:

- Adding observations should be quick and should not require AI.
- Observations should remain tied to the encounter.
- Missing or contradictory values should be surfaced by rules and AI drafts but should not erase the original entry.
- Evidence-extracted values should remain review-required until explicitly accepted in a later approval flow.

### 6.6 Session Note Editor

Purpose: allow the clinician to maintain an encounter note during the visit.

Should include:

- editable note area
- save status
- current note version
- last updated information when available
- indication that the note is used as clinician-authored context for AI synthesis

Behavior:

- The clinician should be able to edit during the encounter without leaving the workspace.
- Saving should create a new version or update the visible version count.
- Save failure should not discard unsaved text.
- AI synthesis should use the latest saved clinician note.
- Draft AI note sections should not overwrite clinician-authored notes without explicit clinician action.

### 6.7 Deterministic Rules

Purpose: show maternal safety preflight findings separately from AI interpretation.

Should include:

- rule name or identifier
- severity
- blocking level such as none, soft, acknowledgement required, or hard
- suggested action
- source evidence
- confidence when available
- local guideline validation warning when relevant
- status such as active, acknowledged, resolved, overridden, or superseded
- acknowledgement or resolution action for authorized users

Behavior:

- Running preflight should evaluate current structured observations, note content, and transcript-derived candidates.
- New preflight runs may supersede older active findings.
- Critical or acknowledgement-required findings should remain visible until acknowledged or resolved.
- Rules should not be visually or conceptually merged into AI summaries.

### 6.8 Progressive Summary

Purpose: show the evolving consultation summary.

Should include:

- latest summary draft
- confidence when available
- source references
- prior summary revisions or path to history
- review-required status

Behavior:

- Summary content should update after synthesis ticks.
- The latest summary should not be treated as approved by default.
- If synthesis fails, the last available summary can remain visible with a clear stale or unavailable state.
- Clinician edits and approvals belong to the review/closeout flow.

### 6.9 Highlight Cards

Purpose: surface high-signal items from the encounter.

Should include highlights for:

- risks
- possible issues
- missing context
- contradictions
- uncertainty
- relevant memory
- media evidence
- follow-up needs

Each item should include:

- title
- body
- type
- severity
- confidence
- source references
- acknowledgement requirement when applicable

Behavior:

- Highlights should be treated as draft or advisory unless explicitly reviewed.
- Contradictions and uncertainty should remain visible, not hidden behind a positive summary.
- Highlight cards should link conceptually to their source evidence or transcript references where possible.

### 6.10 Suggestions Checklist

Purpose: help clinical staff act on open questions and recommended next steps.

Should include:

- suggestion title
- rationale
- priority
- status
- source references
- result options
- optional free-text result note
- action required indicator

Behavior:

- Users with permission can mark suggestions as done, skipped, needing follow-up, open, or superseded.
- If a suggestion has result options, the user can choose one and optionally add a note.
- Suggestion results should feed future AI context.
- Skipping a suggestion should not erase it from history.
- Urgent suggestions should stay easy to find until resolved or superseded.

### 6.11 Medical Evidence

Purpose: review uploaded files, sampled frames, evidence handoffs, and evidence-provider findings.

Should include:

- uploaded file list
- file type and source label
- upload status
- frame sampling status for media
- evidence handoff question
- evidence task type
- provider status
- findings
- extracted values
- confidence
- uncertainty reasons
- quality limitations
- clinician review requirement

Behavior:

- Uploading files should require the relevant consent.
- Frame sampling should show success, pending, failed, or degraded states.
- Evidence handoffs should be explicit tasks with clear questions.
- Findings should never become approved clinical facts automatically.
- Degraded video or provider failures should not block manual documentation or closeout review.

### 6.12 Draft Outputs And Review Queue

Purpose: collect AI-generated or evidence-derived items that require clinician review.

Should include:

- summaries
- note draft sections
- missing questions
- risk synthesis
- referral draft
- teleconsult draft
- FHIR/export draft inputs when available in later phases
- evidence findings
- unresolved suggestions
- unacknowledged rule findings

Behavior:

- Items should be grouped by review state: draft, review required, rejected, stale, uncertain, approved when available.
- Clinicians should be able to inspect source references before acting.
- Review actions should not be offered before the relevant backend capability exists.
- Rejected content should remain visible in history but should not be treated as approved content.

### 6.13 Artifact History

Purpose: show how AI outputs and draft artifacts changed over time.

Should include:

- artifact type
- creation time
- review status
- validation or stale status
- source context summary
- content preview
- relationship to current projected summary, highlights, or suggestions

Behavior:

- Users should be able to distinguish the latest active draft from older or stale revisions.
- Stale artifacts should remain audit-visible but should not be presented as current recommendations.
- The history should help clinicians understand what changed after note edits, transcript corrections, evidence findings, or suggestion results.

### 6.14 Encounter Closeout And Review

Purpose: guide the clinician from active encounter work to reviewed outputs.

Should include:

- latest session note
- latest progressive summary
- active rule findings
- unresolved suggestions
- evidence findings
- draft referral or teleconsult content when available
- approval, edit, reject, acknowledge, or mark-uncertain actions as capabilities become available
- blockers such as missing consent or unacknowledged critical warnings

Behavior:

- Closeout should not hide unresolved safety or uncertainty items.
- Approval controls should require explicit clinician action and permission.
- If approval capability is not yet implemented, the UI should identify review-required content without pretending it can finalize it.
- Approved or edited content becomes the source for memory writeback and export only in the later approval phase.

## 7. Admin Pages

### 7.1 User Management

Primary purpose: create and manage hospital users.

Should contain:

- user list
- user status
- assigned roles
- create-user form
- role assignment action

Behavior:

- Creating a user should require email, full name, temporary password, and one or more roles.
- Role assignment should be explicit.
- Admin actions should show success or failure messages.
- Clinical approval permissions should not be implied by admin access unless assigned through roles.

### 7.2 Role And Permission Management

Primary purpose: show and manage role capabilities.

Should contain:

- role list
- role descriptions
- permission list for each role
- create or update role action where supported

Behavior:

- Permission names should be readable enough for admins to understand what a role can do.
- Changes should not affect the current user's page state silently; if permissions change, the app may require refresh or re-authentication to reflect them.

### 7.3 System Configuration

Primary purpose: expose operational configuration where permitted.

Should contain later-phase controls or readouts for:

- provider availability
- deployment/runtime status
- feature availability
- system health indicators

Behavior:

- IT operators can view operational health without clinical approval authority.
- Configuration should not expose secrets.

## 8. Audit Pages

### 8.1 Audit Log

Primary purpose: allow authorized auditors to review sensitive actions.

Should contain:

- event list
- action type
- actor
- target type and target identifier
- outcome
- timestamp
- request or trace identifier when available
- filters for date, actor, action, patient or encounter, and outcome

Behavior:

- Audit views should be read-only.
- Failed and denied actions should be visible.
- Sensitive clinical details should be shown only as needed for compliance review.

### 8.2 Encounter Audit Trail

Primary purpose: review the governance history of one encounter.

Should contain:

- consent records
- observation changes
- session note updates
- transcript corrections
- rule evaluations
- AI synthesis calls
- evidence handoffs and provider results
- suggestion changes
- approval or rejection actions when available
- export actions when available

Behavior:

- The audit trail should help answer what happened, who did it, and when.
- It should not be used as the primary clinical workspace, but it should be reachable from encounter review where authorized.

## 9. End-to-End Flows

### 9.1 Routine ANC Encounter

1. User logs in.
2. User opens workspace or patients.
3. User searches for the patient.
4. User selects or creates the active pregnancy episode.
5. User creates or re-enters the encounter.
6. User records required consent.
7. User adds vitals, symptoms, history, medications, allergies, labs, or gestational-age context.
8. User writes or updates the session note.
9. User starts the ambient session when consent allows.
10. Transcript turns appear or are entered manually if needed.
11. User runs deterministic preflight.
12. User runs or receives AI synthesis.
13. User reviews summary, highlights, suggestions, rule findings, and evidence.
14. User resolves suggestions and updates the note.
15. User closes the encounter or moves it into review.

### 9.2 High-Risk Finding Flow

1. User records a relevant observation, transcript mention, or note detail.
2. Preflight surfaces a rule finding.
3. The rule finding remains separate from AI drafts.
4. AI synthesis may also surface a highlight or suggestion referencing the finding.
5. The clinician acknowledges, resolves, or escalates according to role and policy.
6. Closeout keeps unresolved critical or acknowledgement-required findings visible.

### 9.3 Missing Context Flow

1. Encounter begins with incomplete data such as missing gestational age.
2. The workspace allows the encounter to continue.
3. Rule findings and AI suggestions identify the missing context.
4. Staff asks the missing question or records why it is unavailable.
5. The suggestion result and note update become part of future review context.

### 9.4 Transcript Correction Flow

1. Transcript turn appears with speaker, role, confidence, and text.
2. User identifies a speaker or text error.
3. Authorized user opens correction.
4. User edits speaker label, role, or text.
5. Corrected turn replaces the visible turn while preserving correction status.
6. Future rules and AI context use corrected transcript content.

### 9.5 Evidence Review Flow

1. User records media consent.
2. User uploads lab record, maternal record image, ultrasound frame, or ultrasound clip.
3. User samples frames where applicable.
4. User creates or receives an evidence handoff question.
5. Evidence analysis runs.
6. Findings appear with confidence, uncertainty, and quality limitations.
7. Clinician reviews findings before any later conversion into approved facts.
8. Degraded evidence remains visible but does not block manual workflow.

### 9.6 Suggestion Resolution Flow

1. Suggestion appears after synthesis.
2. User reads title, rationale, priority, and evidence.
3. User marks it done, skipped, needs follow-up, open, or superseded.
4. If result options exist, user chooses the relevant result.
5. User adds a free-text note when needed.
6. Result remains attached to the suggestion and informs later context.

### 9.7 Encounter Review And Approval Flow

This flow is completed across Phase 8 and Phase 9.

1. Clinician reviews note, summary, rules, suggestions, evidence, and draft outputs.
2. Clinician edits or rejects incorrect draft content.
3. Clinician marks uncertain content where it cannot be resolved.
4. Clinician approves only content that has been reviewed and is within their authority.
5. Later phases use approved or clinician-edited content for patient memory and FHIR/export artifacts.
6. Rejected content remains visible in history but is excluded from approved outputs.

## 10. Empty, Loading, And Error States

### Empty States

Pages should explain the next useful action:

- No patient selected: search or create a patient.
- No pregnancy episode: create or select an episode.
- No encounter: create or choose an encounter.
- No consent: record consent before processing.
- No transcript: start listening or continue manually.
- No rule results: run preflight.
- No AI drafts: run synthesis when AI consent allows.
- No evidence: upload a file or continue without evidence.
- No suggestions: continue documentation or run synthesis.

### Loading States

Loading messages should be specific to the task:

- searching patients
- loading pregnancy episodes
- creating encounter
- recording consent
- saving note
- running preflight
- starting ambient session
- loading transcript
- running synthesis
- uploading file
- sampling frames
- running evidence analysis

### Error States

Errors should:

- explain what failed
- preserve the user's current patient and encounter context
- keep unsaved user-entered text visible when possible
- identify missing consent or missing permission when that is the cause
- avoid turning provider failure into a total encounter failure

## 11. Phase Boundaries

### Implement In Phase 8

Phase 8 should focus on:

- full patient and encounter navigation
- clinical workspace structure
- transcript review and correction
- session note editing
- deterministic rule display and acknowledgement
- AI draft display
- summary, highlights, and suggestions
- evidence upload, handoff, findings, and degraded states
- artifact history visibility
- permission-aware affordances
- review-required and draft states

### Coordinate With Phase 9

Phase 9 owns:

- generated output review model
- final approval workflows
- edit/reject/mark-uncertain persistence
- durable memory writeback
- referral and teleconsult final outputs
- FHIR export generation
- approval provenance

Phase 8 may show placeholders, draft states, disabled actions, or review queues for Phase 9 capabilities, but it should not pretend that final approval, memory writeback, or export behavior exists before those features are implemented.

## 12. Component Inventory

These are product components, not visual design components.

- App navigation
- Current user/session indicator
- Permission-aware action wrapper
- Patient search
- Patient create form
- Patient summary
- Pregnancy episode selector
- Pregnancy episode create form
- Encounter selector
- Encounter lifecycle controls
- Consent status summary
- Consent record form
- Observation entry form
- Observation list
- Session note editor
- Ambient session controls
- Transcript turn list
- Transcript correction form
- Rule result list
- Rule acknowledgement controls
- Progressive summary panel
- Highlight list
- Suggestion checklist
- Suggestion result form
- Clinical file upload form
- Clinical file list
- Frame sampling controls
- Evidence handoff form
- Evidence finding list
- Draft output review queue
- Artifact history list
- Encounter closeout panel
- Admin user list
- Admin user create form
- Role and permission list
- Audit log list
- Encounter audit trail
- Global status and error message area

## 13. Acceptance Criteria For This UX Contract

The frontend implementation should be considered aligned with this page contract when:

- a user can move from login to patient selection to encounter workspace without losing scope
- the workspace makes consent, encounter state, and review-required content visible
- transcript, session note, observations, rules, AI drafts, suggestions, evidence, and history are distinct areas of work
- manual clinical documentation remains available when providers fail
- unauthorized actions are unavailable or clearly denied without breaking the page
- AI and evidence content are never presented as approved clinical facts by default
- Phase 9-only approval, memory, referral, and export capabilities are not falsely represented as complete during Phase 8
- brand-system guidance is reflected through consistent scope, restrained product language, clear review states, and accountable workflows rather than visual decoration
