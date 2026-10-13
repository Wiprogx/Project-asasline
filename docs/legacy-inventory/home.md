---
title: "Legacy inventory — Home"
description: "Every field, select, column, action, rule and list of the legacy Home module, by legacy line."
category: reference
status: generated
audience: ["developer", "agent"]
tags: ["tms", "legacy", "parity"]
---

# Legacy inventory — Home

Extracted by `scripts/legacy-inventory.mjs` from `legacy/asasline-demo.html`. Every row cites its legacy line (Lnnnn). This is the checklist to port against: each row is to be marked ported, adapted (say how), or dropped (say why) during the parity review.

| Category                            | Count |
| ----------------------------------- | ----- |
| Lists and maps                      | 5     |
| Tabs                                | 0     |
| Inline option sets (chips, toggles) | 0     |
| Screens and sheets                  | 2     |
| Fields                              | 0     |
| Values shown (read-only)            | 0     |
| Selects                             | 0     |
| Table header rows                   | 0     |
| Actions                             | 7     |
| Validations and refusals            | 0     |
| Confirmations                       | 1     |
| Functions (business rules)          | 30    |

## Lists and maps

| L    | Name         | Why (comment above)                                                                                                                                                                                                          | Content                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2285 | `APPS`       | Home was a list of shortcuts to the other tabs — a screen you pass through. The work waiting for you is worth more room than that.                                                                                           | `[{k:"home",l:"Home"},{k:"activity",l:"Activity"},{k:"quotes",l:"Quotations"},{k:"bookings",l:"Bookings"},{k:"contacts",l:"Contacts"}, {k:"discuss",l:"Discuss"},{k:"acct",l:"Accounting"},{k:"settings",l:"Settings"}]`                                                                                                                                                                                         |
| 2392 | `APP_COLOR`  |                                                                                                                                                                                                                              | `{home:["var(--surface-3)","var(--text-dim)"],quotes:["var(--blue-dim)","var(--blue)"],bookings:["var(--accent-dim)","var(--accent)"],contacts:["var(--purple-dim)","var(--purple)"], discuss:["var(--blue-dim)","var(--blue)"],acct:["var(--amber-dim)","var(--amber)"],settings:["var(--surface-3)","var(--text-dim)"], activity:["var(--red-dim)","var(--red)"],home:["var(--surface-3)","var(--text-dim)"]}` |
| 2407 | `NAV`        | ============ Navigation stack — Back precise to last page ============ OPENING A RECORD FROM A LIST IS NAVIGATION. It was not treated as such: `go()` put the app on the stack and opening a row put nothing, so Back from a | `[]`                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2445 | `LIST_ORDER` |                                                                                                                                                                                                                              | `{}`                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2452 | `PAGED`      |                                                                                                                                                                                                                              | `{ bookings:{cur:()=>S.bid, has:id=>bookings.some(x=>x.id===id), go:id=>{S.bid=id;S.btab="info";}, what:"shipment"}, quotes: {cur:()=>S.qid, has:id=>quotations.some(x=>x.id===id), go:id=>{S.qid=id;S.qtab="info";}, what:"quotation"}, contacts:{cur:()=>S.cid, has:id=>contacts.some(x=>x.id===id), go:id=>{S.cid=id;S.ctab="addresses";},what:"contact"}}`                                                   |

## Tabs

| L   | Tabs |
| --- | ---- |

## Inline option sets (chips, toggles, generated selects)

| L   | Options |
| --- | ------- |

## Screens and sheets

| L    | Function    | What it shows (comment above) |
| ---- | ----------- | ----------------------------- |
| 2301 | `openSheet` |                               |
| 2322 | `openView`  |                               |

## Fields

| L   | Label | Input id | Kind |
| --- | ----- | -------- | ---- |

## Values shown (read-only)

| L   | Label | Kind |
| --- | ----- | ---- |

## Selects and their options

| L   | Label | Select id | Options (literal) | Options (generated from) |
| --- | ----- | --------- | ----------------- | ------------------------ |

## Tables and columns

| L   | Columns |
| --- | ------- |

## Actions

