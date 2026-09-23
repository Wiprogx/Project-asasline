/**
 * The Belgian periodic VAT return (form 625, legacy vatReturn / gridsOfLine / intervatXml).
 * A period is "2026-08" (monthly filer) or "2026-Q3" (quarterly). The grid of each VAT code is
 * the office's reading of the form — to be confirmed with the accountant before filing; the
 * Intervat file is a draft to upload to Intervat's own check.
 */
import { EU_COUNTRIES } from "./accounting";
import { addDays, addMonths } from "./dates";
import { invoiceTotals, type Line } from "./invoicing";

const PERIOD = /^(\d{4})-(0[1-9]|1[0-2]|Q[1-4])$/;

export const isVatPeriod = (p: string) => PERIOD.test(p);

export function vatPeriodOf(day: string, mode: "monthly" | "quarterly"): string {
  if (mode === "monthly") return day.slice(0, 7);
  return `${day.slice(0, 4)}-Q${Math.floor((Number(day.slice(5, 7)) - 1) / 3) + 1}`;
}

export function vatPeriodRange(p: string): { from: string; to: string } {
  const [, y, part] = PERIOD.exec(p) ?? [];
  if (!y) throw new Error(`Not a VAT period: ${p}`);
  const quarter = part.startsWith("Q");
  const month = quarter ? (Number(part[1]) - 1) * 3 + 1 : Number(part);
  const from = `${y}-${String(month).padStart(2, "0")}-01`;
  return { from, to: addDays(addMonths(from, quarter ? 3 : 1), -1) };
}

export function vatPeriodShift(p: string, n: number): string {
  const { from } = vatPeriodRange(p);
  return p.includes("Q")
    ? vatPeriodOf(addMonths(from, 3 * n), "quarterly")
    : vatPeriodOf(addMonths(from, n), "monthly");
}

/** Monthly returns are due on the 20th of the next month, quarterly on the 25th. */
export function vatDeadline(p: string): string {
  const next = addMonths(`${vatPeriodRange(p).to.slice(0, 8)}01`, 1);
  return `${next.slice(0, 8)}${p.includes("Q") ? "25" : "20"}`;
}

export const GRID_LABEL: Record<string, string> = {
  "00": "Operations at 0% / exempt",
  "01": "Operations at 6%",
  "02": "Operations at 12%",
  "03": "Operations at 21%",
  "44": "Services to EU business customers (reverse charge)",
  "46": "Intra-community supplies of goods",
  "47": "Other exempt operations and operations abroad (export, art. 41)",
  "48": "Credit notes on 44 and 46",
  "49": "Credit notes on other sales",
  "54": "VAT due on sales",
  "55": "VAT due on intra-community acquisitions (reverse charge)",
  "56": "VAT due — other reverse charge (outside the EU)",
  "59": "Deductible VAT",
  "63": "VAT on credit notes received",
  "64": "VAT on credit notes issued",
  "71": "VAT to pay",
  "72": "VAT to recover",
  "81": "Purchases — goods for resale",
  "82": "Purchases — services and other goods",
  "83": "Purchases — investment goods",
  "84": "Credit notes received on 86 and 88",
  "85": "Credit notes received — other",
  "87": "Other purchases where the office pays the VAT",
  "88": "Intra-community services received",
};

export const GRID_SECTIONS = {
  Sales: ["00", "01", "02", "03", "44", "46", "47", "48", "49"],
  Purchases: ["81", "82", "83", "84", "85", "87", "88"],
  VAT: ["54", "55", "56", "59", "63", "64"],
} as const;

const SALE_GRID: Record<string, string> = {
  S21: "03",
  S6: "01",
  S0: "00",
  EX41: "47",
  OUT: "47",
  RC: "44",
};

export type VatDoc = {
  side: "sale" | "purchase";
  credit: boolean;
  /** The partner's country (ISO-2), to tell an EU supplier's reverse charge from another. */
  partnerCountry: string | null;
  lines: readonly (Line & { account: string })[];
};

const RC_RATE = 21;

