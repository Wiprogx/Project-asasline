---
title: "Data model review"
description: "Every list a table, every link a key: what is still text, the duplicates to merge, the office's decisions and the order of work."
category: plan
status: living
audience: ["developer", "agent"]
tags: ["tms", "data"]
---

# Data model review: every list a table, every link a key (2026-10-30)

Invariant 8 says adding a country, port, document or rule is a row, not code, and a record
points at a list row by foreign key, never by its words. Done so far: the word lists of
`schema/lists.ts` (cancel and withdraw reasons, salutations, document types, task types,
package types, seal sources, person and location roles, contact paper kinds, professions, tags,
container types, port regions), ports (`ports`, 0072–0073), countries, cities and postcodes
(`countries`, `cities`, `postal_codes`, 0074–0076).

What is left, from a read of the schema, the `*-config.ts` readers and the domain constants.
Paths are under `src/`. "Words" means a text column holding a list's label, with no key.

## A. Records that hold a list's words: become list tables with foreign keys

| List (today)                                 | Held as words by                                                                                   | Proposal                                                                     |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Payment terms (`config_tables` paymentTerms) | `contacts.paymentTermId`, `quotations.paymentTermId`, `invoices.paymentTermId` (text slug)         | `payment_terms` table (name, rule, days), uuid FKs                           |
| Loading modes (loadingModes)                 | `bookings.loadingMode`, `containers.loadingMode`, `quotation_routes.loadingMode` (the mode's name) | `loading_modes` table (hours, drop, surcharge), FKs                          |
| Rate sources (rateSources)                   | `rate_items.rateType`                                                                              | list table `rate_sources`                                                    |
| Rate categories (rateCategories)             | `rate_items.category`; the app relies on ocean, inland, docs, freetime, customs, vgm               | `rate_categories` table, built-in rows coded                                 |
| HS codes (hsCodes, up to 2000)               | `container_hs_lines.code`                                                                          | `hs_codes` table, FK                                                         |
| Release states (releaseStates)               | `bookings.release`; "pending" read by code                                                         | table, pending and released coded                                            |
| Send modes / couriers (sendModes)            | `bookings.sendMode`                                                                                | `send_modes` table (or courier contacts — decision 3)                        |
| Declined reasons                             | `quotations.declinedReason`, `quotation_routes.declinedReason` (free text)                         | a reasons list (decision 2)                                                  |
| Child address kinds                          | `contact_addresses.type` (words; place queries filter "Pick up", "Depot", "Terminal")              | FK to `location_roles` / `person_roles`, or retire the table now links exist |
| Automatic activities                         | `activityRules.type` holds task-type words                                                         | FK to `task_types`                                                           |

## B. Copies of another table's words: link instead

- `vessels.carrier`, `rate_items.carrier` (free text): shipping lines are contacts → FK to `contacts`, as `bookings.shippingCoId` already is.
- `bookings.vesselName`, `bookings.voyage` beside `bookings.vesselId`: keep the FK only, or keep the words as a fallback for a sailing not in the register (decision 4).
- `bookings.pickupDepot`, `bookings.terminal` (words picked from contact addresses): FKs to location contacts.
- `rate_items.fromPlace`/`toPlace`, `quotation_routes.finalPlace`: candidates for FKs to `cities` or `ports`.
- `quotation_lines.itemCode` beside `itemId`: a copy, to drop or justify.
- Container specs (`containerSpecs`: tare and max gross by ISO type) repeat `container_types`: merge as two columns.
- `EU_COUNTRIES` (`domain/accounting.ts`) repeats what a country is: an `eu` column on `countries`.

## C. Accounting references still in code or JSON

- `VAT_CODES` (`domain/accounting.ts`) is read straight by every VAT schema; three `vatCode` text columns default to "EX41" → `vat_codes` table, FKs.
- Chart of accounts (`chartOfAccounts` + `CHART`), `PURCHASE_ACCOUNTS`, `DIFF_ACCOUNTS`, account numbers as text on invoice lines, bill memory, payments, assets, journal lines, bank rules, rate categories, line items → one `accounts` table (number as key, built-in rows coded), FKs everywhere.
- Office bank accounts (`bankAccounts`) named as text on `bank_lines` and `bank_statements` → table, FKs.
- `CURRENCIES` + the `books.fx` keys, and `LANGUAGES`, used in zod enums → `currencies` (with rates) and `languages` tables.
- `COMPANY` / `DECLARANT` (letterhead, VAT declarant) are code → one office settings row.

## D. Rules and messages: codes shared by several lists

- Document codes live in four places: the rule book's codes, the filing hints, `booking_files.code`, `rate_items.docCode` (merged at `features/bookings/file-store.ts`). → one `document_codes` table they all point at. (`contact_doc_kinds` is another domain and stays.)
- Templates (`templates`), referenced by code from the rule book and the track steps → `templates` table, FKs.
- Routing topics (`routes`) held as words by `messages.topic` → table, FK.
- The rule book (`docRules`), checklists, holidays → tables (rule codes are what tasks and files point at).

## E. Fixed vocabularies stored as text: pgEnum

`contacts.kind`, `rate_items.scope`/`freeKind`/`side`, `quotation_lines.priceSource`,
`booking_files.stage`, `requirement_reviews.state`, `booking_alerts.level`,
`activities.trigger`, `activities.linkKind`, `messages.linkKind`, `messages.room`, `visits.kind`,
`time_log.app`, `bank_lines.source`, `quotations.sentVia`. They are the app's own words (a status
machine, a channel), not the office's: a database enum makes a stray value impossible.

