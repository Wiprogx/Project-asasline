/**
 * What a shipment earns and costs (legacy bTotal / bCost / bCostReal / bVariance / bProfit):
 * the revenue and the expected cost are read live from the quotation's destination — change a
 * price there and this follows — and the recorded cost is the supplier bills on the booking.
 * Integer cents throughout (invariant 3).
 */
export type CostLine = { description: string; qty: number; costCents: number };

export type CostSummary = {
  /** The destination's lines sold, in cents: what the customer pays. */
  revenueCents: number;
  /** The buy side of the quotation's lines, when the booking came from one; null otherwise. */
  expectedCents: number | null;
  /** The supplier bills recorded against the booking (net, VAT is recovered). */
  recordedCents: number;
  /** Recorded − expected; null when nothing was expected. */
  varianceCents: number | null;
  /** Revenue − (expected when quoted, else recorded): the margin the office counts on. */
  profitCents: number;
  /** Revenue − recorded: the margin on the invoices actually received. */
  profitRecordedCents: number;
  /** Profit over revenue, in percent with one decimal; 0 without revenue. */
  marginPct: number;
};

export function costSummary(p: {
  quoted: boolean;
  revenueCents: number;
  expectedLines: readonly CostLine[];
  recordedCents: number;
}): CostSummary {
  const expectedCents = p.quoted
    ? p.expectedLines.reduce((s, l) => s + l.qty * l.costCents, 0)
    : null;
  const costCents = expectedCents ?? p.recordedCents;
  const profitCents = p.revenueCents - costCents;
  return {
    revenueCents: p.revenueCents,
    expectedCents,
    recordedCents: p.recordedCents,
    varianceCents: expectedCents === null ? null : p.recordedCents - expectedCents,
    profitCents,
    profitRecordedCents: p.revenueCents - p.recordedCents,
    marginPct: p.revenueCents ? Math.round((profitCents / p.revenueCents) * 1000) / 10 : 0,
  };
}

/** "matches", "+ €120.00 over" or "− €40.00 under": the variance the way the office reads it. */
export function varianceWords(
  varianceCents: number | null,
  format: (cents: number) => string,
): { text: string; tone: "neutral" | "danger" | "success" } {
  if (varianceCents === null) return { text: "nothing expected", tone: "neutral" };
  if (Math.abs(varianceCents) < 50) return { text: "matches", tone: "neutral" };
  return varianceCents > 0
    ? { text: `+ ${format(varianceCents)} over`, tone: "danger" }
    : { text: `− ${format(-varianceCents)} under`, tone: "success" };
}
