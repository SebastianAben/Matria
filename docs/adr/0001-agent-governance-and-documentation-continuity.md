# ADR 0001: Agent Governance And Documentation Continuity

Status: Accepted  
Date: 2026-06-22  
Decision owners: Matria project owner and Codex agents  
Related sources: `.agent/RULES.md`, `.agent/PRD.md`, `.agent/implementationPhases.md`, `.agent/sessionHandoff.md`

## Context

Matria is a clinical decision-support product with sensitive antenatal care workflows, AI orchestration, rule-based safety behavior, patient-scoped memory, and future hosted deployment needs. The project is still early, so future coding sessions need a reliable operating memory that prevents re-deciding foundational decisions and prevents implementation drift from the PRD.

The project uses `.agent/` as the source-of-truth memory folder. The user requested a single stable session handoff file, a detailed implementation phase tracker, behavior-based commit messages, and comprehensive ADRs after every substantive task/session. The user also locked a local development runtime decision: the local database must be Docker-managed PostgreSQL with pgvector, not a manually installed host PostgreSQL service.

## Decision

Matria agents must follow these documentation and governance rules:

1. `.agent/PRD.md` remains the product, API, clinical safety, and architecture source of truth.
2. `.agent/implementationPhases.md` is the sequencing and progress tracker.
3. `.agent/sessionHandoff.md` is the single stable latest handoff file.
4. `docs/adr/` records architectural and process decisions after every substantive task/session.
5. Commit messages must be behavior-based and must not refer to implementation phases.
6. Local development must use Docker-managed PostgreSQL with pgvector.
7. Deployment/environment docs are not recreated until deployment work is ready.

## Rationale

Matria's product surface includes clinical safety constraints, ambient AI behavior, patient memory, AI provider governance, RBAC, auditability, and eventual deployment. These decisions are easy to lose across many sessions if they only live in chat history.

A single stable handoff file makes the latest state easy to find. A phase tracker gives implementation order and progress without overloading the PRD. ADRs provide durable rationale for why decisions were made. Behavior-based commit messages make git history useful to engineers and reviewers by describing observable changes rather than roadmap bookkeeping.

The Docker-managed local database rule reduces environment drift. It ensures developers and agents work against a consistent PostgreSQL/pgvector runtime, avoids host PostgreSQL setup differences, and better matches hosted runtime assumptions.

## Alternatives Considered

- Use dated handoff files only: rejected because the user prefers one stable `sessionHandoff.md` and future agents need the latest state without choosing among dated files.
- Track implementation progress only in chat: rejected because chat context can compact or be unavailable.
- Use phase-based commit subjects: rejected because commit history should describe behavior and capability changes, not internal sequencing.
- Create ADRs only for major architecture changes: rejected for this project because the user wants every substantive task/session to leave a comprehensive decision trail.
- Use host-machine PostgreSQL for local development: rejected because it increases developer environment drift and weakens parity with Docker-hosted runtime.

## Implementation Details

The rules are implemented in `.agent/RULES.md`:

- Required read order includes `.agent/sessionHandoff.md` and `.agent/implementationPhases.md`.
- Every substantive session must update `.agent/sessionHandoff.md`, `.agent/implementationPhases.md`, and `docs/adr/`.
- ADRs must include status, date, context, decision, rationale, alternatives considered, implementation details, consequences, validation plan, risks, and follow-up work.
- Commit subjects must be behavior-based, imperative, concise, and specific.
- Commit subjects must not refer to phases or roadmap positions.
- Local development database must run as Docker-managed PostgreSQL with pgvector.

The roadmap is implemented in `.agent/implementationPhases.md`:

- Phase 0 captures governance setup.
- Later phases sequence app foundation, database/auth/RBAC, ANC model, rules, ambient STT, Gemini, MedGemma, frontend, approvals/FHIR, CI/runtime, and end-to-end hardening.
- Each phase has subphases, deliverables, acceptance checks, and a test plan.

The current session state is implemented in `.agent/sessionHandoff.md`.

## Consequences

Positive consequences:

- Future agents can quickly recover the latest project state.
- The roadmap and handoff must remain current as implementation progresses.
- ADRs provide durable rationale for decisions and reduce repeated discussion.
- Commit history will be easier to scan because subjects describe behavior.
- Local development database setup will be more reproducible.

Tradeoffs:

- Every substantive task has more documentation overhead.
- ADRs may feel heavy for small sessions unless agents update an existing ADR when appropriate.
- The single handoff file must be maintained carefully because it is overwritten and represents the latest state only.
- Docker is required for normal local database development.

## Validation Plan

- Check `.agent/RULES.md` for behavior-based commit-message guidance and ADR requirements.
- Check `.agent/sessionHandoff.md` after every substantive session for current objective, files changed, decisions, blockers, next action, and checks run.
- Check `.agent/implementationPhases.md` after every implementation session for accurate current phase/subphase status.
- Check `docs/adr/` after every substantive session for a new or updated comprehensive ADR.
- Search commit subjects before committing to ensure they do not reference phases.
- During Phase 2, validate local database workflows against Docker-managed PostgreSQL/pgvector.

## Risks

- Agents may forget to update ADRs after small but substantive sessions.
- ADRs could duplicate each other if agents create new records instead of updating an existing related ADR.
- Phase tracker status could drift if work is done without roadmap maintenance.
- Behavior-based commit guidance requires judgment; agents must choose subjects based on user-visible or system-observable outcomes.

## Follow-up Work

- Keep this ADR updated if governance rules change.
- Create additional ADRs for major architecture decisions such as RBAC, patient memory scoping, AI provider boundaries, MedGemma hosting, FHIR export, and deployment topology.
- When Phase 1 begins, use behavior-based commit messages from the start.
- When Phase 2 begins, implement Docker-managed PostgreSQL/pgvector for local development.
