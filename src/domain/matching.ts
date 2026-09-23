/**
 * Which invoice is this bank line? (legacy proposals). Money coming in pays a customer's
 * invoice; money going out pays a supplier's bill. The strongest evidence first: the
 * structured communication (invoices only), then a number written in the text (ours, or the
 * supplier's own reference), then a known IBAN with exactly the open amount, then the amount
 * alone. Confidence 3 = certain enough to apply without a person; auto-match never books
 * more than is open.
 */
export type OpenInvoice = {
  id: string;
  kind: "invoice" | "bill";
  number: string;
  supplierRef?: string | null;
  ogm: string | null;
  customerId: string;
  openCents: number;
};

export type Proposal = { invoiceId: string; why: string; confidence: 1 | 2 | 3 };

const digits = (s: string) => s.replace(/\D/g, "");

export function proposals(
  line: { amountCents: number; comm: string; ogm: string; name: string; iban: string },
  open: readonly OpenInvoice[],
  contactOfIban: (iban: string) => string | null,
): Proposal[] {
  if (line.amountCents === 0) return [];
  const kind = line.amountCents > 0 ? "invoice" : "bill";
  const amount = Math.abs(line.amountCents);
  const candidates = open.filter((i) => i.kind === kind);
  const party = kind === "invoice" ? "customer" : "supplier";
  const out: Proposal[] = [];
  const add = (inv: OpenInvoice | undefined, why: string, confidence: Proposal["confidence"]) => {
    if (inv && !out.some((p) => p.invoiceId === inv.id))
      out.push({ invoiceId: inv.id, why, confidence });
  };

  if (line.ogm && kind === "invoice")
    add(
      candidates.find((i) => i.ogm && digits(i.ogm) === digits(line.ogm)),
      `structured communication ${line.ogm}`,
      3,
    );

  const text = ` ${line.comm} ${line.name} `.toUpperCase();
  for (const i of candidates) {
    if (i.number && text.includes(i.number.toUpperCase()))
      add(i, `the text mentions ${i.number}`, 3);
    else if (
      i.supplierRef &&
      i.supplierRef.length >= 4 &&
      text.includes(i.supplierRef.toUpperCase())
    )
      add(i, `the text mentions the supplier's number ${i.supplierRef}`, 3);
  }

  const contact = line.iban ? contactOfIban(line.iban) : null;
  if (contact) {
    const same = candidates.filter((i) => i.customerId === contact && i.openCents === amount);
    if (same.length === 1)
      add(same[0], `the IBAN is the ${party}'s, and the amount is exactly what is open`, 3);
  }

  if (out.length === 0) {
    const same = candidates.filter((i) => i.openCents === amount);
    if (same.length === 1) add(same[0], `only the amount matches — check the ${party}`, 1);
  }
  return out.sort((a, b) => b.confidence - a.confidence);
}

/** The proposal auto-match may apply: certain, and not more than the invoice has open. */
export function certainMatch(
  amountCents: number,
  props: readonly Proposal[],
  open: readonly OpenInvoice[],
) {
  const best = props.find((p) => p.confidence === 3);
  const inv = best && open.find((i) => i.id === best.invoiceId);
  return inv && Math.abs(amountCents) <= inv.openCents ? best : null;
}