## Stays as it is

Country and port codes in the rule book, holidays and number formats (ISO and UN/LOCODE codes,
which a wildcard `*` needs); single-object settings (permissions, books, quote fields, cut-off
rules, auto-send, inbox, escalation); per-booking snapshots such as `bookings.track`.

## Decisions (the office, 2026-10-30)

1. Professions and tags stay two lists: a profession says what a company does (the booking
   pickers read it), a tag is a free label.
2. One `reasons` table with a scope (cancel, withdraw, declined); the two reason tables merge
   into it, and the declined reasons stop being free text.
3. Couriers are their own list (`send_modes`, with the tracking link), not contacts.
4. Open — taken by default until the office says otherwise: a booking's sailing comes from the
   vessel register only; the copied vessel name and voyage go.
5. Scope: every Settings list still edited as lines of text becomes a table with its own screen
   (add, edit, archive with a reason, put back, how many records use each row), not only the
   lists records name. The twenty line editors today:

   | Settings page  | Lists                                                                                |
   | -------------- | ------------------------------------------------------------------------------------ |
   | Accounting     | Payment terms, Chart of accounts, Bank accounts, Bank matching rules                 |
   | Catalogue      | Categories & accounts                                                                |
   | Rate sources   | Rate sources                                                                         |
   | Line items     | Line items                                                                           |
   | Loading        | Loading modes, Grace before waiting time                                             |
   | Containers     | Container types — tare and maximum gross (merged into `container_types`), Box owners |
   | Release        | Release states, Ways to send the originals, Journey steps                            |
   | HS codes       | HS codes                                                                             |
   | Checklists     | Checklists                                                                           |
   | Filing         | Filing rules                                                                         |
   | Activity rules | Automatic activities                                                                 |
   | ID formats     | VAT and EORI number formats                                                          |
   | Routing        | WhatsApp numbers                                                                     |

   With them, the editors that are not line lists: the rule book (document rules), templates,
   holidays, routing topics. A single settings object (a grace in minutes, the books' options)
   stays one row of `config_tables`: it is a setting, not a list.

## Order proposed

Each phase is its own migrations (add, backfill, guard, drop — as 0072–0076), its own journeys,
the full suite on a production build, one commit.

1. **A** — the office's lists the records name in words (payment terms, loading modes, rate sources and categories, HS codes, release states, send modes, reasons, child address kinds, activity task types).
2. **B** — links instead of copies (carriers, depots and terminals, container specs, EU flag).
3. **C** — accounting references (VAT codes, accounts, bank accounts, currencies, languages, office row).
4. **D** — document codes, templates, topics, rule book.
5. **E** — the enums.
6. A last pass: every text column of the schema read again against this list; the export, the importers and Settings checked to name every table.
