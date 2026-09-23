# Changelog

Keep a Changelog, SemVer. Every commit that touches source, tests, scripts, CI, migrations or docs adds a line under Unreleased in the same commit (CHANGE.1, CHANGE.2).

## [Unreleased]

### Added

- Next.js 16 app (App Router, Turbopack) replacing the legacy single-file TMS, strangler-style.
- Postgres schema via Drizzle (14 tables: identity, contacts, quotations, bookings, containers, activities, config tables, sequences, audit) and the initial migration.
- Redis read-through cache with tag invalidation and a Redis-backed login rate limiter, both degrading gracefully without Redis.
- Auth: bcrypt passwords (legacy hashes compatible), hashed DB sessions, DAL permission checks, Next 16 proxy redirect.
- Domain layer ported from the legacy engine with unit tests: clock-free dates, QT/SB refs, OGM, IBAN, ISO 6346, permissions matrix, VAT defaults.
- Contacts (list, search, create, edit, archive with in-use guard, put back), Quotations (create, view, accept → booking), Bookings (create with SB in transaction, status, cancel with reason, put back).
- shadcn/ui (base-nova, Base UI) with the legacy dark palette; app shell with permission-filtered sidebar.
- The engineering standard's instrument: harness, gate, import graph, dead code (`abatty init`), with project probes for the legacy invariants (`abatty.probes.mjs`), project rules (`abatty.rules.mjs`) and the layer boundary map in `.dependency-cruiser.cjs`.
