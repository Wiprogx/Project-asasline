/**
 * Peppol e-invoicing (legacy ublXml / parseUbl / importUbl): the UBL 2.1 file of an invoice or
 * credit note under the Peppol BIS Billing 3.0 rules, and the reading of a supplier's UBL file
 * into a draft bill. Amounts are cents inside, euros with two decimals in the file.
 */
import { euros, xe } from "./vat";

/** Each VAT code's UBL tax category, rate and (for exemptions) the reason printed. */
const UBL_CAT: Record<string, [cat: string, pct: number, why?: string]> = {
  S21: ["S", 21],
  S6: ["S", 6],
  S0: ["Z", 0],
  EX41: ["E", 0, "Exempt — article 41 of the Belgian VAT Code"],
  RC: ["AE", 0, "Reverse charge — article 196 of Directive 2006/112/EC"],
  OUT: ["G", 0, "Outside the scope of Belgian VAT — customer outside the EU"],
};

/** Peppol participant schemes by country (the EAS code list). */
const SCHEME: Record<string, string> = {
  BE: "0208",
  NL: "9944",
  DE: "9930",
  FR: "9957",
  LU: "9938",
  IT: "0211",
  ES: "9920",
  AT: "9914",
  DK: "0184",
  SE: "0007",
  FI: "0037",
  IE: "9935",
  PT: "9946",
  PL: "9945",
};

export type UblParty = {
  name: string;
  street?: string | null;
  city?: string | null;
  zip?: string | null;
  country: string;
  vat?: string | null;
};

export type UblDoc = {
  credit: boolean;
  number: string;
  issueDate: string;
  dueDate?: string | null;
  buyerReference: string;
  note?: string | null;
  creditOf?: { number: string; issueDate: string } | null;
  supplier: UblParty;
  customer: UblParty;
  iban: string;
  paymentId?: string | null;
  lines: { description: string; qty: number; unitCents: number; vatCode: string }[];
};

