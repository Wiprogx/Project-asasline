/**
 * The yearly and intra-community listings (legacy clientListing / intraListing / listingXml)
 * and the accountant's CSV export (legacy journalCsv). Drafts to check in Intervat before
 * filing, like the VAT return.
 */
import { invoiceTotals, type Line } from "./invoicing";
import { accountName, type Entry } from "./ledger";
import { type Declarant, declarantXml, euros, periodXml, xe } from "./vat";

export type ListingDoc = {
  side: "sale" | "purchase";
  credit: boolean;
  date: string;
  partnerId: string;
  partner: string;
  partnerCountry: string | null;
  partnerVat: string | null;
  lines: readonly Line[];
};

/** The country that issued a VAT number: its prefix, else the contact's country. */
export function vatCountry(vat: string | null, country: string | null): string {
  const m = /^([A-Z]{2})/.exec((vat ?? "").toUpperCase().replace(/\s/g, ""));
  return m ? m[1] : (country ?? "BE").toUpperCase();
}

/** The number without its country prefix or punctuation. */
export const vatNumberOnly = (vat: string | null) =>
  (vat ?? "")
    .toUpperCase()
    .replace(/^[A-Z]{2}/, "")
    .replace(/[^A-Z0-9]/g, "");

/** Belgian customers are listed from more than €250 turnover in the year (net of credit notes). */
export const LISTING_THRESHOLD_CENTS = 25_000;

export type ClientRow = { partner: string; vat: string; netCents: number; vatCents: number };

export function clientListing(docs: readonly ListingDoc[], year: string): ClientRow[] {
  const by = new Map<string, ClientRow>();
  for (const d of docs) {
    if (d.side !== "sale" || !d.date.startsWith(year)) continue;
    if (vatCountry(d.partnerVat, d.partnerCountry) !== "BE" || !vatNumberOnly(d.partnerVat))
      continue;
    const t = invoiceTotals(d.lines);
    const s = d.credit ? -1 : 1;
    const row = by.get(d.partnerId) ?? {
      partner: d.partner,
      vat: vatNumberOnly(d.partnerVat),
      netCents: 0,
      vatCents: 0,
    };
    row.netCents += s * t.netCents;
    row.vatCents += s * t.vatCents;
    by.set(d.partnerId, row);
  }
  return [...by.values()]
    .filter((r) => r.netCents > LISTING_THRESHOLD_CENTS)
    .sort((a, b) => b.netCents - a.netCents);
}

export type IntraRow = { partner: string; country: string; vat: string; netCents: number };

/** Services to EU business customers under the reverse charge, per customer, over a VAT period. */
export function intraListing(
  docs: readonly ListingDoc[],
  range: { from: string; to: string },
): IntraRow[] {
  const by = new Map<string, IntraRow>();
  for (const d of docs) {
    if (d.side !== "sale" || d.date < range.from || d.date > range.to) continue;
    const net = d.lines
      .filter((l) => l.vatCode === "RC")
      .reduce((s, l) => s + Math.round(l.qty * l.unitCents), 0);
    if (!net) continue;
    const row = by.get(d.partnerId) ?? {
      partner: d.partner,
      country: vatCountry(d.partnerVat, d.partnerCountry),
      vat: vatNumberOnly(d.partnerVat),
      netCents: 0,
    };
    row.netCents += (d.credit ? -1 : 1) * net;
    by.set(d.partnerId, row);
  }
  return [...by.values()].filter((r) => r.netCents !== 0);
}

const HEAD = `<?xml version="1.0" encoding="UTF-8"?>
<!-- DRAFT made by the ASASLINE office app — check it in Intervat before filing -->`;

export function clientListingXml(year: string, rows: ClientRow[], o: Declarant): string {
  const sum = (k: "netCents" | "vatCents") => euros(rows.reduce((s, r) => s + r[k], 0));
  const clients = rows.map(
    (r, i) =>
      `    <ns2:Client SequenceNumber="${i + 1}"><ns2:CompanyVATNumber issuedBy="BE">${xe(r.vat)}</ns2:CompanyVATNumber><ns2:TurnOver>${euros(r.netCents)}</ns2:TurnOver><ns2:VATAmount>${euros(r.vatCents)}</ns2:VATAmount></ns2:Client>`,
  );
  return `${HEAD}
<ns2:ClientListingConsignment xmlns="http://www.minfin.fgov.be/InputCommon" xmlns:ns2="http://www.minfin.fgov.be/ClientListingConsignment" ClientListingsNbr="1">
  <ns2:ClientListing SequenceNumber="1" ClientsNbr="${rows.length}" DeclarantReference="ASAS-LIST-${xe(year)}" TurnOverSum="${sum("netCents")}" VATAmountSum="${sum("vatCents")}">
    ${declarantXml(o)}
    <ns2:Period>${xe(year)}</ns2:Period>
${clients.join("\n")}
  </ns2:ClientListing>
</ns2:ClientListingConsignment>
`;
}

export function intraListingXml(period: string, rows: IntraRow[], o: Declarant): string {
  const clients = rows.map(
    (r, i) =>
      `    <ns2:IntraClient SequenceNumber="${i + 1}"><ns2:CompanyVATNumber issuedBy="${xe(r.country)}">${xe(r.vat)}</ns2:CompanyVATNumber><ns2:Code>S</ns2:Code><ns2:Amount>${euros(r.netCents)}</ns2:Amount></ns2:IntraClient>`,
  );
  return `${HEAD}
<ns2:IntraConsignment xmlns="http://www.minfin.fgov.be/InputCommon" xmlns:ns2="http://www.minfin.fgov.be/IntraConsignment" IntraListingsNbr="1">
  <ns2:IntraListing SequenceNumber="1" ClientsNbr="${rows.length}" DeclarantReference="ASAS-IC-${xe(period)}" AmountSum="${euros(rows.reduce((s, r) => s + r.netCents, 0))}">
    ${declarantXml(o)}
    ${periodXml(period)}
${clients.join("\n")}
  </ns2:IntraListing>
</ns2:IntraConsignment>
`;
}

/** A CSV cell for a Belgian spreadsheet: ";" separated, quoted when it must be. */
export function csvCell(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Cents as a decimal with a comma, as Excel in Belgium reads it. */
export const csvAmount = (cents: number) => euros(cents).replace(".", ",");

/** The journal for the accountant: one row per line, with a BOM so Excel reads the accents. */
export function journalCsv(entries: readonly Entry[]): string {
  const rows: (string | number)[][] = [
    [
      "Date",
      "Journal",
      "Reference",
      "Account",
      "Account name",
      "Label",
      "Partner",
      "Debit",
      "Credit",
    ],
  ];
  for (const e of entries)
    for (const l of e.lines)
      rows.push([
        e.date,
        e.journal,
        e.ref,
        l.account,
        accountName(l.account),
        l.label && l.label !== e.partner ? `${e.label} · ${l.label}` : e.label,
        e.partner ?? "",
        l.cents > 0 ? csvAmount(l.cents) : "",
        l.cents < 0 ? csvAmount(-l.cents) : "",
      ]);
  return `﻿${rows.map((r) => r.map(csvCell).join(";")).join("\r\n")}`;
}
