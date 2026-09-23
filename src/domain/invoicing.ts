import { VAT_CODES } from "./accounting";
import { addDays } from "./dates";

/**
 * Sales invoices and credit notes (legacy stage 4). Money is integer cents. A draft has no
 * number; issuing takes the next number of an unbroken yearly sequence and freezes the
 * invoice for ever — it is corrected by a credit note, never edited (invariant 7).
 */
export const INVOICE_KINDS = ["invoice", "credit"] as const;
export type InvoiceKind = (typeof INVOICE_KINDS)[number];

export const INVOICE_STATUSES = ["draft", "issued", "discarded"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

const PREFIX: Record<InvoiceKind, string> = { invoice: "INV", credit: "CN" };

/** The sequence a number is taken from: one per kind and year ("INV2026"). */
export const invoiceSequenceKey = (kind: InvoiceKind, day: string) =>
  `${PREFIX[kind]}${day.slice(0, 4)}`;

/** "INV/2026/00001" — the shape Odoo used, so the sequence continues across the cut-over. */
export function formatInvoiceNumber(kind: InvoiceKind, day: string, n: number): string {
  if (!Number.isInteger(n) || n < 1) throw new Error(`Invalid invoice counter ${n}`);
  return `${PREFIX[kind]}/${day.slice(0, 4)}/${String(n).padStart(5, "0")}`;
}

export type Line = { qty: number; unitCents: number; vatCode: string };

export const vatRate = (code: string): number | null =>
  VAT_CODES.find((v) => v.code === code)?.rate ?? null;

/**
 * Totals. VAT is computed per rate on the summed net and rounded once per rate, as the
 * Belgian return is filed per rate — rounding per line drifts by a cent over many lines.
 * An unknown VAT code makes the totals fail rather than guess 0% (fail closed).
 */
export function invoiceTotals(lines: readonly Line[]) {
  const byRate = new Map<number, number>();
  let net = 0;
  for (const l of lines) {
    const rate = vatRate(l.vatCode);
    if (rate === null) throw new Error(`Unknown VAT code ${l.vatCode}`);
    const lineNet = Math.round(l.qty * l.unitCents);
    net += lineNet;
    byRate.set(rate, (byRate.get(rate) ?? 0) + lineNet);
  }
  const rates = [...byRate.entries()]
    .map(([rate, base]) => ({ rate, baseCents: base, vatCents: Math.round((base * rate) / 100) }))
    .sort((a, b) => b.rate - a.rate);
  const vat = rates.reduce((s, r) => s + r.vatCents, 0);
  return { netCents: net, vatCents: vat, grossCents: net + vat, rates };
}

/** The legal mentions an invoice must print for the exempt VAT codes it uses. */
export function vatMentions(lines: readonly Line[]): string[] {
  const codes = new Set(lines.map((l) => l.vatCode));
  return VAT_CODES.filter((v) => codes.has(v.code) && "mention" in v).map(
    (v) => (v as { mention: string }).mention,
  );
}

/**
 * Due date from the payment term. A term that is not a number of days (documents against
 * payment, before confirmation…) is due at once: the condition is on the shipment, not the
 * calendar.
 */
export function dueDateOf(issueDay: string, term: { rule: string; days?: number } | null): string {
  if (term?.rule === "days" && typeof term.days === "number")
    return addDays(issueDay, term.days) || issueDay;
  return issueDay;
}

export type BillStatus = "none" | "not" | "partly" | "done" | "over";

export const BILL_STATUS_LABEL: Record<BillStatus, string> = {
  none: "Nothing to invoice",
  not: "Not invoiced",
  partly: "Partly invoiced",
  done: "Invoiced",
  over: "Over-invoiced",
};

/** A booking's invoicing state: what it is worth against what was invoiced, net of credits. */
export function billStatus(totalCents: number, billedCents: number): BillStatus {
  if (totalCents <= 0 && billedCents <= 0) return "none";
  if (billedCents <= 0) return "not";
  if (billedCents > totalCents) return "over";
  if (billedCents === totalCents) return "done";
  return "partly";
}

/** What is left to invoice on one billable line, given what issued invoices and credits took. */
export function remainingQty(
  lineQty: number,
  billed: readonly { kind: InvoiceKind; qty: number }[],
): number {
  const taken = billed.reduce((s, b) => s + (b.kind === "credit" ? -b.qty : b.qty), 0);
  return Math.max(0, lineQty - taken);
}

/** Legacy guard 10.3: only a party on the shipment can be invoiced for it. */
export function payerProblem(payerId: string, parties: readonly (string | null)[]): string | null {
  return parties.includes(payerId) ? null : "The customer invoiced must be a party on the booking.";
}
