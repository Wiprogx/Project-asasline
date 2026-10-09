import type { QuotationStatus } from "./shipments";

/**
 * The figures above the quotations list (legacy STAT_DEFS, the default set): how many, how
 * many still open, won and lost, what the won ones are worth, and the win rate over what was
 * decided. Integer cents (invariant 3); the rows are whatever the list shows after its filters.
 */
export type QuotationFigures = {
  count: number;
  open: number;
  accepted: number;
  declined: number;
  acceptedValueCents: number;
  valueCents: number;
  /** Accepted over accepted + declined, in whole percent; null before anything was decided. */
  winRate: number | null;
};

export const OPEN_QUOTATION_STATUSES: readonly QuotationStatus[] = ["draft", "sent"];

export function quotationFigures(
  rows: readonly { status: QuotationStatus; valueCents: number }[],
): QuotationFigures {
  const f = rows.reduce(
    (a, r) => ({
      count: a.count + 1,
      open: a.open + (OPEN_QUOTATION_STATUSES.includes(r.status) ? 1 : 0),
      accepted: a.accepted + (r.status === "accepted" ? 1 : 0),
      declined: a.declined + (r.status === "declined" ? 1 : 0),
      acceptedValueCents: a.acceptedValueCents + (r.status === "accepted" ? r.valueCents : 0),
      valueCents: a.valueCents + r.valueCents,
    }),
    { count: 0, open: 0, accepted: 0, declined: 0, acceptedValueCents: 0, valueCents: 0 },
  );
  const decided = f.accepted + f.declined;
  return { ...f, winRate: decided ? Math.round((f.accepted / decided) * 100) : null };
}
