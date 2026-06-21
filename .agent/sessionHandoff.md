# Matria Session Handoff

Document status: Active  
Created: 2026-06-22  
Last updated: 2026-06-22  
Purpose: stable handoff for the latest substantive Matria task/session

## Current Objective

Implement Matria through the first usable ANC encounter workflow: monorepo foundation, Express API, Next.js web shell, shared contracts, Docker PostgreSQL/pgvector config, Prisma schema, auth/RBAC/audit, and patient/pregnancy/encounter capture.

## Current Phase

- Phase: 2 - Database, Auth, RBAC, And Audit Core
- Subphase: 2.1 - Docker PostgreSQL and pgvector setup
- Status: blocked

## Files Changed This Session

- Root workspace files: `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `tsconfig.base.json`, `eslint.config.mjs`, `.prettierrc.json`, `.gitignore`, `.env.example`, `docker-compose.yml`
- Shared package: `packages/shared/`
- API app: `apps/api/`
- Web app: `apps/web/`
- E2E app: `apps/e2e/`
- Agent memory: `.agent/implementationPhases.md`, `.agent/sessionHandoff.md`
- ADRs: `docs/adr/0002-application-foundation-and-anc-workflow.md`

## Completed Work

- Created a `pnpm` monorepo with `apps/api`, `apps/web`, `apps/e2e`, and `packages/shared`.
- Added strict TypeScript, Prettier, ESLint, Vitest, and Playwright.
- Added Docker Compose for local PostgreSQL using the `pgvector/pgvector:pg16` image.
- Added shared enums, Zod validators, stable API response envelopes, and stable error codes.
- Built an Express API with request IDs, CORS, JSON parsing, `/health`, `/ready`, structured errors, and route modules.
- Added Prisma schema and initial SQL migration for users, roles, permissions, sessions, audit logs, patients, pregnancy episodes, encounters, consent records, clinical file metadata, structured observations, and session notes.
- Added cookie-session auth with password hashing, login/logout/session endpoints, RBAC middleware, default PRD roles, and permission constants.
- Added immutable audit logging for sensitive actions and permission denials.
- Added admin APIs for users, roles, and role assignment.
- Added ANC APIs for patient search/create/read, pregnancy episodes, encounters, lifecycle transitions, consent records, clinical file metadata, structured observations, consent checks, and session notes.
- Added a Next.js clinical product UI with login, workspace, patients/ANC capture, and admin routes.
- Applied frontend taste constraints where appropriate for a regulated clinical product UI: compact clinical density, clear labels, high contrast buttons, stable grids, reduced-motion support, no decorative marketing labels, no fake screenshots, and no emoji.
- Added API and shared tests plus Playwright smoke tests.

## Decisions Made

- Use `pnpm` workspaces for the monorepo.
- Use Prisma as the first database/migration layer.
- Use backend-owned email/password authentication with secure HTTP-only cookie sessions.
- Use `bcryptjs` for this first slice because it installs cleanly and avoids native Argon2 build friction in the current environment.
- Use local Docker PostgreSQL with pgvector as the normal development database target.
- Keep Phase 3 clinical file handling metadata-only; binary storage remains deferred to the media phase.
- Keep STT, Gemini, MedGemma, rule engine, approvals, memory, FHIR, and full ambient workspace work deferred to later phases.
- Treat Phase 2 and Phase 3 as implemented but blocked from completion until the Docker database runtime can be started and DB-backed tests pass.

## Blockers And Open Questions

- Local Docker/OrbStack daemon is not running. `pnpm db:up` failed because the Docker socket at `/Users/khalfanishaquille/.orbstack/run/docker.sock` is unavailable.
- Because Docker PostgreSQL is unavailable, migrations, pgvector availability, seed, full API auth/RBAC/audit tests, and clinical scoping tests could not be validated.

## Next Recommended Action

Start the local Docker runtime, then run:

1. `pnpm db:up`
2. `pnpm --filter @matria/api prisma:migrate`
3. `pnpm --filter @matria/api seed`
4. `pnpm --filter @matria/api test`

If those pass, update `.agent/implementationPhases.md` to mark Phase 2 and Phase 3 blocked subphases as `done`.

## Tests And Checks Run

- `pnpm install` passed after approving required build scripts for Prisma, esbuild, and sharp.
- `pnpm --filter @matria/api prisma:generate` passed.
- `pnpm lint` passed.
- `pnpm format:check` passed.
- `pnpm typecheck` passed.
- `pnpm --filter @matria/shared test` passed.
- `pnpm --filter @matria/api exec vitest run src/tests/health.test.ts` passed.
- `pnpm build` passed.
- `pnpm --filter @matria/e2e exec playwright install chromium` installed the local Chromium browser.
- `pnpm e2e` passed.
- `pnpm db:up` failed because local Docker/OrbStack is not running.
- `pnpm --filter @matria/api test` partially passed: API health tests passed, DB-backed tests failed because PostgreSQL at `localhost:54329` is unavailable.
