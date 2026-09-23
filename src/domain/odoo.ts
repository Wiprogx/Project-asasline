/**
 * The cut-over from Odoo (legacy odooContacts / odooInvoices / odooBalances). What Odoo holds
 * on the cut-over day comes over as CSV exports: the contacts, the invoices and bills still
 * open, and the trial balance. Only what is open comes over, against 499000 — the revenue and
 * the VAT of those documents were Odoo's, and stay in Odoo's books.
 */
import { csvCents, csvDate, splitCsv } from "./bank";
import { type Entry, entry } from "./ledger";

type Table = { rows: string[][]; col: (...res: RegExp[]) => number };

/** A CSV export read as a table: separator guessed, quoted cells (even over lines) kept whole. */
export function csvTable(text: string): Table | null {
  const lines = text
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim());
  if (lines.length < 2) return null;
  const sep = [",", ";", "\t"].sort(
    (a, b) => lines[0].split(b).length - lines[0].split(a).length,
  )[0];
  const rows: string[][] = [];
  let buf = "";
  for (const l of lines) {
    buf = buf ? `${buf}\n${l}` : l;
    if ((buf.match(/"/g) ?? []).length % 2 === 0) {
      rows.push(splitCsv(buf, sep).map((c) => c.replace(/^"|"$/g, "").trim()));
      buf = "";
    }
  }
  const header = rows[0].map((h) => h.toLowerCase().replace(/\s+/g, " ").trim());
  return {
    rows: rows.slice(1).filter((r) => r.some(Boolean)),
    col: (...res) => {
      for (const re of res) {
        const k = header.findIndex((h) => re.test(h));
        if (k >= 0) return k;
      }
      return -1;
    },
  };
}

const cell = (r: string[], k: number) => (k >= 0 ? (r[k] ?? "").trim() : "");
const amount = (s: string) => Math.abs(csvCents(s) ?? 0);

export type OdooContact = {
  name: string;
  vat: string | null;
  street: string | null;
  zip: string | null;
  city: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  iban: string | null;
};

export function readContacts(text: string): { items: OdooContact[] } | { error: string } {
  const t = csvTable(text);
  if (!t) return { error: "This file does not read as a table." };
  const c = {
    name: t.col(/^(name|display name|nom|naam|nom complet|volledige naam)$/, /^name/),
    vat: t.col(/^(vat|tax id|numéro de tva|n° tva|btw|btw-nummer|tva)/),
    street: t.col(/^(street|rue|straat)$/),
    zip: t.col(/^(zip|code postal|postcode)/),
    city: t.col(/^(city|ville|plaats|stad)$/),
    country: t.col(/^(country|pays|land)/),
    email: t.col(/^(email|e-mail|courriel)/),
    phone: t.col(/^(phone|téléphone|telefoon)/),
    iban: t.col(/bank account|iban|compte bancaire|bankrekening/),
  };
  if (c.name < 0) return { error: "No «Name» column — this is not a contacts export." };
  const items = t.rows
    .filter((r) => cell(r, c.name))
    .map((r) => {
      const vat =
        cell(r, c.vat)
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "") || null;
      const given = cell(r, c.country).toUpperCase();
      return {
        name: cell(r, c.name),
        vat,
        street: cell(r, c.street) || null,
        zip: cell(r, c.zip) || null,
        city: cell(r, c.city) || null,
        country: /^[A-Z]{2}$/.test(given) ? given : (/^[A-Z]{2}/.exec(vat ?? "")?.[0] ?? null),
        email: cell(r, c.email) || null,
        phone: cell(r, c.phone) || null,
        iban: cell(r, c.iban).replace(/\s/g, "").toUpperCase() || null,
      };
    });
  return { items };
}

export type OdooDoc = {
  number: string;
  date: string;
  dueDate: string | null;
  partner: string;
  totalCents: number;
  openCents: number;
  credit: boolean;
};

