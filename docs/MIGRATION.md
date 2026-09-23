---
title: "Migration map"
description: "From the legacy single-file app to Next.js: architecture mapping, module status and the data migration steps."
category: plan
status: living
audience: ["developer", "agent"]
tags: ["tms"]
---

# Migration map — legacy single file → Next.js

Source: `legacy/asasline-demo.html` (16,686 lines, vanilla JS + PHP `api.php` over MySQL).
Target: this repository. Strategy: **strangler** — move one app at a time onto Postgres,
keep the legacy app serving the rest until each module has parity and tests.

## What changed in the architecture

| Legacy                                                        | New                                                                                                             |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| One HTML file, global arrays, `render()` rebuilds `innerHTML` | Next.js App Router, React Server Components, feature modules                                                    |
| STORE diff → `api.php` save every 700 ms, poll every 5 s      | Server actions per intent (create / update / cancel) in a transaction; Redis-cached reads with tag invalidation |
| MySQL `records(kind, id, body JSON, version)`                 | Postgres, one relational table per record kind (Drizzle), foreign keys for parties                              |
| `nextRef()` + after-the-fact renumbering on collision         | `sequences` upsert inside the insert's transaction — no collisions to repair                                    |
| `version` column + conflict card                              | `updateVersioned()` → `ConflictError` → toast "changed by someone else"                                         |
| PHP sessions, bcrypt, lockout counters in MySQL               | DB sessions (hashed token), bcryptjs (same hashes), Redis rate limit (6/email, 40/IP per 15 min)                |
| `perms` matrix, `can()`                                       | `src/domain/permissions.ts` (same matrix) + DAL `requirePermission()`                                           |
| String date helpers (`ymd/dnum/addDays`)                      | `src/domain/dates.ts` — same behaviour, stricter (rejects 2026-02-30), no `Date` parsing                        |

## Module status

| App        | Legacy lines             | State                                                                                              | Next step                                                                                  |
| ---------- | ------------------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Home       | 2283–2500                | ✅ dashboard (booking counts per status)                                                           | activity centre widgets                                                                    |
| Contacts   | 4478–5830                | ✅ list, search (incl. child addresses), create, edit, archive with in-use guard, put back         | child addresses & IBAN editor UI, VAT/EORI checks, phone actions                           |
| Quotations | 5828–7680                | 🟡 list, create (one route, one line), view, accept → booking                                      | multi-route editor, price sources (agreement → last price → catalogue), send & PDF         |
| Bookings   | 2501–4480, 7680–8320     | 🟡 list, filters, create (SB issued in tx), status, cancel with reason (tasks withdrawn), put back | per-field editing, parties, vessels & cut-offs, containers (ISO 6346 entry), documents tab |
| Activity   | 11550–12625, 9049–10236  | ⏳ schema in place (`activities`)                                                                  | my tasks, calendar, document rules engine, away & cover                                    |
| Discuss    | 8317–9050, 11550–12625   | ⏳                                                                                                 | message store, routing by role, Redis pub/sub for live updates                             |
| Accounting | 12625–14741              | ⏳                                                                                                 | invoices + gap-free series, payments, CODA, VAT return, Peppol, Odoo import                |
| Settings   | 10236–11550, 14742–15360 | ⏳ `config_tables` in place                                                                        | editors per table, People (switch off), audit viewer                                       |

## Data migration (when a module goes live)

1. Export the legacy `records` table per `kind` (JSON bodies).
2. A one-off script under `scripts/import/` maps each kind to its table, resolving party
   names to contact ids (the legacy 10.1 linking) and money to cents.
3. Set each `sequences` row to the highest issued number per month so numbering continues.
4. Users: copy email, name, role and the bcrypt hash; staff keep their passwords.
5. Verify counts and totals against the legacy office before switching the module over.
