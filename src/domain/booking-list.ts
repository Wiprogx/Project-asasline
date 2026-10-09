import { type BillStatus } from "./invoicing";

/**
 * The figures above the bookings list (legacy bStatsPanel, the default set): how many are
 * shown, what they are worth, what was invoiced, and how many still wait for an invoice.
 * Integer cents (invariant 3); the rows are whatever the list shows after its filters.
 */
export type ListFigures = {
  count: number;
  valueCents: number;
  billedCents: number;
  notInvoiced: number;
  partly: number;
  over: number;
};

export function listFigures(
  rows: readonly { valueCents: number; billedCents: number; billing: BillStatus }[],
): ListFigures {
  return rows.reduce<ListFigures>(
    (f, r) => ({
      count: f.count + 1,
      valueCents: f.valueCents + r.valueCents,
      billedCents: f.billedCents + r.billedCents,
      notInvoiced: f.notInvoiced + (r.billing === "not" ? 1 : 0),
      partly: f.partly + (r.billing === "partly" ? 1 : 0),
      over: f.over + (r.billing === "over" ? 1 : 0),
    }),
    { count: 0, valueCents: 0, billedCents: 0, notInvoiced: 0, partly: 0, over: 0 },
  );
}
