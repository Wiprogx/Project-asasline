/**
 * Which invoice is this bank line? (legacy proposals). The strongest evidence first: the
 * structured communication, then the invoice number in the text, then a known IBAN with
 * exactly the open amount, then the amount alone. Confidence 3 = certain enough to apply
 * without a person; auto-match never books more than is open.
 */
export type OpenInvoice = {
  id: string;
  number: string;
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
  if (line.amountCents <= 0) return []; // money going out is a supplier matter
  const out: Proposal[] = [];
  const add = (inv: OpenInvoice | undefined, why: string, confidence: Proposal["confidence"]) => {
    if (inv && !out.some((p) => p.invoiceId === inv.id))
      out.push({ invoiceId: inv.id, why, confidence });
  };

  if (line.ogm)
    add(
      open.find((i) => i.ogm && digits(i.ogm) === digits(line.ogm)),
      `structured communication ${line.ogm}`,
      3,
    );

  const text = ` ${line.comm} ${line.name} `.toUpperCase();
  for (const i of open)
    if (text.includes(i.number.toUpperCase())) add(i, `the text mentions ${i.number}`, 3);

  const customer = line.iban ? contactOfIban(line.iban) : null;
  if (customer) {
    const same = open.filter((i) => i.customerId === customer && i.openCents === line.amountCents);
    if (same.length === 1)
      add(same[0], "the IBAN is the customer's, and the amount is exactly what is open", 3);
  }

  if (out.length === 0) {
    const same = open.filter((i) => i.openCents === line.amountCents);
    if (same.length === 1) add(same[0], "only the amount matches — check the name", 1);
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
  return inv && amountCents <= inv.openCents ? best : null;
}
