---
title: "Invariants"
description: "The business rules of the legacy TMS that must never break, and the probe, graph rule or review that holds each one."
category: reference
status: living
audience: ["developer", "agent"]
tags: ["tms"]
---

# Invariants — rules that must never break

Carried over from the legacy app (`legacy/ASASLINE_TMS_Technical_Reference.md` §20). Each rule
names what holds it. **Probe** = a hard metric in `abatty.probes.mjs` (must stay 0, the gate
refuses otherwise). **Graph** = a rule in `.dependency-cruiser.cjs`. **Review** = no machine
can check it yet; a reviewer does.

| ID     | Invariant                                                                                                                                     | Held by                                                                                                                                                                                                                |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| INV.1  | **No delete** of anything numbered or referenced. Cancel / archive / withdraw with a reason; reversible. Users are switched off, not deleted. | Probe `tms.hardDelete`; `archivedAt`/`archivedReason` on every record (`src/server/db/schema/_columns.ts`)                                                                                                             |
| INV.2  | **One source of truth**: sailing dates on the vessel; booking price read from the quotation; parties by contact id, names for display only.   | Review; schema uses foreign keys for parties                                                                                                                                                                           |
| INV.3  | **Roles, not names**, in rules and routing — resolved at fire time. Permission checks fail closed.                                            | `can()` tests (`src/domain/rules.test.ts`); probe `tms.unguardedServerFn`                                                                                                                                              |
| INV.4  | **Fail closed**: unknown values show "—" / "⚠", never green. `formatCents(NaN)` ≠ `formatCents(null)`.                                        | `src/domain/checks.test.ts`                                                                                                                                                                                            |
| INV.5  | **Adding a country, port, document or rule = a Settings row**, not code.                                                                      | `config_tables` + `src/server/config-tables.ts`; review                                                                                                                                                                |
| INV.6  | "What we didn't sell is not our job": a requirement exists only if its line is on the quotation.                                              | Review (arrives with the document-rules engine)                                                                                                                                                                        |
| INV.7  | **Invoices**: gap-free numbers, immutable once issued, corrected by credit note; closed periods immutable. **Money is integer cents.**        | Probe `tms.floatMoney`; sequences in a transaction; accounting module (pending)                                                                                                                                        |
| INV.8  | Internal messages never leave the office.                                                                                                     | `outwardProblem` (unit-tested) refuses an outbound internal message; the send schema only accepts e-mail/WhatsApp; internal chat is stored with `direction = internal` and excluded from every record's correspondence |
| INV.9  | **`ref` fields are not editable** once issued (QT/SB/invoice numbers).                                                                        | Probe `tms.refRewrite`; unique index on `ref`                                                                                                                                                                          |
| INV.10 | UI English; correspondence in the contact's language; **dates ISO strings**, computed without a clock.                                        | Probe `tms.domainClock`; built-in `valid.utcDay`; `src/domain/dates.test.ts`                                                                                                                                           |
| INV.11 | **Concurrent edits never overwrite silently** — optimistic `version`, conflict shown to the user.                                             | `updateVersioned()` in `src/server/versioned.ts`; review                                                                                                                                                               |
| INV.13 | **A prerequisite that exists nowhere blocks** (fail closed): a typo in a rule never waves a shipment past; saving such a rule is refused.     | `missingPrerequisites` tests and the shipped-rule-book test (`src/domain/rules/rules.test.ts`); `saveRule` refusal (e2e)                                                                                               |
| INV.12 | **Layering**: domain is pure; pages never touch the db client; features never import each other.                                              | Graph rules `domain-is-pure`, `routes-read-through-features`, `features-never-import-each-other`                                                                                                                       |
