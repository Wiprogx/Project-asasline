import "server-only";
import { XMLParser } from "fast-xml-parser";
import { type ParsedUbl, ublVat } from "@/domain/peppol";

/**
 * Reading a supplier's UBL file (legacy parseUbl). Kept out of the domain because it needs an
 * XML parser; the mapping of tax categories back to VAT codes is the domain's (ublVat).
 */
type Node = Record<string, unknown>;
const toCents = (v: unknown) => Math.round(Number(text(v) || 0) * 100);
function text(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "object") return text((v as Node)["#text"]);
  return String(v).trim();
}
const at = (n: unknown, ...path: string[]): unknown =>
  path.reduce<unknown>((cur, k) => {
    const next = (cur as Node | undefined)?.[k];
    return Array.isArray(next) ? next[0] : next;
  }, n);
const list = (v: unknown): Node[] => (Array.isArray(v) ? v : v ? [v] : []) as Node[];

/** Reads a supplier's UBL invoice or credit note; null when the file is not one. */
export function parseUbl(xml: string): ParsedUbl | null {
  let doc: Node;
  try {
    doc = new XMLParser({
      removeNSPrefix: true,
      ignoreAttributes: false,
      parseTagValue: false,
    }).parse(xml) as Node;
  } catch {
    return null;
  }
  const kind = doc.Invoice ? "Invoice" : doc.CreditNote ? "CreditNote" : null;
  if (!kind) return null;
  const root = doc[kind] as Node;
  const sp = at(root, "AccountingSupplierParty", "Party");
  const lines = list(root[kind === "Invoice" ? "InvoiceLine" : "CreditNoteLine"]).map((l) => {
    const item = at(l, "Item");
    const qty =
      Number(text(at(l, "InvoicedQuantity")) || text(at(l, "CreditedQuantity")) || 1) || 1;
    const price = toCents(at(l, "Price", "PriceAmount"));
    const ext = toCents(at(l, "LineExtensionAmount"));
    return {
      description:
        [text(at(item, "Name")), text(at(item, "Description"))].filter(Boolean).join(" — ") ||
        "Line",
      qty,
      unitCents: price || Math.round(ext / qty),
      vatCode: ublVat(
        text(at(item, "ClassifiedTaxCategory", "ID")),
        Number(text(at(item, "ClassifiedTaxCategory", "Percent")) || 0),
      ),
    };
  });
  const vat = text(at(sp, "PartyTaxScheme", "CompanyID")) || text(at(sp, "EndpointID"));
  return {
    credit: kind === "CreditNote",
    number: text(root.ID),
    issueDate: text(root.IssueDate),
    dueDate: text(root.DueDate) || text(at(root, "PaymentMeans", "PaymentDueDate")) || null,
    currency: text(root.DocumentCurrencyCode) || "EUR",
    supplier: {
      name:
        text(at(sp, "PartyLegalEntity", "RegistrationName")) || text(at(sp, "PartyName", "Name")),
      vat,
      country: text(at(sp, "PostalAddress", "Country", "IdentificationCode")) || null,
    },
    iban: text(at(root, "PaymentMeans", "PayeeFinancialAccount", "ID"))
      .replace(/\s/g, "")
      .toUpperCase(),
    paymentId: text(at(root, "PaymentMeans", "PaymentID")),
    totalCents: toCents(
      at(root, "LegalMonetaryTotal", "PayableAmount") ??
        at(root, "LegalMonetaryTotal", "TaxInclusiveAmount"),
    ),
    lines,
  };
}
