# Changelog

Keep a Changelog, SemVer. Every commit that touches source, tests, scripts, CI, migrations or docs adds a line under Unreleased in the same commit (CHANGE.1, CHANGE.2).

## [Unreleased]

### Fixed

- Forms lost everything typed after a validation error (React 19 resets `<form action>` once the action returns); all stateful forms now submit through `ActionForm`.
- Success toasts never appeared when the action removed its own component (archive, cancel, remove container); toasts now fire when the result arrives (`useToastedAction`).
- Emptying an optional field (contact phone, booking vessel…) did not clear it, because Drizzle skips `undefined`; updates now send null (`nullMissing`).
- CI ran the opt-in scrub scan that abatty.config.json disables, failing every push; the step is removed.
- The generated CI workflow had an invalid YAML line (bypass-rate step), now a block scalar.

### Added

- Bookings: Edit tab (parties by contact id, route, loading, vessel/voyage, ETD/ETA guard, carrier and B/L numbers), Containers tab (ISO 6346 numbers, seals, tare/cargo, VGM against the type maximum, add/remove with a reason) and History tab.
- Playwright browser suite (smoke, booking journey, settings), run locally against the dev database and in CI against a fresh Postgres and Redis.
- The unguarded-server-function probe also scans cached const queries and `*-actions.ts` files.
- Settings: People (add, change role, switch off/on; nobody switches themselves off and one active Admin always remains), Lists editor over `config_tables` with optimistic versions, Audit log viewer, and My account (change password, other sessions signed out).
- GitHub Actions workflow running the same gate as the pre-push hook (`abatty ci`), plus database and build jobs.
- Next.js 16 app (App Router, Turbopack) replacing the legacy single-file TMS, strangler-style.
- Postgres schema via Drizzle (14 tables: identity, contacts, quotations, bookings, containers, activities, config tables, sequences, audit) and the initial migration.
- Redis read-through cache with tag invalidation and a Redis-backed login rate limiter, both degrading gracefully without Redis.
- Auth: bcrypt passwords (legacy hashes compatible), hashed DB sessions, DAL permission checks, Next 16 proxy redirect.
- Domain layer ported from the legacy engine with unit tests: clock-free dates, QT/SB refs, OGM, IBAN, ISO 6346, permissions matrix, VAT defaults.
- Contacts (list, search, create, edit, archive with in-use guard, put back), Quotations (create, view, accept → booking), Bookings (create with SB in transaction, status, cancel with reason, put back).
- shadcn/ui (base-nova, Base UI) with the legacy dark palette; app shell with permission-filtered sidebar.
- The engineering standard's instrument: harness, gate, import graph, dead code (`abatty init`), with project probes for the legacy invariants (`abatty.probes.mjs`), project rules (`abatty.rules.mjs`) and the layer boundary map in `.dependency-cruiser.cjs`.