const vatFull = (v?: string | null) => (v ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const vatDigits = (v?: string | null) => vatFull(v).replace(/^[A-Z]{2}/, "");

/** What a Peppol file needs that the customer record might not have. */
export function peppolProblems(c: {
  name: string;
  vat?: string | null;
  street?: string | null;
  city?: string | null;
}) {
  const out: string[] = [];
  if (!vatDigits(c.vat)) out.push(`${c.name} has no VAT number`);
  if (!c.street && !c.city) out.push(`${c.name} has no address`);
  return out;
}

function party(p: UblParty): string {
  const scheme = SCHEME[p.country];
  const endpoint =
    scheme && vatDigits(p.vat)
      ? `<cbc:EndpointID schemeID="${scheme}">${xe(scheme === "0208" ? vatDigits(p.vat) : vatFull(p.vat))}</cbc:EndpointID>`
      : "";
  const address = [
    p.street && `<cbc:StreetName>${xe(p.street)}</cbc:StreetName>`,
    p.city && `<cbc:CityName>${xe(p.city)}</cbc:CityName>`,
    p.zip && `<cbc:PostalZone>${xe(p.zip)}</cbc:PostalZone>`,
  ]
    .filter(Boolean)
    .join("");
  const tax = vatFull(p.vat)
    ? `<cac:PartyTaxScheme><cbc:CompanyID>${xe(vatFull(p.vat))}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>`
    : "";
  const legalId =
    p.country === "BE" && vatDigits(p.vat)
      ? `<cbc:CompanyID schemeID="0208">${xe(vatDigits(p.vat))}</cbc:CompanyID>`
      : "";
  return `<cac:Party>${endpoint}<cac:PartyName><cbc:Name>${xe(p.name)}</cbc:Name></cac:PartyName><cac:PostalAddress>${address}<cac:Country><cbc:IdentificationCode>${xe(p.country)}</cbc:IdentificationCode></cac:Country></cac:PostalAddress>${tax}<cac:PartyLegalEntity><cbc:RegistrationName>${xe(p.name)}</cbc:RegistrationName>${legalId}</cac:PartyLegalEntity></cac:Party>`;
}

export function ublXml(d: UblDoc): string {
  const R = d.credit ? "CreditNote" : "Invoice";
  const A = (cents: number) => `currencyID="EUR">${euros(cents)}`;
  const subs = new Map<string, { cat: string; pct: number; why?: string; base: number }>();
  for (const l of d.lines) {
    const [cat, pct, why] = UBL_CAT[l.vatCode] ?? UBL_CAT.S21;
    const k = `${cat}|${pct}`;
    const s = subs.get(k) ?? { cat, pct, why, base: 0 };
    s.base += Math.round(l.qty * l.unitCents);
    subs.set(k, s);
  }
  const taxes = [...subs.values()].map((s) => ({ ...s, tax: Math.round((s.base * s.pct) / 100) }));
  const net = taxes.reduce((t, s) => t + s.base, 0);
  const tax = taxes.reduce((t, s) => t + s.tax, 0);
  const lineTag = d.credit ? "CreditNoteLine" : "InvoiceLine";
  const qtyTag = d.credit ? "CreditedQuantity" : "InvoicedQuantity";
  const lines = d.lines.map((l, k) => {
    const [cat, pct] = UBL_CAT[l.vatCode] ?? UBL_CAT.S21;
    return `  <cac:${lineTag}><cbc:ID>${k + 1}</cbc:ID><cbc:${qtyTag} unitCode="C62">${l.qty}</cbc:${qtyTag}><cbc:LineExtensionAmount ${A(Math.round(l.qty * l.unitCents))}</cbc:LineExtensionAmount>
    <cac:Item><cbc:Name>${xe(l.description.slice(0, 200))}</cbc:Name><cac:ClassifiedTaxCategory><cbc:ID>${cat}</cbc:ID><cbc:Percent>${pct}</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:ClassifiedTaxCategory></cac:Item>
    <cac:Price><cbc:PriceAmount ${A(l.unitCents)}</cbc:PriceAmount></cac:Price></cac:${lineTag}>`;
  });
  const subtotal = taxes.map(
    (s) =>
      `    <cac:TaxSubtotal><cbc:TaxableAmount ${A(s.base)}</cbc:TaxableAmount><cbc:TaxAmount ${A(s.tax)}</cbc:TaxAmount><cac:TaxCategory><cbc:ID>${s.cat}</cbc:ID><cbc:Percent>${s.pct}</cbc:Percent>${s.why ? `<cbc:TaxExemptionReason>${xe(s.why)}</cbc:TaxExemptionReason>` : ""}<cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal>`,
  );
  const optional = [
    !d.credit && d.dueDate && `  <cbc:DueDate>${xe(d.dueDate)}</cbc:DueDate>`,
    `  <cbc:${R}TypeCode>${d.credit ? 381 : 380}</cbc:${R}TypeCode>`,
    d.note && `  <cbc:Note>${xe(d.note)}</cbc:Note>`,
    "  <cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>",
    `  <cbc:BuyerReference>${xe(d.buyerReference)}</cbc:BuyerReference>`,
    d.creditOf &&
      `  <cac:BillingReference><cac:InvoiceDocumentReference><cbc:ID>${xe(d.creditOf.number)}</cbc:ID><cbc:IssueDate>${xe(d.creditOf.issueDate)}</cbc:IssueDate></cac:InvoiceDocumentReference></cac:BillingReference>`,
  ].filter(Boolean);
  const payment = d.credit
    ? ""
    : `  <cac:PaymentMeans><cbc:PaymentMeansCode>30</cbc:PaymentMeansCode>${d.paymentId ? `<cbc:PaymentID>${xe(d.paymentId)}</cbc:PaymentID>` : ""}<cac:PayeeFinancialAccount><cbc:ID>${xe(d.iban.replace(/\s/g, ""))}</cbc:ID></cac:PayeeFinancialAccount></cac:PaymentMeans>\n`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<${R} xmlns="urn:oasis:names:specification:ubl:schema:xsd:${R}-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
  <cbc:ID>${xe(d.number)}</cbc:ID>
  <cbc:IssueDate>${xe(d.issueDate)}</cbc:IssueDate>
${optional.join("\n")}
  <cac:AccountingSupplierParty>${party(d.supplier)}</cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>${party(d.customer)}</cac:AccountingCustomerParty>
${payment}  <cac:TaxTotal>
    <cbc:TaxAmount ${A(tax)}</cbc:TaxAmount>
${subtotal.join("\n")}
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount ${A(net)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount ${A(net)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount ${A(net + tax)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount ${A(net + tax)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${lines.join("\n")}
</${R}>
`;
}

/** A UBL tax category back to our VAT code. */
export function ublVat(cat: string, pct: number): string {
  if (cat === "AE" || cat === "K") return "RC";
  if (cat === "E") return "EX41";
  if (cat === "G") return "OUT";
  if (cat === "S" && pct >= 20) return "S21";
  if (cat === "S" && pct >= 5) return "S6";
  return "S0";
}

export type ParsedUbl = {
  credit: boolean;
  number: string;
  issueDate: string;
  dueDate: string | null;
  currency: string;
  supplier: { name: string; vat: string; country: string | null };
  iban: string;
  paymentId: string;
  totalCents: number;
  lines: { description: string; qty: number; unitCents: number; vatCode: string }[];
};
