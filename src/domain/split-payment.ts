/**
 * One payment over several invoices (legacy pfApply / savePayForm): a customer's transfer that
 * settles more than one invoice, each taking the part typed against it. The payment is the sum.
 */

export type Allocation = { invoiceId: string; number: string; cents: number; openCents: number };

/** Why these parts cannot be booked, or null: one at least, none over what is open. */
export function splitProblem(parts: readonly Allocation[]): string | null {
  const taken = parts.filter((p) => p.cents !== 0);
  if (!taken.length) return "Tick at least one invoice this payment settles.";
  for (const p of taken) {
    if (p.cents < 0) return `${p.number}: a payment part cannot be negative.`;
    if (p.cents > p.openCents)
      return `${p.number}: only ${(p.openCents / 100).toFixed(2)} is open.`;
  }
  return null;
}

/** The payment's amount: what every invoice takes, together. */
export const splitTotal = (parts: readonly Allocation[]) =>
  parts.reduce((sum, p) => sum + p.cents, 0);
