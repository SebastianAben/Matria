# Matria Agent Rules

Document status: Active  
Created: 2026-06-09  
Purpose: operating rules for Codex and future agents when reading or updating `.agent/`

## 1. Why This Folder Exists

The `.agent/` folder is the project memory and execution layer for Matria.

It exists to:

- preserve product, clinical safety, and implementation intent across sessions
- prevent re-deciding decisions that are already locked
- keep implementation aligned with hospital-ready requirements
- record roadmap status, deployment assumptions, and recommended next steps
- make future sessions aware that Matria handles sensitive clinical data

The reference repository `github.com/khalshaqzzy/loom` uses `.agent/`. Matria intentionally uses `.agent/` because that is the requested canonical folder name for this project.

## 2. Required Read Order

For most implementation sessions, read in this order:

1. `.agent/RULES.md`
2. `.agent/PRD.md`
3. newest `.agent/sessionHandoff-YYYY-MM-DD.md`, if present
4. `.agent/implementationPhases.md`
5. `.agent/phaseBacklog.md`
6. `.agent/environmentMatrix.md`
7. `.agent/deploymentGuide.md` if the task touches environments, secrets, deploys, VM, Docker, Caddy, PostgreSQL, or GitHub Actions
8. `.agent/releaseExecutionChecklist.md` if preparing a rollout
9. relevant ADRs under `docs/adr/` if present

## 3. Source-of-truth Files

- `PRD.md`: product contract, clinical safety posture, users, workflows, data model, API scope, AI decisions, deployment scope, acceptance criteria.
- `implementationPhases.md`: implementation roadmap and sequencing.
- `phaseBacklog.md`: short actionable backlog and next recommended start.
- `environmentMatrix.md`: local, E2E, and production topology.
- `deploymentGuide.md`: canonical deployment, secrets, provisioning, rollback, and smoke-test runbook.
- `releaseExecutionChecklist.md`: operator checklist for release windows.
- `manualProvisioningChecklist.md`: external provisioning checklist.

If code and docs disagree, do not silently pick one. Inspect the current repo state, identify the mismatch, and update the relevant `.agent` file as part of the same work when the change is intentional.

## 4. Clinical Safety Rules

Future agents must preserve these decisions:

- Matria is decision support only.
- Matria must not make autonomous diagnoses, prescriptions, or final triage decisions.
- Deterministic maternal safety rules run before LLM synthesis.
- AI outputs must preserve rule hits and uncertainty.
- Clinician approval is required before durable memory writes or FHIR export.
- Patient data must not be used for model training.
- Patient memory retrieval and writes must be scoped by patient and pregnancy episode.
- Sensitive actions must be audited.

If implementation changes any of these rules, update `PRD.md` and add or update an ADR.

## 5. When To Update `.agent`

Update `.agent` when implementation changes:

- product scope or hospital workflow
- clinical safety behavior
- RBAC roles or permissions
- API contracts or shared schemas
- database entities or migration assumptions
- AI provider, prompt contract, model behavior, or tool routing
- FHIR export behavior
- deployment topology, domains, secrets, VM paths, or scripts
- test strategy, acceptance criteria, or release process

Do not let `.agent` become stale after major implementation sessions.

## 6. When To Add Files

Add a new `.agent` file when:

- a new phase needs a dedicated kickoff document
- a major session needs handoff context
- a new operational area becomes too large for an existing doc
- a durable architecture decision needs an ADR under `docs/adr/`

Use these naming patterns:

- `sessionHandoff-YYYY-MM-DD.md`
- `phase{N}Kickoff.md`
- stable docs in `camelCase.md`
- ADRs in `docs/adr/000N-kebab-case-title.md`

Do not add scratch files or duplicate content that belongs in an existing source-of-truth document.

## 7. ADR Rules

Use ADRs for durable architecture decisions such as:

- AI provider boundaries and model governance
- patient memory scoping strategy
- RBAC model and permission hierarchy
- PostgreSQL/pgvector schema strategy
- deployment topology or rollback behavior
- FHIR export contract
- file storage and clinical media processing

ADRs must include status, date, context, decision, rationale, consequences, and follow-up work.

## 8. Commit Message Rules

Use conventional commit prefixes:

- `feat:` for user-visible features or new capabilities
- `fix:` for bug fixes, regressions, security fixes, and broken behavior
- `docs:` for documentation-only changes
- `test:` for test-only changes
- `refactor:` for behavior-preserving restructuring
- `ci:` for GitHub Actions and automation changes
- `build:` for build systems, Dockerfiles, and packaging
- `chore:` for maintenance and repo hygiene

Subjects should be imperative, concise, and specific. Prefer one logical change per commit.

## 9. Content Rules

When updating `.agent`:

- write for future implementation sessions, not external marketing
- separate locked product decisions from current repo status
- state whether a feature is implemented, planned, deferred, or externally provisioned
- preserve clinical safety constraints explicitly
- avoid unsupported assumptions about hospital policy, external integrations, or clinical validation
- keep deployment secrets out of repo docs except as names/placeholders

## 10. Required End-of-session Updates

After a major implementation or deployment-prep session, usually update:

1. `.agent/implementationPhases.md`
2. `.agent/phaseBacklog.md`
3. newest handoff or a new `sessionHandoff-YYYY-MM-DD.md`
4. `.agent/environmentMatrix.md` or `.agent/deploymentGuide.md` if environment assumptions changed
5. ADRs if a durable technical decision changed

If the session only makes small local edits, update only the docs that actually changed in meaning.
