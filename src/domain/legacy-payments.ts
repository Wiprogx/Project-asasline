/**
 * A legacy payment (legacy makePayment: dir, amount, allocs, diffs, bankId, st) as the new
 * payment and its allocations. Each allocation keeps what it settled; what the parts exceed
 * the money by was written off to the legacy difference's account. A payment with nobody,
 * booked straight to an account, is a charge on that account. Amounts become cents.
 */

const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const day = (v: unknown) => {
  const s = typeof v === "string" ? v.slice(0, 10) : "";
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};
const cents = (v: unknown) => (Number.isFinite(Number(v)) ? Math.round(Number(v) * 100) : 0);
const objects = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v)
    ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    : [];

export function mapLegacyPayment(p: Record<string, unknown>) {
  const date = day(p.date);
  if (!date) return { skip: "no date" };
  const amountCents = Math.abs(cents(p.amount));
  const allocs = objects(p.allocs)
    .filter((a) => a.inv !== undefined && a.inv !== null)
    .map((a) => ({ legacyInvoiceId: String(a.inv), amountCents: cents(a.amount) }));
  const diffs = objects(p.diffs);
  const diffAccount = text(diffs[0]?.acct);
  const settled = allocs.reduce((s, a) => s + a.amountCents, 0);
  const hasContact = p.contactId !== undefined && p.contactId !== null && p.contactId !== "";
  const charge = !hasContact && !allocs.length ? diffAccount : null;
  const reversed = p.st === "reversed";
  return {
    payment: {
      direction: p.dir === "out" ? ("out" as const) : ("in" as const),
      date,
      amountCents,
      method: p.bankId === "cash" ? ("cash" as const) : ("bank" as const),
      reference: text(p.ref) ?? text(p.memo),
      diffCents: allocs.length ? settled - amountCents : 0,
      diffAccount: allocs.length && settled !== amountCents ? diffAccount : null,
      chargeAccount: charge,
      status: reversed ? ("reversed" as const) : ("posted" as const),
      reversedOn: reversed ? (day(p.reversedAt) ?? date) : null,
      reversalReason: reversed
        ? (text(p.reversalReason) ?? text(p.why) ?? "Reversed in the legacy office")
        : null,
    },
    contact: { legacyId: hasContact ? p.contactId : null, name: text(p.contact) },
    legacyBankLineId:
      p.bankLineId === undefined || p.bankLineId === null ? null : String(p.bankLineId),
    allocs,
  };
}

/** A legacy statement line (legacy bankLines: key, date, amount, st, paymentId) as a bank line. */
export function mapLegacyBankLine(l: Record<string, unknown>, legacyId: string) {
  const date = day(l.date);
  if (!date) return null;
  const st = String(l.st ?? "open");
  const paid = l.paymentId !== undefined && l.paymentId !== null && l.paymentId !== "";
  return {
    line: {
      dedupKey: text(l.key) ?? `legacy:${legacyId}`,
      source: "legacy",
      account: text(l.bankId),
      date,
      amountCents: cents(l.amount),
      name: text(l.name),
      iban: text(l.iban),
      comm: text(l.comm) ?? text(l.ref),
      ogm: text(l.ogm),
      state:
        st === "ignored"
          ? ("ignored" as const)
          : paid || st === "matched" || st === "done"
            ? ("matched" as const)
            : ("open" as const),
    },
    legacyPaymentId: paid ? String(l.paymentId) : null,
  };
}
