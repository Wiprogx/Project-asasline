---
title: "Adoption decisions"
description: "The decisions taken alone by the unattended adoption nights (/adopt-standards): date, phase, situation, the default taken, the alternative set aside, what the morning must re-read."
category: governance
status: living
audience: ["developer", "agent"]
tags: ["standards", "adoption", "decisions"]
related: ["./README.md", "./STANDARDS_PROGRESS.md"]
---

# Adoption decisions

## 2026-10-08 · Main-only working mode, asked for by the owner

The owner asked for every change to be made on `main` directly, with no other branch kept
("all the work need to be done in the main, merge all the branches and keep only main").
`directPushToBase` in `abatty.config.json` is therefore `true`: an interactive push to `main`
is allowed once the pre-push gate is green. An unattended run (`ADOPTION_RUN=1`) still never
pushes to `main`, whatever the flag. GitHub has no branch protection on `main`; the gate and
the CI workflow remain the only guard. The feature branches merged up to this day were deleted
on the remote, `feat/a11y-theme` (merged as PR 14) and `feat/quotation-extras` (fast-forwarded
into `main`) among them.

## 2026-10-08 · Abatty 0.8.1 upgrade and the toolchain, interactive

`abatty update` from 0.6.0 brought the guard, protect and self-test hooks, the adopt-standards
skill and the pre-push hook to 0.8.1, merged new keys into `abatty.config.json` and rewrote
five floors under their new definitions (types.escapes, valid.utcDay, docs.citations,
docs.behindCode, docs.danglingRefs; every one 0 → 0, nothing raised). `abatty doctor` reports
no drift; its one failure is the missing agent command for unattended nights, which this
repository does not run. The CI workflow is still kept by hand (see the 0.6.0 entry); doctor's
"none of the pipelines is the gate" line is that choice, not an omission. Opt-in probes and
what each reads today, none enabled: code.clones 59, types.nonNull 25, code.undocumentedExports
571, auth.unguardedAction 101 (it reads the common names only; the project's `requirePermission`
is to be listed in `ratchet.authCalls` before it is judged), test.unvisitedRoutes 19,
obs.catchOnlyLogs 2, cache.serverCacheUse 1.

Packages: every in-range release taken; Next.js 16.4.0 and React 19.3.0 taken out of range
after checking the peers. Held back: ESLint 10 (eslint-config-next and typescript-eslint accept
it and the project lint passes, but eslint-plugin-react, -import and -jsx-a11y under
eslint-config-next declare `^9` as their ceiling, so CI would install under a peer override;
npm now marks 9.39.5 as no longer supported, so this is to be retried as soon as those plugins
move),
TypeScript 7 (typescript-eslint wants < 6.1; Next, knip, dependency-cruiser and drizzle-kit
load the TypeScript API), @types/node 26 (the runtime and CI are Node 24).

## 2026-09-24 · Abatty 0.6.0 upgrade, taken unattended

| Situation                                                                                                                                                                                                                      | Default taken                                                                                                                  | Alternative set aside                                                                  | Re-read                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 0.6.0 adds a `coverage:changed` gate step (TEST.4); only `src/domain` has unit tests, every other layer is held by the browser suite, so a plain patch-coverage gate would fail almost every push.                             | Not enabled yet; the step reports "not run".                                                                                   | A `coverage:changed` script scoped to `src/domain` only.                               | Whether to add the scoped script once the browser suite's routes are counted (`test.unvisitedRoutes`). |
| `abatty doctor` lists opt-in probes with what each would read today (types.nonNull 21, test.unvisitedRoutes 18, code.clones 36, valid.unparsedBoundary 94…). Enabling one records today's count as a floor that may only fall. | None enabled; the counts are recorded here.                                                                                    | Enable `types.nonNull` and `test.unvisitedRoutes` (the two with the clearest reading). | Enable them in a change of their own, with the two floors named in its changelog line.                 |
| The 0.6.0 CI generator drops the browser job's database, emits an invalid bypass step and a scrub step that fails with scrub off.                                                                                              | The workflow is kept by hand with 0.6.0's other changes applied; `abatty ci --check` reads it as behind (its header says why). | Regenerate and repair after each `abatty ci`.                                          | Report the three generator bugs upstream; regenerate once fixed.                                       |
