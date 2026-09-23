/**
 * Payments against sales invoices (legacy stage 5). Money is integer cents. A payment is
 * reversed, never deleted; the invoice's paid state follows its money and is never set by
 * hand.
 */
export const PAYMENT_METHODS = ["bank", "cash", "card", "other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Where a difference that is not paid goes (legacy write-off accounts). */
export const DIFF_ACCOUNTS = {
  "657000": "Bank charges",
  "658000": "Payment difference (loss)",
  "758000": "Payment difference (gain)",
} as const;
export type DiffAccount = keyof typeof DIFF_ACCOUNTS;

/** What is still owed: the gross, less what payments settled, less what credit notes took. */
export function openCents(grossCents: number, settledCents: number, creditedCents: number): number {
  return Math.max(0, grossCents - settledCents - creditedCents);
}

export type PayState = "credited" | "paid" | "partly" | "overdue" | "open";

export const PAY_STATE_META: Record<
  PayState,
  { label: string; tone: "neutral" | "success" | "warning" | "danger" | "info" }
> = {
  credited: { label: "Credited", tone: "neutral" },
  paid: { label: "Paid", tone: "success" },
  partly: { label: "Partly paid", tone: "warning" },
  overdue: { label: "Overdue", tone: "danger" },
  open: { label: "Unpaid", tone: "warning" },
};

/** An issued invoice's state from its money and its due date against the office's today. */
export function payState(i: {
  grossCents: number;
  settledCents: number;
  creditedCents: number;
  dueDate: string | null;
  today: string;
}): PayState {
  if (i.creditedCents >= i.grossCents && i.settledCents === 0) return "credited";
  const open = openCents(i.grossCents, i.settledCents, i.creditedCents);
  if (open === 0) return "paid";
  if (i.dueDate && i.dueDate < i.today) return "overdue";
  return i.settledCents > 0 ? "partly" : "open";
}

/**
 * How a payment settles one invoice. Never more than is open; a shortfall is left open unless
 * a write-off account takes it, in which case the invoice is settled in full.
 */
export function settlement(
  amountCents: number,
  open: number,
  writeOff: DiffAccount | null,
): { allocated: number; diffCents: number; problem: string | null } {
  if (amountCents <= 0)
    return { allocated: 0, diffCents: 0, problem: "The amount must be above zero." };
  if (amountCents > open)
    return {
      allocated: 0,
      diffCents: 0,
      problem: `Only ${(open / 100).toFixed(2)} is open on this invoice.`,
    };
  if (writeOff && amountCents < open)
    return { allocated: amountCents, diffCents: open - amountCents, problem: null };
  return { allocated: amountCents, diffCents: 0, problem: null };
}
