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

Measured from the code on 2026-10-20, not from this file, and moved on 2026-10-21 as gaps were
closed: every legacy screen, button and rule in the app's line range was listed and looked for
in `src/`. Done means a page or action actually uses it; a domain function nothing calls counts
as partial. Score = (done + ½ partial) / total, every feature weighing the same.

| App                   | Legacy lines            | Done | Partial | Missing | Score   |
| --------------------- | ----------------------- | ---- | ------- | ------- | ------- |
| Accounting            | 12625–14741             | 55   | 4       | 5       | 89%     |
| Settings and platform | 10236–11550, 14742–end  | 45   | 7       | 3       | 88%     |
| Bookings              | 2501–4480, 7680–8320    | 44   | 7       | 11      | 77%     |
| Quotations            | 5828–7680               | 37   | 11      | 9       | 75%     |
| Activity and Discuss  | 8317–10236, 11550–12625 | 28   | 8       | 7       | 74%     |
| Home and Contacts     | 2283–2500, 4478–5830    | 38   | 9       | 11      | 73%     |
| **Total**             |                         | 247  | 46      | 46      | **80%** |

The go-live import (below) carries users and contacts so far.

## Gap backlog (legacy → new, from the code audit of 2026-10-20)

Ranked by what the office would notice first. Each item is ported as its own step; a new list
or rule becomes a `config_tables` row with a Settings editor, never a constant (invariant 8).
Lnnnn is a line of `legacy/asasline-demo.html`.

- **Quotations** — door/port service, loading address, stops, per-box
  address and loading mode (L7091–7120); a new quotation with several destinations from the
  ocean-leg picker (L6738–6990); the last/agreed price hints in the line dialog (L7206); comparing other lines to the same
  port and the auto-created inland item "Needs pricing" (L7300–7350, L7406); accepting several
  destinations at once (L10149); release mode and contract/spot on the quotation (L7885,
  L7076); the follow-up letter on a second send (L10119); Export/Import filter and richer list
  rows (L6712–6731); search over destination and commodity (L6708); validity editable with an
  expired badge; the free-time picker and its warning (L9920, L7177).
- **Bookings** — the carrier step closing on the carrier's booking number (L7691); the originals' third
  step (received / came back, signed by) and the courier label (L3613–3622); "Send" per
  document (L3920); the loading-after-cut-off warning and the box totals (L3556, L3690–3708);
  the CMR asked for when loading runs over (L3550); the extra customs declaration (L8071–8105);
  the unfiled-files inbox (L8199–8243) and per-container document requirements; the vessel
  card with actual dates and delay on the booking (L3514); the seal history (L3645); the
  cancellation-reasons report (L3008) and cancel from the list row (L2923); "quoted with X,
  booked with Y" (L3568, L3746).
- **Activity and Discuss** — a threaded Messages tab (L8714); the call log (duration, outgoing calls, caller lookup, missed call →
  call-back task; L12133–12238); an unclaimed message escalating into a task (L11747); the bell
  counting unanswered messages (L2540); pop-up notifications (L11646–11735); direct messages,
  unread counts and files in the internal chat (L11825–11872); re-link a message, mark it
  general or turn it into a task (L12615–12620); the "document missing" and "invoice overdue"
  automatic triggers; scope tabs, blocking first, the "X covers" badge and the orphan filter on
  the task list (L12491, L12578); the message guard asking before a reply (L8793–8834); voice
  notes (L11941–12034).
- **Accounting** — a bank line settling several invoices from the matching screen (L13415);
  the chart of accounts' Odoo import (L14600); the close-period preview (L13913); the Odoo number during the
  parallel run (L12894); VAT and payer per draft line (L12812, L12865); a booking picker in
  Accounting (L14717); loading a saved copy (L14443).
- **Home and Contacts** — documents of the contact's own (L4860, L5200); "+ Activity" on a contact and its
  full task list (L4768, L4852); the money summary on the Invoices tab (L4823); the VAT register lookup and the EORI
  duplicate check (L5270, L5362); the stats strip, "used as" badges and tab counts
  (L4746–4757); detach an address into its own contact (L5062–5140); sending from the contact
  logged to its messages (L4772–4790); the Map and Tasks views and the kanban (L4614, L4641);
  industries as a multi-pick; the dial code from the country.
