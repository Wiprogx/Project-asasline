---
title: "Lessons"
description: "What went wrong while building this repository, why, and the rule each one left behind; the source every line added to CLAUDE.md must trace to."
category: governance
status: living
audience: ["developer", "agent"]
tags: ["lessons", "tms"]
---

# Lessons

One entry per thing that went wrong: what happened, why, and the rule it left. A line added to
`CLAUDE.md` must trace to an entry here (Abatty probe `context.unsourcedGrowth`).

## 2026-09-23 · React 19 wipes a form whose action returned an error

**What happened.** The booking editor refused "ETA before ETD"; the person fixed the ETA and
saved; only the ETA was stored — consignee, vessel and ETD were gone. Found by the Playwright
booking journey, not by review.
**Why.** With `<form action={…}>`, React 19 resets every uncontrolled field once the action
_returns_. An action that answers with a validation error has returned, so the form was wiped
and the next submit carried one field.
**Rule.** Stateful forms use `<ActionForm>` (submits in a transition, no reset) with
`useToastedAction`. Forms that should clear on success call `reset()` themselves.

## 2026-09-23 · A toast from an effect never shows if the action removed its component

**What happened.** Archiving a contact, cancelling a booking and removing a container
succeeded in the database but showed no confirmation.
**Why.** The toast ran in a `useEffect` of the dialog that submitted; the successful action
re-rendered the page without that dialog, so the effect never ran.
**Rule.** Announce the outcome inside the action callback (`useToastedAction`), never from an
effect on the result.

## 2026-09-23 · Drizzle skips `undefined`, so an emptied field was never cleared

**What happened.** Deleting a phone number or a vessel name and saving kept the old value.
**Why.** An empty input becomes `undefined` after parsing, and Drizzle omits `undefined`
keys from `update().set()`.
**Rule.** Updates pass optional fields through `nullMissing(values, CLEARABLE)`; an e2e step
asserts that clearing a field clears it.

## 2026-09-23 · Generated CI is code: read it before trusting it

**What happened.** The first two CI runs failed: a generated YAML line was invalid (an
unquoted command containing `": "`), and a scrub step ran although the config disables scrub.
**Rule.** Run and read a generated workflow like any other change; the pre-push gate's
Prettier step is what caught the YAML.

## 2026-09-23 · On this Windows tree, string edits must normalise line endings

**What happened.** Two scripted edits (a changelog entry, a CI job) silently did nothing or
appended a duplicate, because the file had CRLF and the search string had LF.
**Rule.** Scripts that edit files normalise `\r\n` first and throw when the anchor is missing;
prefer the editor tool for multi-line edits.

## 2026-09-23 · Browser tests must not share state the app protects

**What happened.** The "wrong password" smoke test began failing after a few runs.
**Why.** The login limiter (6 failures per email per 15 minutes) worked: every run used the
same email. A later race matched the previous save's toast instead of the new one.
**Rule.** E2E data is unique per run (`tag()`); wait for the server action's response
(`submit()`), not for a toast that may be left over.