/** Open invoices (side "sale") or bills ("purchase"): drafts, cancelled and paid ones are left. */
export function readOpenDocs(text: string): { items: OdooDoc[] } | { error: string } {
  const t = csvTable(text);
  if (!t) return { error: "This file does not read as a table." };
  const c = {
    number: t.col(
      /^(number|numéro|nummer|name|invoice number|bill number)$/,
      /number|numéro|nummer/,
    ),
    date: t.col(
      /^(invoice\/bill date|invoice date|bill date|date de facturation|date|factuurdatum|datum)$/,
    ),
    due: t.col(/due date|date d'échéance|échéance|vervaldatum|vervaldag/),
    partner: t.col(
      /^(partner|customer|vendor|partenaire|client|fournisseur|klant|leverancier)$/,
      /partner|partenaire|customer|client|vendor|klant/,
    ),
    total: t.col(/^(total|total signed|total ttc|totaal|tax included|montant total)$/, /^total/),
    open: t.col(
      /amount due|amount residual|montant dû|montant restant|verschuldigd|openstaand|residual/,
    ),
    state: t.col(/^(status|state|statut|état)$/),
    payment: t.col(/payment status|payment state|statut du paiement|betaalstatus/),
    type: t.col(/^(type|move type|invoice type|type de facture)$/),
  };
  if (c.number < 0 || c.partner < 0 || c.total < 0)
    return { error: "Columns missing — the export needs at least Number, Partner and Total." };
  const items: OdooDoc[] = [];
  for (const r of t.rows) {
    const number = cell(r, c.number);
    if (!number) continue;
    if (/draft|cancel|brouillon|annul|concept|geannuleerd/i.test(cell(r, c.state))) continue;
    if (/^(paid|payé|betaald|in_payment|reversed)/i.test(cell(r, c.payment))) continue;
    const total = amount(cell(r, c.total));
    const open = c.open >= 0 ? amount(cell(r, c.open)) : total;
    if (open === 0) continue;
    items.push({
      number,
      date: csvDate(cell(r, c.date)),
      dueDate: csvDate(cell(r, c.due)) || null,
      partner: cell(r, c.partner),
      totalCents: total,
      openCents: Math.min(open, total || open),
      credit:
        /refund|avoir|credit|creditnota|note de crédit/i.test(cell(r, c.type)) ||
        /^(rinv|cn|nc|av)/i.test(number),
    });
  }
  return { items };
}

export type OdooBalance = { account: string; name: string; cents: number };

/** The trial balance on the cut-over day: account and balance (or debit and credit). */
export function readBalances(text: string): { items: OdooBalance[] } | { error: string } {
  const t = csvTable(text);
  if (!t) return { error: "This file does not read as a table." };
  const cA = t.col(/^(account|compte|rekening|code|account code)$/, /account|compte|rekening/);
  const cName = t.col(/^(name|account name|nom|naam|libellé)$/);
  const cBal = t.col(/^(balance|solde|saldo|end balance|ending balance|solde final|eindsaldo)$/);
  const cD = t.col(/^(debit|débit)$/);
  const cC = t.col(/^(credit|crédit)$/);
  if (cA < 0 || (cBal < 0 && (cD < 0 || cC < 0)))
    return {
      error: "Columns missing — the trial balance needs Account and Balance (or Debit and Credit).",
    };
  const items: OdooBalance[] = [];
  for (const r of t.rows) {
    const m = /^\s*(\d{4,8})\b(.*)$/.exec(cell(r, cA));
    if (!m) continue;
    const cents =
      cBal >= 0
        ? (csvCents(cell(r, cBal)) ?? 0)
        : (csvCents(cell(r, cD)) ?? 0) - (csvCents(cell(r, cC)) ?? 0);
    if (!cents) continue;
    items.push({
      account: m[1].padEnd(6, "0").slice(0, 6),
      name: cell(r, cName) || m[2].replace(/^[\s\-–:]+/, "").trim(),
      cents,
    });
  }
  return { items };
}

const SUSPENSE = "499000";
const BROUGHT_FORWARD = "140000";

/**
 * The opening entry from the trial balance: customers and suppliers go to 499000 (the open
 * documents bring their own amounts against it), the year's result to 140000. It must balance.
 */
export function openingLines(items: readonly OdooBalance[]) {
  const by = new Map<string, number>();
  for (const b of items) {
    const account = /^[67]/.test(b.account)
      ? BROUGHT_FORWARD
      : /^(40|44)/.test(b.account)
        ? SUSPENSE
        : b.account;
    by.set(account, (by.get(account) ?? 0) + b.cents);
  }
  const lines = [...by]
    .filter(([, cents]) => cents !== 0)
    .map(([account, cents]) => ({ account, cents }))
    .sort((a, b) => a.account.localeCompare(b.account));
  const off = lines.reduce((s, l) => s + l.cents, 0);
  return {
    lines,
    problem: off ? `The trial balance does not balance (off by ${off} cents).` : null,
  };
}

/** An Odoo number in our own shape (INV/2026/00311): the series to continue past it. */
export function seriesOf(number: string): { key: string; n: number } | null {
  const m = /^(INV|CN|BILL)\/(\d{4})\/(\d+)$/.exec(number.trim());
  return m ? { key: `${m[1]}${m[2]}`, n: Number(m[3]) } : null;
}

/** The opening entry itself, on the cut-over day. */
export function openingEntry(o: {
  id: string;
  onDate: string;
  lines: readonly { account: string; cents: number }[];
}): Entry {
  return entry({
    date: o.onDate,
    journal: "MISC",
    ref: `OPEN-${o.onDate}`,
    label: `Opening balance from Odoo on ${o.onDate}`,
    partner: null,
    source: { kind: "opening", id: o.id },
    lines: o.lines.map((l) => ({ ...l })),
  });
}
