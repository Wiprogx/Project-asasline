/**
 * A legacy invoice (legacy invoices[]: type client/supplier, kind credit, st, num, lines) as the
 * new document. A sales invoice or credit note keeps its number as issued (invariant 2); a
 * supplier bill keeps the supplier's number as its reference (its BILL number is issued on
 * import). Payment states (paid, partly, overdue) come from the payments, so an issued
 * document is simply "issued". Amounts become cents; a part-unit quantity is folded into the
 * line's price, never rounded away.
 */
import { VAT_CODES } from "./accounting";

export type LegacyInvoiceLine = {
  position: number;
  description: string;
  qty: number;
  unitCents: number;
  vatCode: string;
  account: string;
  /** The catalogue item it billed (legacy itemId), to find the quotation line it came from. */
  legacyItemId: string | null;
  /** On a credit note: the place of the invoice line it gives back (legacy srcIx). */
  creditOfPosition: number | null;
};

const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const day = (v: unknown) => {
  const s = typeof v === "string" ? v.slice(0, 10) : "";
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};
const objects = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v)
    ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    : [];
const CODES = new Set<string>(VAT_CODES.map((v) => v.code));

function lineOf(l: Record<string, unknown>, i: number, warnings: string[]): LegacyInvoiceLine {
  const qty = Number(l.qty ?? 1) || 1;
  const price = Number(l.price ?? 0) || 0;
  const description = text(l.desc) ?? "Line";
  const vat = String(l.vat ?? "");
  if (!CODES.has(vat))
    warnings.push(`line ${i + 1}: VAT "${vat}" is not a code here — read as S21`);
  const whole = Number.isInteger(qty);
  if (!whole) warnings.push(`line ${i + 1}: ${qty} × ${price} kept as one line of the total`);
  return {
    position: i,
    description: whole ? description : `${description} (${qty} × ${price.toFixed(2)})`,
    qty: whole ? Math.abs(qty) : 1,
    unitCents: Math.round((whole ? price : qty * price) * 100) * (whole && qty < 0 ? -1 : 1),
    vatCode: CODES.has(vat) ? vat : "S21",
    account: text(l.acct) ?? "700000",
    legacyItemId: l.itemId === undefined || l.itemId === null ? null : String(l.itemId),
    creditOfPosition: Number.isInteger(l.srcIx) ? Number(l.srcIx) : null,
  };
}

export function mapLegacyInvoice(i: Record<string, unknown>) {
  const supplier = i.type === "supplier";
  const credit = i.kind === "credit";
  const warnings: string[] = [];
  if (supplier && credit) return { skip: "a supplier's credit note has no place here yet" };
  const status = i.st === "draft" ? "draft" : i.st === "discarded" ? "discarded" : "issued";
  const num = text(i.num);
  if (status === "issued" && !num) return { skip: "issued without a number" };
  const cur = text(i.cur) ?? "EUR";
  const fx = cur === "EUR" ? 1 : Number(i.fx) || 1;
  return {
    doc: {
      kind: supplier ? ("bill" as const) : credit ? ("credit" as const) : ("invoice" as const),
      status: status as "draft" | "discarded" | "issued",
      number: supplier ? null : num,
      supplierRef: supplier ? num : null,
      issueDate: day(i.date),
      paymentTermId: text(i.termId),
      currency: cur,
      fxBp: Math.round(fx * 10_000),
      ogm: text(i.ogm),
      reason: text(i.reason),
      note: text(i.note),
      viaPeppol: i.peppol === "in",
    },
    customer: { legacyId: i.clientId ?? null, name: text(i.client) },
    bookingLegacyId: i.bookingId === undefined || i.bookingId === null ? null : String(i.bookingId),
    creditOfLegacyId: credit && i.creditOf !== undefined ? String(i.creditOf) : null,
    lines: objects(i.lines).map((l, k) => lineOf(l, k, warnings)),
    warnings,
  };
}
