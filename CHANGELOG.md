# Changelog

Keep a Changelog, SemVer. Every commit that touches source, tests, scripts, CI, migrations or docs adds a line under Unreleased in the same commit (CHANGE.1, CHANGE.2).

## [Unreleased]

### Fixed

- A bank line's de-duplication key now includes the payer's name: two payers sending the same amount with the same note on the same day were taken for one.
- Forms lost everything typed after a validation error (React 19 resets `<form action>` once the action returns); all stateful forms now submit through `ActionForm`.
- Success toasts never appeared when the action removed its own component (archive, cancel, remove container); toasts now fire when the result arrives (`useToastedAction`).
- Emptying an optional field (contact phone, booking vessel…) did not clear it, because Drizzle skips `undefined`; updates now send null (`nullMissing`).
- CI ran the opt-in scrub scan that abatty.config.json disables, failing every push; the step is removed.
- The generated CI workflow had an invalid YAML line (bypass-rate step), now a block scalar.

### Added

- Accounting, step 3 — supplier bills: record a supplier's invoice (for the office or as a cost of a booking, lines on purchase accounts 604000/61x/230000) in our own BILL/YYYY/NNNNN series with their number; the same supplier number cannot be recorded twice; from €5,000 a second person approves before payment (four eyes, refused for the one who recorded it); bills are paid by hand or from outgoing bank lines matched by our number, their number or their IBAN + amount; a booking's Billing tab shows its costs and margin. Migration 0006.
- Accounting, step 2 — payments and the bank: register payments against an invoice (never more than is open; a shortfall can be written off to 657000/658000/758000), reverse them with a reason and a date (never deleted); the invoice's paid / partly paid / overdue state is read from the ledger each time. Import CODA or bank CSV statements (EN/FR/NL headers, both decimal conventions; overlapping exports skipped by a de-duplication key); each line proposes the invoice it pays — structured communication, invoice number in the text, known IBAN with the exact open amount, or the amount alone — and auto-match books only the certain ones. Payments and Bank screens. Migration 0005.
- Accounting, step 1 — sales invoices and credit notes: invoice a booking from its quotation lines (partially, to any party on the booking; over-billing refused again at issue), drafts with extra lines, issue with the unbroken yearly series INV/YYYY/NNNNN taken in the issuing transaction, due date from the payment term, +++OGM+++ reference, VAT per rate with the legal mention of each exempt code, credit notes in their own series with an optional corrected draft, discarding drafts with a reason, a printable invoice, and a Billing tab on each booking. Migration 0004.

### Fixed

- The Accounting screens no longer carry two h1 headings (layout title plus page title).
- Discuss: one message store for e-mail, WhatsApp, calls, the website and internal chat. Internal rooms per role and for the whole office (a bare SB/QT number links the message); a waiting queue routed by topic to a role, where the first to take a message owns it and anything answered on the same file leaves the queue; logging a message received elsewhere; writing from a booking with the subject key [SB…/MSG], recorded and opened in the mail or WhatsApp app, so replies re-thread by the key; the message guard flags a sender who is not a party on the booking; screens refresh live through Redis pub/sub and Server-Sent Events. Migration 0003.
- Document rules engine (legacy DOC_RULES): a pure, tested engine picks the rules for a booking (destination from the port of discharge's UN/LOCODE, loading-port rules beating general ones, export/import/return), dates each step from its anchor (working days skip weekends and BE + destination holidays; a calendar-day deadline on a closed day moves back and says why), and fails closed on unknown prerequisites. A sync opens steps as tasks once their prerequisites are done, redates open steps when the booking's dates move, and withdraws steps whose rule no longer applies. The legacy rule book and 2026 holidays ship as defaults; Settings › Document rules and Holidays edit them and re-plan every live booking. Bookings gain customs/VGM/SI closing and port cut-off dates and a Documents tab; blocking steps show ⛔.
- Activity: My tasks (assigned to me, or to my role and not yet taken), Everyone and per-person views, Overdue · Today · Upcoming · No date buckets, search by task or SB ref, create, done/reopen, withdraw/put back with a reason, hand over to a person or a role, a Monday-first month calendar, a Tasks tab on each booking, and my overdue/today counts on Home. State moves are a tested domain rule (`nextState`).
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
