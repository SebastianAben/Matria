# ADR 0009: Backend-Driven Progressive Web Flow

Status: Accepted  
Date: 2026-06-22

## Context

The Phase 8 reference-image frontend used local fixture data so the shell, layouts, and review surfaces could be evaluated before the full clinical workflow was wired. After Phase 9 added approved memory writeback, referral/teleconsult summaries, and FHIR export, that fallback became unsafe for product behavior: local fixture content could make a consultation appear complete before clinicians had actually entered or approved data.

## Decision

Phase 9 web screens now use backend data only. The frontend must render persisted API data, loading states, empty states, permission/consent/safety errors, or clinician-entered unsaved form text.

- Patient lookup, registration, pregnancy episodes, encounters, consent, observations, notes, transcript turns, preflight, synthesis, review, memory writeback, FHIR exports, admin users, roles, health, and audit logs are all loaded or mutated through API routes.
- Query parameters carry clinical scope across the existing page map: `patientId`, `pregnancyEpisodeId`, `encounterId`, `sessionId`, and `outputId`.
- Local clinical fixture files and demo fallback branches are removed from the web app.
- Frontend tests and ESLint prevent reintroducing `demo-data` imports or fixture-only clinical identities.
- Local mock providers remain backend-only development providers. They may produce transcript, synthesis, or evidence data after a clinician-triggered API action, but the web app cannot fabricate clinical rows, summaries, memory, or FHIR bundles.

## Consequences

- New encounters start with empty observations, transcript, rule results, AI drafts, evidence, memory, and exports.
- Clinicians see consultation data appear progressively as they record consent, enter observations, save notes, add transcript, run preflight, run synthesis, approve/edit outputs, write memory, and generate FHIR exports.
- Playwright coverage must create a real clinician account through Admin before performing clinical workflow actions, because the seeded admin remains operational-only.
- The old Phase 8 design-review fallback is superseded for product pages; future synthetic ANC scenarios belong in backend seed/test tooling, not frontend runtime fixtures.