| L    | Visible text | Handler      | Call           |
| ---- | ------------ | ------------ | -------------- |
| 2305 | …            | `__d`        | `__d()`        |
| 2305 | Close        | `closeSheet` | `closeSheet()` |
| 2305 | Save         | `__s`        | `__s()`        |
| 2329 | Cancel       | `closeSheet` | `closeSheet()` |
| 2330 | …            | `__alt`      | `__alt()`      |
| 2331 | …            | `__yes`      | `__yes()`      |
| 2341 | Yes, delete  | `__yes`      | `__yes()`      |

## Validations and refusals

| L   | In  | Message |
| --- | --- | ------- |

## Confirmations

| L    | Question                                                          |
| ---- | ----------------------------------------------------------------- |
| 2320 | Are you sure you want to delete this item? This cannot be undone. |

## Functions (business rules)

| L    | Function           | Arguments                     | What it does (comment above)                                                                                                                                                                                                 |
| ---- | ------------------ | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2298 | `sheetEl`          |                               | EVERY SHEET GETS A NUMBER. A Save button belongs to the sheet that installed it. If anything else has since written over the panel, that Save reads fields which are no longer there — which is how "Cannot read properties  |
| 2301 | `openSheet`        | t,h,save,del                  |                                                                                                                                                                                                                              |
| 2309 | `mine`             |                               | If the sheet is no longer on the screen there are no fields to read, and reading one gives null.checked — a crash where nothing should happen at all. A stale Save is a no-op. (root و)                                      |
| 2322 | `openView`         | t,h                           |                                                                                                                                                                                                                              |
| 2326 | `askConfirmAction` | title,html,btnLabel,onYes,alt |                                                                                                                                                                                                                              |
| 2335 | `askConfirm`       | msg,onYes                     |                                                                                                                                                                                                                              |
| 2344 | `closeSheet`       |                               |                                                                                                                                                                                                                              |
| 2353 | `hist`             | b,w                           | one clock for the whole app — the same NOW() every other record uses                                                                                                                                                         |
| 2358 | `syncBookingLines` | b                             | A booking used to keep its own copy of the price, taken at the moment it was made. Anything added to the quotation afterwards — a second declaration, a weighing switched on later — never reached it, and the two quietly d |
| 2368 | `bExtra`           | b                             | the value of a shipment: the quotation's price, plus any charge added on the booking itself (extra loading hours, a weighing — 12.5)                                                                                         |
| 2369 | `bTotal`           | b                             |                                                                                                                                                                                                                              |
| 2383 | `bCostReal`        | b                             | ١ج.١ — what a shipment costs, and what we have actually been billed. `b.costs` used to be both: a copy of the quotation's cost side taken at the moment of conversion, with every per-container charge multiplied by the num |
| 2384 | `bCost`            | b                             |                                                                                                                                                                                                                              |
| 2385 | `bVariance`        | b                             |                                                                                                                                                                                                                              |
| 2386 | `bProfit`          | b                             |                                                                                                                                                                                                                              |
| 2388 | `bProfitReal`      | b                             | the profit once every invoice is in — only meaningful when they are                                                                                                                                                          |
| 2389 | `lastTrack`        | b                             |                                                                                                                                                                                                                              |
| 2390 | `lastAlert`        | b                             |                                                                                                                                                                                                                              |
| 2391 | `docsDone`         | b                             |                                                                                                                                                                                                                              |
| 2408 | `labelOf`          |                               |                                                                                                                                                                                                                              |
| 2420 | `pushNav`          |                               |                                                                                                                                                                                                                              |
| 2421 | `peekNav`          |                               |                                                                                                                                                                                                                              |
| 2422 | `navBack`          |                               |                                                                                                                                                                                                                              |
| 2426 | `popNavIf`         | test                          | leaving a screen by its own door, the way you came in: take the step back off the stack instead of leaving one that lands you where you already are                                                                          |
| 2447 | `listOrder`        | kind,ids                      |                                                                                                                                                                                                                              |
| 2448 | `pagerFrom`        | kind,id                       |                                                                                                                                                                                                                              |
| 2459 | `pagerKindNow`     |                               |                                                                                                                                                                                                                              |
| 2461 | `pagerState`       |                               |                                                                                                                                                                                                                              |
| 2473 | `pagerGo`          | step                          | The pager REPLACES the record you are looking at. It is not a step into a new screen, so it does not touch the back stack: Back still means "the list I came from", however far along it you have walked.                    |
| 2480 | `pagerBar`         |                               |                                                                                                                                                                                                                              |
