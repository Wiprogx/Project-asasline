# CLAUDE.md - ASASLINE TMS

A Transportation Management System for ASASLINE S.A., a Brussels sea-freight forwarder
(quotations → bookings → documents → invoices). It replaces a 16,686-line single-file app
(`legacy/asasline-demo.html`, described in `legacy/ASASLINE_TMS_Technical_Reference.md`)
with Next.js 16 + Postgres/Drizzle + Redis + shadcn/ui, one module at a time.

@AGENTS.md

Path-scoped rules live in `.claude/rules/<topic>.md`. The gate is `npm run gate` (Abatty).

## 1. The non-negotiables

The office's invariants, full list in `docs/INVARIANTS.md`; each INV.n is held by a probe in
`abatty.probes.mjs` or named review-only there.

1. **No delete** of anything numbered or referenced: cancel / archive / withdraw with a reason,
   reversible. (`tms.hardDelete` = 0)
2. **Refs are issued once** by the DB sequence inside the insert's transaction (`nextRef`),
   and never rewritten. (`tms.refRewrite` = 0)
3. **Money is integer cents**; no float column. (`tms.floatMoney` = 0)
4. **Dates are "YYYY-MM-DD" strings**; `src/domain` never reads a clock, only
   `src/server/clock.ts` does. (`tms.domainClock` = 0, `valid.utcDay`)
5. **Every exported feature query/action checks permission first** via the DAL
   (`requirePermission`). The proxy is only a redirect. (`tms.unguardedServerFn` = 0)
6. **Updates are optimistic**: `updateVersioned()` with the version the user read; a stale
   write is a `ConflictError`, never a silent overwrite.
7. **Roles, not names**, in rules and routing; `can()` fails closed.
8. **Adding a country, port, document or rule is a `config_tables` row**, not code.
9. UI English; correspondence in the contact's language; dates ISO.

## 2. Commands

| Command                                    | What                                                       |
| ------------------------------------------ | ---------------------------------------------------------- |
| `npm run db:up`                            | Postgres 17 + Redis 8 via docker compose                   |
| `npm run db:migrate` / `db:generate`       | apply / create migrations in `drizzle/` (protected path)   |
| `npm run db:seed [-- --demo]`              | first Admin + default config tables (+ sample contacts)    |
| `npm run dev` / `build`                    | Next.js (Turbopack)                                        |
| `npm test`                                 | Vitest unit tests (`src/**/*.test.ts`)                     |
| `npm run typecheck`                        | `next typegen && tsc --noEmit` (route types are generated) |
| `npm run graph` / `dead`                   | dependency-cruiser boundary map / knip dead code           |
| `npm run gate` / `gate:fast`               | the whole gate; the pre-push hook runs it                  |
| `npx abatty` / `abatty ratchet --controls` | status / prove every probe can fail                        |

## 3. Boundary map

Arrows point down only. Each forbidden arrow is one rule in `.dependency-cruiser.cjs`.

| Layer                             | Holds                                                                              | May import                                                                                            |
| --------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `src/app/`                        | routes only: thin pages, layouts, `api/health`                                     | features, components, server/auth, server/clock, server/config-tables, domain — **never** `server/db` |
| `src/features/<name>/`            | `schemas.ts` (zod) · `queries.ts` · `actions.ts` ("use server") · `components/`    | components, domain, server, lib — **never another feature**                                           |
| `src/components/ui/`              | shadcn primitives (vendored, Base UI)                                              | `lib/utils` only                                                                                      |
| `src/components/{shared,layout}/` | app-wide building blocks                                                           | ui, domain, lib, hooks — **never server**                                                             |
| `src/server/`                     | db (Drizzle schema + client), cache (Redis), auth (session, DAL), sequences, audit | domain, env                                                                                           |
| `src/domain/`                     | pure business rules ported from the legacy engine                                  | **nothing** (no npm, no framework, no clock)                                                          |
| `src/env.ts`                      | the only `process.env` reader, zod-parsed at boot                                  | zod                                                                                                   |

A page composes features (e.g. bookings/new asks contacts for the client picker); features
never reach into each other. Client components never import `server/` — server modules
start with `import "server-only"` so a mistake fails the build.

## 4. Conventions that surprise

- Next 16: `middleware` is now `src/proxy.ts`; `params`/`searchParams`/`cookies()` are async;
  use the global `PageProps<"/route">` / `LayoutProps` helpers. Read `node_modules/next/dist/docs/`.
- shadcn here is the **base-nova** style on **Base UI**: no `asChild`, use `render={<Link/>}`.
- Plain forms use `NativeSelect` (posts with FormData); server actions return `ActionResult`
  and forms read it with `useActionState` + `useActionToast`.
- Redis is an accelerator, never the truth: `cached()` and the rate limiter fall back when it
  is down or unset. Every write path calls `invalidateTags()` **and** `revalidatePath()`.
- Seed/reference constants in `src/domain` are defaults; the running app reads `config_tables`.
- `legacy/` is read-only reference. Port behaviour from it, never copy its globals.

## 5. Secrets and configuration

`.env.local` (gitignored; template `.env.example`): `DATABASE_URL`, `REDIS_URL` (optional),
`APP_TIMEZONE` (Europe/Brussels), `SESSION_HOURS`, `SEED_ADMIN_*` (seed only). Sessions are
random tokens in an httpOnly cookie; the DB stores only their SHA-256. Passwords are bcrypt
(legacy PHP `$2y$` hashes verify unchanged).

## 6. Size, shape and quality limits

Abatty's per-kind budgets (`.claude/rules/size-limits.md`): page ≤ 100 code lines,
component ≤ 250, module ≤ 300, hard cap 800. `any`/`@ts-ignore` are counted by
`types.escapes` and may only fall. Lint runs with `--max-warnings=0`.

## 7. Delivery rules - every change is recorded

- Every commit touching `src/`, `scripts/`, `drizzle/` adds a `CHANGELOG.md` entry.
- A new guard is mutation-tested: break what it protects, watch it go red, restore.
- `main` is protected: work on `<type>/<short-description>` branches; the gate must be green.
- A schema change is a new migration via `db:generate`, never an edit of an applied one.

## 8. Skills and agents

`adopt-standards` (skill) runs one Abatty adoption phase; `standards-reviewer` /
`standards-adopter` (agents) review and apply the standard. See `.claude/`.

## 9. Autonomy contract

Unattended runs take the default below and record it in `docs/ADOPTION_DECISIONS.md`.

| Question                       | Default                                                      |
| ------------------------------ | ------------------------------------------------------------ |
| A legacy behaviour looks wrong | Port it as-is, add a note in `docs/MIGRATION.md`, ask        |
| A new list or rule is needed   | A `config_tables` entry with a schema, not a constant        |
| A probe goes red               | Fix the code; never raise a floor without a reason and owner |

## 10. Known gaps between docs and code, and deviations from the standard

- No integration test suite against a real Postgres yet (database suite is skipped by the gate).
- No Playwright/axe browser suite yet (the build + e2e suite is skipped by the gate).