/** Adds one document's lines to the grids (cents). VAT is taken per document, as it was invoiced. */
function addDoc(G: Map<string, number>, d: VatDoc) {
  const add = (g: string, v: number) => v !== 0 && G.set(g, (G.get(g) ?? 0) + v);
  const vat = invoiceTotals(d.lines).vatCents;
  if (d.side === "sale") {
    for (const l of d.lines) {
      const net = Math.round(l.qty * l.unitCents);
      add(d.credit ? (l.vatCode === "RC" ? "48" : "49") : (SALE_GRID[l.vatCode] ?? "00"), net);
    }
    add(d.credit ? "64" : "54", vat);
    return;
  }
  const eu =
    !!d.partnerCountry && d.partnerCountry !== "BE" && EU_COUNTRIES.includes(d.partnerCountry);
  let rc = 0;
  for (const l of d.lines) {
    const net = Math.round(l.qty * l.unitCents);
    const reverse = l.vatCode === "RC";
    if (d.credit) add(reverse && eu ? "84" : "85", net);
    else add(l.account.startsWith("2") ? "83" : "82", net);
    if (reverse) {
      if (!d.credit) add(eu ? "88" : "87", net);
      rc += net;
    }
  }
  const rcVat = Math.round((rc * RC_RATE) / 100);
  add(d.credit ? "63" : "59", vat);
  if (rcVat && !d.credit) {
    add(eu ? "55" : "56", rcVat);
    add("59", rcVat);
  }
}

/** The return: every grid in cents, what is due to the state (XX) and to the office (YY), and 71 or 72. */
export function vatReturn(docs: readonly VatDoc[]) {
  const G = new Map<string, number>();
  for (const d of docs) addDoc(G, d);
  const sum = (ks: string[]) => ks.reduce((s, k) => s + (G.get(k) ?? 0), 0);
  const xx = sum(["54", "55", "56", "57", "61", "63"]);
  const yy = sum(["59", "62", "64"]);
  if (xx > yy) G.set("71", xx - yy);
  if (yy > xx) G.set("72", yy - xx);
  return { grids: G, dueCents: xx, deductibleCents: yy, balanceCents: xx - yy };
}

export const xe = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export type Declarant = {
  vat: string;
  name: string;
  street: string;
  postCode: string;
  city: string;
  email: string;
  phone: string;
};

/** The declarant block every Intervat file carries. */
export function declarantXml(o: Declarant): string {
  return `<ns2:Declarant>
      <VATNumber>${xe(o.vat.replace(/\D/g, ""))}</VATNumber>
      <Name>${xe(o.name)}</Name>
      <Street>${xe(o.street)}</Street>
      <PostCode>${xe(o.postCode)}</PostCode>
      <City>${xe(o.city)}</City>
      <CountryCode>BE</CountryCode>
      <EmailAddress>${xe(o.email)}</EmailAddress>
      <Phone>${xe(o.phone.replace(/\s/g, ""))}</Phone>
    </ns2:Declarant>`;
}

/** A month ("2026-08") or a quarter ("2026-Q3") as Intervat writes it. */
export function periodXml(period: string): string {
  const [, y, part] = PERIOD.exec(period) ?? [];
  if (!y) throw new Error(`Not a VAT period: ${period}`);
  const when = part.startsWith("Q")
    ? `<ns2:Quarter>${part[1]}</ns2:Quarter>`
    : `<ns2:Month>${Number(part)}</ns2:Month>`;
  return `<ns2:Period>${when}<ns2:Year>${y}</ns2:Year></ns2:Period>`;
}

export const euros = (cents: number) => (cents / 100).toFixed(2);

/** A draft Intervat VATConsignment file for one period. */
export function intervatXml(period: string, grids: Map<string, number>, o: Declarant): string {
  const amounts = [...grids]
    .filter(([, v]) => v !== 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([k, v]) => `      <ns2:Amount GridNumber="${Number(k)}">${euros(Math.abs(v))}</ns2:Amount>`,
    );
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- DRAFT made by the ASASLINE office app — upload it to Intervat's check before filing -->
<ns2:VATConsignment xmlns="http://www.minfin.fgov.be/InputCommon" xmlns:ns2="http://www.minfin.fgov.be/VATConsignment" VATDeclarationsNbr="1">
  <ns2:VATDeclaration SequenceNumber="1" DeclarantReference="${xe(`ASAS-${period}`)}">
    ${declarantXml(o)}
    ${periodXml(period)}
    <ns2:Data>
${amounts.join("\n")}
    </ns2:Data>
    <ns2:ClientListingNihil>NO</ns2:ClientListingNihil>
    <ns2:Ask Restitution="NO" Payment="NO"/>
  </ns2:VATDeclaration>
</ns2:VATConsignment>
`;
}