- **Settings and platform** — the record pager with arrow keys and the "Back to" bar
  (L2420–2501); choosing "use theirs / keep mine" on a conflict (L16567); a global saved /
  offline indicator (L16464); the Integrations panel (L15133–15184); rename a person (L14833);
  link a carrier to its agent (L15076); the Settings overview with counts (L14851); demo
  material on a screen (L15081).
- **Go-live** — the rest of the one-off import of the legacy `records` table (section below).

## Legacy items deliberately not ported

Found by the field-by-field review against `docs/legacy-inventory/`; each one is checked to be
unreachable or superseded before it lands here.

- **Bookings — B/L correction after sailing** (`blCorrection`, L7841): defined, never called from
  any screen in the legacy file; the live path is the B/L confirmation, which is ported.
- **Bookings — order lines and cost lines typed on the booking** (`addLine`, `addCost`, L4013–4030):
  superseded by the quotation's destination lines (the booking's price) and the supplier bills
  recorded against the booking (its cost).

## Differences kept on purpose

- **Bookings list — the period starts on "All time"**, not the legacy "This month": the office
  keeps reaching every file from one search box, and a file without dates would otherwise count
  on today and older dated ones drop out of view. The period, its comparison, the figures and
  the columns chosen live in the URL, so a view can be bookmarked and shared (legacy: session
  state lost on reload).

## Legacy behaviour waiting on a missing record

- **Bookings — the Certiweight lock "ordered"** (legacy `certiLocked`: once the trucker copy
  carried the weighing request, Certiweight cannot be cancelled). The copies are now sent from
  the booking and their steps (CONFIRM_OUT, TRUCKER_OUT) close on the message; the lock does not
  read the TRUCKER_OUT step yet, so Certiweight still locks only once a certificate is filed.

## Data migration (when a module goes live)

`npm run import:legacy -- <export.json>` previews (runs and rolls back); `--apply` keeps it.
Every imported record is written to `legacy_links` (kind, legacy id → new id), so a rerun adds
only what is new. Carried today:

- **users** and **contacts** (with child addresses and bank accounts);
- the settings **word lists** (cancel reasons, container types, address types, package types,
  paper documents, activity types, professions, seal sources, document types — a list the app
  already saved is kept), the **rate catalogue** (RATE_ITEMS, linked by id), the **vessel
  register** (VESSELS; the bookings point at their sailing) and the customers' **price
  agreements** (PRICE_LISTS);
- the **quotations** (destinations and lines; the QT number kept as issued);
- the **bookings** (boxes, goods, seals, loading and alerts; the SB number kept);
- the **tasks** (open, done or withdrawn as they stood; rule steps keep their code, per box);
- the **invoices, credit notes and supplier bills** (sales numbers kept; a bill gets its BILL
  number; totals stored; a booking's lines linked to its quotation lines; credit notes to the
  invoice lines they give back). A supplier's credit note is reported, not carried;
- the **payments** (each invoice's part, write-offs, charges booked to an account, reversals)
  and the **bank lines** (matched lines tied to their payment both ways);
- the **messages** (every channel; authors and takers by name; times in the office's zone;
  replies tied; what went out taken as delivered);
- the **fixed assets** (each on its imported supplier bill; disposals kept) and the **journal
  entries written by hand** (a cancelled one with its reversal; an opening entry only while the
  app has no opening balance);
- the **booking files** (the bytes from the export stored under FILES_DIR on each booking they
  were filed on, the step they settled named per box; a preview writes nothing to disk);
- the **number counters**, last: each QT/SB month and INV/CN/BILL year raised to the highest
  number in use, never lowered, so the next number continues the series.

Still to carry: a booking's legacy history lines, and the other settings (the script lists
them); files on contacts, invoices and messages.

1. Export the legacy database as JSON from phpMyAdmin (the `records` and `users` tables).
2. `scripts/import/` maps each kind to its table, resolving party ids to contact ids
   through `legacy_links` (the legacy 10.1 linking) and money to cents.
3. Set each `sequences` row to the highest issued number per month so numbering continues.
4. Users: copy email, name, role and the bcrypt hash; staff keep their passwords.
5. Verify counts and totals against the legacy office before switching the module over.
