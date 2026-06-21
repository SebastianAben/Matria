# ADR 0002: Application Foundation And ANC Workflow

Status: Accepted  
Date: 2026-06-22  
Decision owners: Matria project owner and Codex agents  
Related sources: `.agent/PRD.md`, `.agent/implementationPhases.md`, `.agent/sessionHandoff.md`

## Context

Matria started this session as a documentation-only repository. The user requested implementation through the first usable ANC encounter workflow, based on the previously approved implementation plan. The PRD requires an Express.js backend, Next.js frontend, TypeScript, self-hosted PostgreSQL with pgvector, full RBAC, audit logging, clinician-controlled ANC workflows, and a local development database managed by Docker.

The first implementation slice needed to establish the repository foundation, secure clinical data spine, and patient/pregnancy/encounter workflow without prematurely implementing later ambient intelligence systems such as Google STT, Gemini, MedGemma, rules, approvals, memory, or FHIR export.

## Decision

Matria now uses:

1. `pnpm` workspaces for the monorepo.
2. `apps/api` for the Express.js TypeScript backend.
3. `apps/web` for the Next.js TypeScript frontend.
4. `apps/e2e` for Playwright tests.
5. `packages/shared` for shared enums, validators, API response envelopes, and error codes.
6. Prisma for database schema, migrations, generated client, and typed data access.
7. Docker Compose with `pgvector/pgvector:pg16` for the local PostgreSQL development database.
8. Backend-owned email/password auth with secure HTTP-only cookie sessions.
9. `bcryptjs` password hashing for the first implementation slice.
10. RBAC middleware with PRD-defined default roles and action-level permissions.
11. Immutable audit events for sensitive clinical and administrative actions.
12. Metadata-only clinical file handling until the later media pipeline phase.

## Rationale

`pnpm` workspaces provide a fast and explicit monorepo structure for API, web, shared contracts, and E2E tests. This fits the implementation roadmap and keeps frontend clients from importing backend internals.

Prisma was chosen because the clinical domain has many entities and relationships, and the first release benefits from generated types, repeatable migrations, and straightforward CRUD ergonomics. The schema still keeps PostgreSQL as the source of truth and includes a direct SQL migration for `pgvector`.

Cookie sessions were chosen because the first release is a hospital web application, not a public multi-client API. Backend-owned sessions simplify revocation, RBAC checks, audit logging, and secure browser behavior.

`bcryptjs` was used instead of Argon2 for this slice because it avoids native build friction in the current environment. The security posture remains password-hash based, and the hashing implementation can be upgraded later through an ADR if Argon2 is validated in CI and deployment.

The frontend intentionally uses a restrained clinical product UI rather than a marketing or Awwwards-style landing page. The named taste skills were applied as constraints where appropriate: high contrast, stable grids, clear labels, no decorative meta labels, no emoji, no fake screenshots, no hidden button text, and reduced-motion-safe interaction feedback.

## Alternatives Considered

- `npm` workspaces: rejected because `pnpm` was selected in planning and gives better workspace ergonomics.
- Drizzle or Kysely: rejected for this first slice because Prisma speeds up schema and CRUD delivery for a broad clinical domain.
- JWT-first auth: rejected because the initial product is a browser-based hospital app where revocable backend sessions are simpler and safer.
- External identity provider first: deferred because the PRD lists hospital identity provider integration as a later decision.
- Argon2 first: deferred because native dependency friction could slow the first implementation slice. Revisit once CI and deployment images are stable.
- Full ambient workspace UI now: rejected because Phase 8 owns the full ambient interface. Phase 3 only needs patient, episode, encounter, consent, structured observation, and session note capture.

## Implementation Details

The repository now includes:

- Root workspace scripts for development, formatting, linting, typechecking, testing, building, E2E, and Docker database commands.
- Shared validators for patient creation, pregnancy episode creation, encounter creation, consent records, clinical file metadata, structured observations, session notes, and encounter transitions.
- Stable error codes including `UNAUTHENTICATED`, `FORBIDDEN`, `VALIDATION_FAILED`, `NOT_FOUND`, `CONFLICT`, `INVALID_STATE_TRANSITION`, `CONSENT_REQUIRED`, `SCOPE_MISMATCH`, and `INTERNAL_ERROR`.
- Express middleware for request IDs, structured errors, optional auth, required auth, and permission checks.
- Prisma entities for users, roles, permissions, sessions, audit logs, patient records, pregnancy episodes, encounters, consent records, clinical file metadata, structured observations, and session notes.
- Seed logic for default roles, permissions, and a bootstrap hospital admin.
- ANC backend routes for patient search/create/read, pregnancy episode create/list, encounter create/read/status transitions, consent create/list, file metadata create, observation create/list, session note read/update, and consent checks.
- Next.js routes for login, clinical workspace, patient/encounter capture, and basic admin management.
- Tests covering shared contracts, API health and unknown routes, auth/RBAC behavior, audit denials, clinical scoping, consent blocking, encounter transitions, structured observations, and session note persistence.

## Consequences

Positive consequences:

- The repository now has a runnable application structure instead of only documentation.
- Shared contracts reduce drift between backend and frontend.
- Auth, RBAC, audit, patient scope, consent, and session notes are first-class early rather than retrofitted later.
- Later ambient intelligence phases can build on explicit encounter, consent, observation, and note models.
- Frontend pages are already shaped around a clinician workflow, not a marketing shell.

Tradeoffs:

- Prisma adds generated-client and migration workflow requirements.
- `bcryptjs` is portable but may be weaker than Argon2 for a final production hardening pass.
- The first frontend is functional and clinical, but the full ambient intelligence workspace is intentionally deferred.
- DB-backed tests require local Docker/OrbStack to be running.

## Validation Plan

Completed validation:

- `pnpm install`
- `pnpm --filter @matria/api prisma:generate`
- `pnpm lint`
- `pnpm format:check`
- `pnpm typecheck`
- `pnpm --filter @matria/shared test`
- `pnpm --filter @matria/api exec vitest run src/tests/health.test.ts`
- `pnpm build`
- `pnpm --filter @matria/e2e exec playwright install chromium`
- `pnpm e2e`

Blocked validation:

- `pnpm db:up`
- Prisma migration execution against Docker PostgreSQL
- pgvector availability check
- seed execution against Docker PostgreSQL
- full API auth/RBAC/audit and clinical workflow tests

The blocker is local Docker/OrbStack availability. The Docker command failed because the expected socket at `/Users/khalfanishaquille/.orbstack/run/docker.sock` was unavailable.

## Risks

- If Prisma schema and SQL migration drift, migration validation will catch it only after Docker is available.
- If Docker is not consistently available for local development, DB-backed implementation progress will stall.
- Clinical UI routes currently call APIs directly from client components and may need a more robust data-fetching/session strategy as the app grows.
- The current admin UI is minimal and not yet a full hospital administration console.
- Exact clinical thresholds remain intentionally deferred to the advisory rule engine phase.

## Follow-up Work

1. Start Docker/OrbStack and run local PostgreSQL/pgvector.
2. Apply migrations and seed the bootstrap admin.
3. Run the full API test suite.
4. Mark the blocked Phase 2 and Phase 3 subphases done if DB-backed validation passes.
5. Add readiness coverage for database connectivity and migration state once the DB runtime is available.
6. Revisit Argon2 once the production Docker image and CI build path are stable.
7. Begin Phase 4 only after Phase 2 and Phase 3 database validation is complete.
