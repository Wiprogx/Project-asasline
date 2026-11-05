---
title: "Container fields"
description: "What belongs to the container and what to the booking: the rule, the inventory of every column, and the steps that move the last box-level facts off the booking."
category: plan
status: living
audience: ["developer", "agent"]
tags: ["tms", "bookings"]
---

# What belongs to the container, what belongs to the booking

Analysis of 2026-11-05, before moving the last box-level facts off the booking. Lnnnn is a
line of `legacy/asasline-demo.html`.

## 1. The rule

A **booking** is the file: one customer, one lane, one sailing, one transport document, one
price. A **container** is the unit that moves: one truck, one driver, one depot visit, one
weighing, one seal, one set of goods, one gate-in. The legacy app says it in three places:

- "address, date, mode, trucker and stops belong to the box" (L3602); a quoted loading mode is
  "agreed on the quotation — a box may still differ" (L3605);
- "with more than one box, loading and trucking belong to each box, not the booking" (L6058);
- the trucker copy "is issued per container, because each driver only collects his own box"
  (L4035).

So the test for a field is: **can two boxes of one booking legitimately differ in it on the
same day?** If yes, it is a fact of the box. The booking may still carry a value for it, but
only as the **proposal** every new box starts from (legacy `BOX_DEF`, L6116: "what a fresh box
inherits: the quoted mode and address, the ISO tare") and as the shortcut for a one-box file
(`domain/loading boxLoading`: the booking's value stands in only when there is genuinely one
box; nothing is ever inherited between two boxes, BUILD_PLAN 1.10).

Three consequences for the architecture:

1. **Proposal and fact are different columns.** The booking keeps `load_address_id`,
   `load_date`, `load_time`, `loading_mode`, `transporter_id`, `pickup_depot_id`,
   `pickup_date` as proposals: set by the quotation, the customer or the line, shown read-only
   on the booking, copied into a new box, never edited as if they were the shipment's facts.
   The box carries the facts in its own columns, and a fact left empty is **missing**, not
   inherited, as soon as the booking has two boxes.
2. **Documents and rules read the box.** The trucker copy already does (`domain/booking-doc`).
   The booking confirmation groups a field across boxes: one line when every box agrees, one
   line per box otherwise (legacy `loadBlock`/`per`, L4088). The document rules anchor
   `loading` on the booking's `load_date` today (`server/rules-sync`); once the date is a fact
   of the box, a per-box rule (Certiweight) anchors on **its** box's date and a booking-level
   rule on the **earliest** box date, the booking's proposal standing in while no box says.
3. **The editor follows the data.** The booking editor shows the proposals as a "Proposed for
   the boxes" card with a link to the Containers tab; it does not edit them. The Containers tab
   edits the facts, one card per box, the proposal filled in until the box says otherwise.

## 2. The inventory

Columns of `bookings` and `containers` (`src/server/db/schema/shipments.ts`), where each fact
lives today and where it belongs.

### Facts of the booking — stay where they are

| Field                                                                      | Why one per booking                                             |
| -------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `ref`, `quotation_id`, `quotation_route_id`, `kind`, `status`              | The file itself                                                 |
| `client`, `payer`, `shipper`, `consignee`, `notify`                        | The parties of the transport document                           |
| `doc_check`, `shipping_co`, `dest_forwarder`, `forwarder`, `customs_agent` | The office's counterparts on the file                           |
| `pol`, `pod`, `vessel`, `voyage`, legs, `etd`, `eta`                       | One sailing; two sailings are two bookings                      |
| `terminal_id`                                                              | One port call; the full boxes go to the vessel's terminal       |
| `customs_closing`, `vgm_closing`, `si_closing`, `port_cut_off`             | The vessel's cut-offs                                           |
| `carrier_booking_no`, `bl_no`, `doc_type`, `cc`                            | One carrier booking, one B/L                                    |
| `commodity`                                                                | The summary; the goods themselves are per box (HS lines)        |
| `release`, `release_by`, `release_note`                                    | The B/L is released or held as a whole                          |
| originals (`originals_pickup`, `doc_receiver`, `send_*`)                   | One set of originals                                            |
| `track`                                                                    | The voyage's milestones (see §3 for the per-box dates it lacks) |
| `cancel_reason`, `status_before_cancel`                                    | The file                                                        |

### Facts of the box — already on `containers`

| Field                                                     | Since                                              |
| --------------------------------------------------------- | -------------------------------------------------- |
| `number`, `type_id`, seals, `tare_kg`, `cargo_kg`, VGM    | The container module                               |
| HS lines, `packages`, `package_type_id`, `bl_description` | Goods per box                                      |
| `load_address` + `load_address_id`                        | 2026-11-05 (the place; the words written from it)  |
| `load_date`, `load_time`, `loading_mode`                  | The per-box loading card                           |
| `transporter_id`                                          | One trucker per box (L3749)                        |
| `load_end_date`, `load_end_time`                          | Legacy `loadEndAt` was on the booking; now per box |
| `pick_back_date`, `pick_back_time`, `stops`               | A dropped box, its extra stops                     |
| Certiweight step and certificate                          | `CODE#boxId` steps, `booking_files.container_id`   |

### Proposals still edited as facts on the booking — take them out of the editor (step A)

| Booking column           | Box column | What the booking's value is for                                                     |
| ------------------------ | ---------- | ----------------------------------------------------------------------------------- |
| `load_date`, `load_time` | same       | The proposal; the one-box shortcut; the rules' `loading` anchor until the boxes say |
| `loading_mode`           | same       | The mode agreed on the quotation (L3605)                                            |
| `transporter_id`         | same       | The inland line's trucker, the default for each box                                 |
| `load_address_id` (done) | same       | The customer's place, the proposal                                                  |

### Facts of the box still only on the booking — add them to the box (step B)

| Booking column                     | Why per box                                                                          | Box column to add |
| ---------------------------------- | ------------------------------------------------------------------------------------ | ----------------- |
| `pickup_depot_id` (+ legacy words) | Each empty box is collected by its own truck, often from a different depot           | `pickup_depot_id` |
| `pickup_date`                      | On a different day per box; the trucker copy says when the driver collects the empty | `pickup_date`     |

The booking keeps both as the line's proposal (`server/line-places lineDefaults`), as for the
depot today.

### Facts of the box the model does not have yet — later (step C)

| Fact                                         | Where it comes from                                  | Box column     |
| -------------------------------------------- | ---------------------------------------------------- | -------------- |
| Empty picked up (date)                       | The trucker's confirmation, the `PICKED_UP` template | `picked_up_on` |
| Gated in at the terminal (date)              | The terminal's or line's notice, `AT_TERMINAL`       | `gated_in_on`  |
| Delivered at destination (date, door import) | Legacy `dateLivraison`, never ported                 | `delivered_on` |

Legacy showed "Containers now" with every box at the booking's stage (L3787): the model had no
per-box dates either. They arrive with the messages that report them, not from the editor.

## 3. What does not move

- **Terminal.** One per booking: the boxes of one booking sail on one vessel from one terminal.
  A booking whose boxes go to two terminals is two bookings.
- **Tracking milestones.** The voyage is one; the per-box dates above complement it, they do
  not replace it.
- **Price lines.** A line is per booking or per box (`quotation_lines.per_box`, legacy
  `routeUnit × routeQty + routeBoxSell`); the box count multiplies it. No line hangs off a box.
- **Costs.** Supplier bills are recorded against the booking; a bill that names a container is
  still the booking's cost.

## 4. Steps

Each is one commit, gate green, browser suite green on a production build.

- **A — loading date, time and mode out of the editor** (done 2026-11-05). Remove them from the booking details
  form as the address was; the booking's values become the proposal shown read-only on the
  booking ("Proposed for the boxes: date, time, mode, trucker — change them on each box").
  A new box starts from the booking's proposal (legacy `BOX_DEF`). The `loading` anchor of the
  document rules reads the earliest box date, the booking's proposal standing in while no box
  has one; a per-box rule reads its box's date. `boxLoading` keeps the one-box shortcut.
- **B — pick-up depot and date per box** (done 2026-11-05, migration 0087). Migration: `containers.pickup_depot_id`,
  `containers.pickup_date`. The per-box card gets "Empty collected at / on", the line's depot
  proposed; the trucker copy reads the box's; the bookings search finds a booking by a box's
  depot. The booking's `pickup_depot_id` / `pickup_date` stay as the proposal.
- **C — the dates a box reports.** `picked_up_on`, `gated_in_on`, `delivered_on`, set by the
  messages that report them and shown on the Containers tab and the Track tab.
