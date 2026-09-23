/**
 * Costs to receive (legacy accruals / bookAccruals). At a month's end, a shipment that sailed
 * has costs the quotation expected that no supplier has invoiced yet: they belong to that
 * month. Booked on the day (604000 against 444000 Invoices to receive) and reversed the next
 * day, so the real bills, when they come, land without counting the cost twice.
 */
import { addDays } from "./dates";
import { type Entry, entry } from "./ledger";

const SHIPMENT_COSTS = "604000";
const TO_RECEIVE = "444000";

/** Below a euro is noise, not a missing bill. */
const MIN_GAP_CENTS = 100;

export type AccrualLine = { bookingId: string; ref: string; cents: number };

export function accrualLines(
  shipments: readonly {
    bookingId: string;
    ref: string;
    expectedCents: number;
    billedCents: number;
  }[],
): (AccrualLine & { expectedCents: number; billedCents: number })[] {
  return shipments
    .map((s) => ({ ...s, cents: s.expectedCents - s.billedCents }))
    .filter((s) => s.cents >= MIN_GAP_CENTS)
    .sort((a, b) => b.cents - a.cents);
}

/** The accrual on its day and its reversal the next day. */
export function accrualEntries(run: {
  id: string;
  onDate: string;
  lines: readonly AccrualLine[];
}): Entry[] {
  const total = run.lines.reduce((s, l) => s + l.cents, 0);
  const lines = [
    ...run.lines.map((l) => ({ account: SHIPMENT_COSTS, cents: l.cents, label: l.ref })),
    { account: TO_RECEIVE, cents: -total, label: "Invoices to receive" },
  ];
  const booked = entry({
    date: run.onDate,
    journal: "MISC",
    ref: `ACR-${run.onDate}`,
    label: `Costs to receive — ${run.lines.length} shipment${run.lines.length === 1 ? "" : "s"}`,
    partner: null,
    source: { kind: "accrual", id: run.id },
    lines,
  });
  return [
    booked,
    entry({
      ...booked,
      date: addDays(run.onDate, 1),
      ref: `ACR-${run.onDate}-R`,
      label: `Reversal of the costs to receive of ${run.onDate}`,
      lines: lines.map((l) => ({ ...l, cents: -l.cents })),
    }),
  ];
}
