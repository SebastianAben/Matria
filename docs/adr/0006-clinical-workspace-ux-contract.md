# ADR 0006: Clinical Workspace UX Contract

Status: Accepted  
Date: 2026-06-22

## Context

Matria is ready to begin Phase 8, which turns the compact encounter capture UI into the full clinician-facing ambient ANC workspace.

The existing docs and backend routes already define many clinical objects and permissions, but the frontend needed a non-technical planning baseline before implementation. The user specifically requested a pages document that leans toward UI/UX and avoids technical API detail and visual design prescriptions. The user later requested that `brandkit` be analyzed and translated into page guidelines without adding specific design styles.

Phase 8 also sits immediately before Phase 9 approvals, memory writeback, referral finalization, and FHIR export. The frontend needs to show review-required draft states without pretending that final approval or export behavior exists before it is implemented.

## Decision

Create `.agent/pages.md` as the Phase 8 frontend UX contract.

The document describes:

- frontend page map
- primary user needs
- navigation model
- global behaviors
- clinical workspace sections
- screen contents
- interaction behavior
- empty, loading, degraded, and error states
- end-to-end user flows
- product component responsibilities
- brand-system UX guidance
- Phase 8 and Phase 9 boundaries

The document intentionally excludes:

- API implementation details
- database or schema detail
- component styling
- fonts
- colors
- spacing
- visual design treatment

Brand guidance in the document is limited to product meaning, content behavior, trust, identity usage, asset restraint, workflow coherence, and anti-generic UX rules. It does not define the visual identity itself.

## Rationale

Phase 8 implementation needs enough product clarity to avoid building another compact technical demo page. A UX-first contract helps future work organize the frontend around clinical tasks: patient lookup, encounter setup, consent capture, ambient session work, transcript correction, note editing, rules, AI drafts, evidence review, suggestions, artifact history, and closeout.

Keeping visual design out of the document prevents the page contract from becoming a style guide. Future frontend implementation can choose appropriate layout and component styling while still satisfying the required user flows and screen behavior.

The brand-system guidance uses `brandkit` as a strategy lens. For Matria, brand quality should come from protected clinical continuity, calm decision support, careful evidence handling, clinician authority, maternal safety without alarmism, and hospital-grade accountability. These are UX and content principles, not a palette or component styling system.

Separating Phase 8 review-required states from Phase 9 approval behavior preserves the clinical safety boundary that AI outputs and evidence findings are drafts until reviewed and approved by an authorized clinician.

## Alternatives Considered

- Write a technical frontend spec around endpoints and data models: rejected because the user requested a UI/UX-leaning document rather than a technical plan.
- Put page behavior directly in the PRD: rejected because the PRD is the broader product contract, while Phase 8 needs a dedicated implementation-facing UX baseline.
- Wait to document pages while implementing: rejected because the user explicitly asked for context gathering and a pages document before frontend implementation.
- Include visual styling guidance: rejected because the request explicitly excluded design details.
- Generate a visual brand kit image: rejected because the user asked to add guidelines into `pages.md`, not create imagery.

## Implementation Details

`.agent/pages.md` now covers:

- Login
- Workspace home
- Patient search and registration
- Patient detail
- Pregnancy episode setup
- Encounter setup
- Consent capture
- Clinical workspace
- Admin pages
- Audit pages
- Routine ANC, high-risk, missing context, transcript correction, evidence review, suggestion resolution, and review/approval flows
- Brand-system UX guidance for strategy, voice, identity usage, page behavior, asset restraint, and anti-generic product rules
- Phase 8 versus Phase 9 ownership

`.agent/implementationPhases.md` now lists `.agent/pages.md` as a Phase 8 deliverable and directs implementation to use it as the UX contract.

`.agent/sessionHandoff.md` now records the Phase 8 planning baseline and next recommended frontend implementation steps.

## Consequences

Positive consequences:

- Phase 8 can begin from a clear page and flow contract.
- Frontend work can stay focused on clinical UX instead of backend route inventory.
- Review-required content and final approvals remain conceptually separate.
- The implementation can be tested against user flows, not only API calls.
- Brand consistency can be assessed through language, workflow coherence, and review-state clarity without freezing visual design choices.

Tradeoffs:

- The document does not specify visual treatment, so frontend implementation still needs a separate design pass or careful in-code design decisions.
- Some Phase 9 interactions are described only as boundaries or future-facing review actions, because final backend approval behavior is not implemented yet.
- Brand guidance may need refinement after a formal identity or visual design pass exists.

## Validation

This is a documentation-only decision. Validation should happen through Phase 8 implementation and tests:

- patient navigation and encounter setup tests
- clinical workspace flow tests
- transcript correction tests
- session note tests
- rule display and acknowledgement tests
- AI draft, suggestion, evidence, and artifact history tests
- RBAC affordance tests
- degraded-state tests
- review of product language and workflow states against the brand-system UX guidelines

## Risks

- If implementation treats `.agent/pages.md` as a visual design guide, it may overstep the document's purpose.
- If brand guidance is interpreted as decoration instead of workflow discipline, the product may become less clinically useful.
- If Phase 8 implements Phase 9 approval semantics early, clinical safety boundaries could become unclear.
- If future changes modify frontend behavior without updating `.agent/pages.md`, the UX contract may become stale.

## Follow-up Work

1. Implement Phase 8.1 patient and encounter navigation from `.agent/pages.md`.
2. Split the compact patient page into focused workspace areas while preserving current clinical capabilities.
3. Add tests that follow the documented user flows.
4. Revisit `.agent/pages.md` after Phase 9 approval and export workflows are implemented.
