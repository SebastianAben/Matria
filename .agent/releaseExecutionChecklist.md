# Matria Release Execution Checklist

Document status: Draft  
Created: 2026-06-09  
Purpose: operator checklist for production release windows

## 1. Pre-release Checks

- Confirm release branch or commit SHA.
- Confirm CI passed on the release SHA.
- Confirm no high-risk clinical safety issues are open.
- Confirm migrations were reviewed.
- Confirm rollback target exists if this is not the first release.
- Confirm hospital stakeholders approved the release window.
- Confirm production secrets are present and current.
- Confirm DNS points to the production VM.
- Confirm recent database backup exists once backup tooling is implemented.

## 2. Clinical Safety Checks

- Deterministic rules test suite passed.
- RBAC test suite passed.
- Approval-gate test suite passed.
- FHIR export tests passed.
- Audit logging tests passed.
- AI provider failure behavior was tested or explicitly waived for the release.

## 3. Deploy Execution

- Trigger production deploy from GitHub Actions.
- Watch secret validation.
- Watch SSH setup and archive upload.
- Watch remote preflight.
- Watch Compose build and service startup.
- Watch smoke checks.
- Watch readiness assertion.

## 4. Post-deploy Validation

- Open web domain.
- Confirm login works.
- Confirm admin can view users and roles.
- Confirm clinician can open encounter workspace.
- Confirm API `/health` passes.
- Confirm API `/ready` passes.
- Confirm audit events are being written.
- Confirm no unexpected errors in API or web logs.

## 5. Rollback Criteria

Rollback if any of these occur:

- API readiness fails after deploy.
- Web cannot load.
- Authentication is broken.
- RBAC enforcement is broken.
- Encounter workflow cannot be opened.
- Deterministic safety rules fail in production validation.
- Audit logging is not recording sensitive actions.

## 6. Release Notes

Release notes should include:

- release SHA
- user-facing changes
- clinical safety changes
- migration notes
- deployment notes
- known issues
- rollback SHA, if applicable

## 7. Handoff

After release:

- Update `.agent/phaseBacklog.md`.
- Add or update a `sessionHandoff-YYYY-MM-DD.md` if the release changed recommended next work.
- Update `deploymentGuide.md` if any operational steps changed.
- Add an ADR if a durable architecture decision changed.
