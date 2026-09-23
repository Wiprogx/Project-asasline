# ASASLINE TMS

Transportation management for ASASLINE S.A. (Brussels sea-freight forwarding): quotations,
bookings, contacts, and — as the migration continues — activity, discuss, accounting and
settings. This repository replaces the legacy single-file app kept under `legacy/`.

**Stack:** Next.js 16 (App Router, Turbopack, Server Actions) · React 19 · TypeScript ·
PostgreSQL 17 + Drizzle ORM · Redis 8 (ioredis) · shadcn/ui (Base UI) + Tailwind CSS 4 ·
zod 4 · Vitest · Abatty (gate, ratchet, rules).

## Getting started

Needs Node ≥ 20.9 and Docker (or your own Postgres + Redis).

```sh
npm install
cp .env.example .env.local        # then edit SEED_ADMIN_* at least
npm run db:up                     # Postgres + Redis in docker
npm run db:migrate                # apply drizzle/ migrations
npm run db:seed -- --demo         # first Admin, config tables, sample contacts
npm run dev                       # http://localhost:3000
```

## Structure

```
src/
├── app/                 routes only — (auth)/login, (office)/… pages, api/health
├── features/<name>/     schemas.ts · queries.ts · actions.ts · components/
│   ├── auth/  contacts/  bookings/  quotations/
├── components/
│   ├── ui/              shadcn primitives (vendored)
│   ├── shared/          page header, field, reason dialog, search…
│   └── layout/          app sidebar
├── server/              db/ (schema, client) · cache/ (Redis) · auth/ (session, DAL)
│                        sequences · audit · versioned (optimistic concurrency) · clock
├── domain/              pure business rules + tests (dates, refs, OGM, IBAN, ISO 6346, permissions)
├── env.ts               the only process.env reader
└── proxy.ts             optimistic auth redirect (Next 16's middleware)
```

The layer rules are enforced, not described: see `CLAUDE.md` §3 and `.dependency-cruiser.cjs`.

## Quality gate (Abatty)

```sh
npm run gate           # format → lint → typecheck → import graph → dead code → tests → ratchet → secrets → audit
npx abatty             # where the repository stands
npx abatty ratchet --controls   # prove every probe can fail
```

The pre-push hook runs the gate. Project-specific probes in `abatty.probes.mjs` hold the
legacy business invariants at zero (no hard deletes, no float money, no clock in the domain,
no ref rewrites, no unguarded server functions) — see `docs/INVARIANTS.md`.

## Docs

- `docs/MIGRATION.md` — module-by-module status and the data migration plan
- `docs/INVARIANTS.md` — the rules that must never break and what holds each
- `legacy/ASASLINE_TMS_Technical_Reference.md` — the legacy system, in full
