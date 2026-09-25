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

## 2026-09-24 · Abatty 0.6.0 upgrade, taken unattended

| Situation                                                                                                                                                                                                                      | Default taken                                                                                                                  | Alternative set aside                                                                  | Re-read                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 0.6.0 adds a `coverage:changed` gate step (TEST.4); only `src/domain` has unit tests, every other layer is held by the browser suite, so a plain patch-coverage gate would fail almost every push.                             | Not enabled yet; the step reports "not run".                                                                                   | A `coverage:changed` script scoped to `src/domain` only.                               | Whether to add the scoped script once the browser suite's routes are counted (`test.unvisitedRoutes`). |
| `abatty doctor` lists opt-in probes with what each would read today (types.nonNull 21, test.unvisitedRoutes 18, code.clones 36, valid.unparsedBoundary 94…). Enabling one records today's count as a floor that may only fall. | None enabled; the counts are recorded here.                                                                                    | Enable `types.nonNull` and `test.unvisitedRoutes` (the two with the clearest reading). | Enable them in a change of their own, with the two floors named in its changelog line.                 |
| The 0.6.0 CI generator drops the browser job's database, emits an invalid bypass step and a scrub step that fails with scrub off.                                                                                              | The workflow is kept by hand with 0.6.0's other changes applied; `abatty ci --check` reads it as behind (its header says why). | Regenerate and repair after each `abatty ci`.                                          | Report the three generator bugs upstream; regenerate once fixed.                                       |
