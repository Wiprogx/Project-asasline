/**
 * The general ledger (legacy allEntries / acctTotals). It is never typed in: every entry is
 * derived from a document that already has a number — an issued invoice, credit note or
 * recorded bill — or from a payment and its reversal. The books therefore cannot drift from the
 * documents. Amounts are integer cents, positive = debit, negative = credit; every entry sums
 * to zero.
 */
import { daysBetween } from "./dates";
import { invoiceTotals, type Line } from "./invoicing";

export const ACCOUNTS = {
  customers: "400000",
  suppliers: "440000",
  vatRecoverable: "411000",
  vatPayable: "451000",
  bank: "550000",
  suspense: "499000",
} as const;

/** Account names (legacy BASE_CHART plus the sales and purchase accounts used here). */
export const CHART: Record<string, string> = {
  "100000": "Capital",
  "140000": "Profit or loss brought forward",
  "230000": "Equipment",
  "230900": "Equipment — depreciation",
  "400000": "Customers",
  "411000": "VAT recoverable",
  "440000": "Suppliers",
  "444000": "Invoices to receive",
  "451000": "VAT payable",
  "455000": "Salaries payable",
  "499000": "Suspense — to sort out",
  "550000": "Bank",
  "570000": "Cash",
  "580000": "Internal transfers",
  "604000": "Shipment costs (bought for resale)",
  "610000": "Rent and charges",
  "611000": "IT and software",
  "612000": "Office supplies",
  "613000": "Accountant and legal fees",
  "614000": "Telephone and internet",
  "617000": "Vehicle costs",
  "619000": "Other services",
  "620000": "Salaries and social charges",
  "630200": "Depreciation",
  "640000": "Other operating taxes",
  "654000": "Exchange losses",
  "657000": "Bank charges",
  "658000": "Payment differences — cost",
  "700000": "Sales — shipping services",
  "754000": "Exchange gains",
  "758000": "Payment differences — income",
};

export const accountName = (a: string) => CHART[a] ?? "";

export type JournalCode = "SAL" | "PUR" | "BNK";
export type EntryLine = { account: string; cents: number; label?: string };
export type Entry = {
  date: string;
  journal: JournalCode;
  ref: string;
  label: string;
  partner: string | null;
  source: { kind: "invoice" | "payment"; id: string };
  lines: EntryLine[];
};

export type LedgerDoc = {
  id: string;
  /** A credit note carries the side of the invoice or bill it credits. */
  side: "sale" | "purchase";
  credit: boolean;
  number: string;
  date: string;
  partner: string;
  lines: readonly (Line & { account: string })[];
};

export type LedgerPayment = {
  id: string;
  direction: "in" | "out";
  date: string;
  amountCents: number;
  diffCents: number;
  diffAccount: string | null;
  partner: string | null;
  reference: string | null;
  invoiceNumber: string | null;
  reversedOn: string | null;
};

/** Reverse charge on a purchase: the office owes the Belgian VAT and deducts it in the same return. */
const REVERSE_CHARGE_RATE = 21;

/** Drops empty lines and fails loudly on an entry that does not balance — never a silent fix. */
function entry(e: Entry): Entry {
  const lines = e.lines.filter((l) => l.cents !== 0);
  const sum = lines.reduce((s, l) => s + l.cents, 0);
  if (sum !== 0) throw new Error(`Entry ${e.ref} does not balance (${sum} cents)`);
  return { ...e, lines };
}

/** An invoice, credit note or bill: the partner's line against revenue or cost, and the VAT. */
export function docEntry(d: LedgerDoc): Entry {
  const sale = d.side === "sale";
  // Seen from the sale: the customer is debited, revenue and VAT credited. A purchase is the
  // mirror image, and a credit note undoes its side.
  const s = (sale ? 1 : -1) * (d.credit ? -1 : 1);
  const totals = invoiceTotals(d.lines);
  const byAccount = new Map<string, number>();
  let reverseCharge = 0;
  for (const l of d.lines) {
    const net = Math.round(l.qty * l.unitCents);
    byAccount.set(l.account, (byAccount.get(l.account) ?? 0) + net);
    if (!sale && l.vatCode === "RC") reverseCharge += net;
  }
  const rc = Math.round((reverseCharge * REVERSE_CHARGE_RATE) / 100);
  return entry({
    date: d.date,
    journal: sale ? "SAL" : "PUR",
    ref: d.number,
    label: `${d.credit ? "Credit note" : sale ? "Invoice" : "Bill"} · ${d.partner}`,
    partner: d.partner,
    source: { kind: "invoice", id: d.id },
    lines: [
      {
        account: sale ? ACCOUNTS.customers : ACCOUNTS.suppliers,
        cents: s * totals.grossCents,
        label: d.partner,
      },
      ...[...byAccount].map(([account, net]) => ({ account, cents: -s * net })),
      {
        account: sale ? ACCOUNTS.vatPayable : ACCOUNTS.vatRecoverable,
        cents: -s * totals.vatCents,
      },
      { account: ACCOUNTS.vatRecoverable, cents: -s * rc, label: "Reverse charge" },
      { account: ACCOUNTS.vatPayable, cents: s * rc, label: "Reverse charge" },
    ],
  });
}

/**
 * A payment: the bank against the partner. What was written off (a shortfall accepted) goes to
 * its difference account, so the partner is settled in full. A reversal is its own entry, on
 * its own date — the original stays in the books.
 */
export function paymentEntries(p: LedgerPayment): Entry[] {
  const s = p.direction === "in" ? 1 : -1;
  const partnerAccount = p.direction === "in" ? ACCOUNTS.customers : ACCOUNTS.suppliers;
  const lines: EntryLine[] = [
    { account: ACCOUNTS.bank, cents: s * p.amountCents, label: p.reference ?? undefined },
    { account: p.diffAccount ?? ACCOUNTS.suspense, cents: s * p.diffCents, label: "Written off" },
    {
      account: partnerAccount,
      cents: -s * (p.amountCents + p.diffCents),
      label: p.invoiceNumber ?? "on account",
    },
  ];
  const who = p.partner ?? p.reference ?? "—";
  const ref = p.invoiceNumber ? `Payment ${p.invoiceNumber}` : "Payment";
  const booked = entry({
    date: p.date,
    journal: "BNK",
    ref,
    label: `${p.direction === "in" ? "Received from" : "Paid to"} ${who}`,
    partner: p.partner,
    source: { kind: "payment", id: p.id },
    lines,
  });
  if (!p.reversedOn) return [booked];
  return [
    booked,
    entry({
      ...booked,
      date: p.reversedOn,
      ref: `${ref} (reversed)`,
      label: `Reversed · ${booked.label}`,
      lines: lines.map((l) => ({ ...l, cents: -l.cents })),
    }),
  ];
}

/** The whole journal, oldest first; the same day keeps documents before payments. */
export function journal(docs: readonly LedgerDoc[], pays: readonly LedgerPayment[]): Entry[] {
  const order: Record<JournalCode, number> = { SAL: 0, PUR: 1, BNK: 2 };
  return [...docs.map(docEntry), ...pays.flatMap(paymentEntries)].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      order[a.journal] - order[b.journal] ||
      a.ref.localeCompare(b.ref),
  );
}

export type AccountTotal = {
  account: string;
  name: string;
  openCents: number;
  debitCents: number;
  creditCents: number;
  closeCents: number;
};

/** Per account: the balance before `from`, the debits and credits inside the period, the close. */
export function trialBalance(entries: readonly Entry[], from: string, to: string): AccountTotal[] {
  const t = new Map<string, AccountTotal>();
  for (const e of entries) {
    if (e.date > to) continue;
    for (const l of e.lines) {
      const a = t.get(l.account) ?? {
        account: l.account,
        name: accountName(l.account),
        openCents: 0,
        debitCents: 0,
        creditCents: 0,
        closeCents: 0,
      };
      if (e.date < from) a.openCents += l.cents;
      else if (l.cents > 0) a.debitCents += l.cents;
      else a.creditCents -= l.cents;
      a.closeCents = a.openCents + a.debitCents - a.creditCents;
      t.set(l.account, a);
    }
  }
  return [...t.values()].sort((a, b) => a.account.localeCompare(b.account));
}

const classOf = (account: string) => Number(account[0]);

/**
 * Profit and loss over a period: revenue (class 7) less costs (class 6), from the movements
 * inside the period only — a P&L never carries last year's balance.
 */
export function profitAndLoss(tb: readonly AccountTotal[]) {
  const move = (a: AccountTotal) => a.debitCents - a.creditCents;
  const revenue = tb
    .filter((a) => classOf(a.account) === 7)
    .map((a) => ({ ...a, cents: -move(a) }));
  const costs = tb.filter((a) => classOf(a.account) === 6).map((a) => ({ ...a, cents: move(a) }));
  const sum = (xs: { cents: number }[]) => xs.reduce((s, x) => s + x.cents, 0);
  return {
    revenue,
    costs,
    revenueCents: sum(revenue),
    costCents: sum(costs),
    resultCents: sum(revenue) - sum(costs),
  };
}

/**
 * The balance sheet at the period's end: classes 1 to 5 at their closing balance, and the
 * result of classes 6 and 7 not yet brought forward, so assets always equal liabilities.
 */
export function balanceSheet(tb: readonly AccountTotal[]) {
  const sheet = tb.filter((a) => classOf(a.account) <= 5 && a.closeCents !== 0);
  const result = -tb.filter((a) => classOf(a.account) >= 6).reduce((s, a) => s + a.closeCents, 0);
  const assets = sheet.filter((a) => a.closeCents > 0);
  const liabilities = sheet
    .filter((a) => a.closeCents < 0)
    .map((a) => ({ ...a, closeCents: -a.closeCents }));
  const sum = (xs: AccountTotal[]) => xs.reduce((s, x) => s + x.closeCents, 0);
  return {
    assets,
    liabilities,
    resultCents: result,
    assetCents: sum(assets),
    liabilityCents: sum(liabilities) + result,
  };
}

/** One account's movements in a period with the running balance, starting from its opening. */
export function accountLedger(
  entries: readonly Entry[],
  account: string,
  from: string,
  to: string,
) {
  let balance = 0;
  const rows: { entry: Entry; line: EntryLine; balanceCents: number }[] = [];
  for (const e of entries) {
    if (e.date > to) continue;
    for (const line of e.lines) {
      if (line.account !== account) continue;
      balance += line.cents;
      if (e.date >= from) rows.push({ entry: e, line, balanceCents: balance });
    }
  }
  const openCents = balance - rows.reduce((s, r) => s + r.line.cents, 0);
  return { openCents, rows, closeCents: balance };
}

export const AGE_BUCKETS = ["Not due", "1–30", "31–60", "61–90", "90+"] as const;
export type AgeBucket = (typeof AGE_BUCKETS)[number];

/** Days past due, in the legacy aged-balance buckets. */
export function ageBucket(dueDate: string | null, today: string): AgeBucket {
  if (!dueDate || dueDate >= today) return "Not due";
  const days = daysBetween(dueDate, today);
  if (days <= 30) return "1–30";
  if (days <= 60) return "31–60";
  if (days <= 90) return "61–90";
  return "90+";
}

/** Open amounts per partner and bucket, largest total first. */
export function agedBalance(
  open: readonly { partner: string; dueDate: string | null; openCents: number }[],
  today: string,
) {
  const by = new Map<
    string,
    { partner: string; buckets: Record<AgeBucket, number>; total: number }
  >();
  for (const o of open) {
    const row = by.get(o.partner) ?? {
      partner: o.partner,
      buckets: Object.fromEntries(AGE_BUCKETS.map((b) => [b, 0])) as Record<AgeBucket, number>,
      total: 0,
    };
    row.buckets[ageBucket(o.dueDate, today)] += o.openCents;
    row.total += o.openCents;
    by.set(o.partner, row);
  }
  return [...by.values()].sort((a, b) => b.total - a.total || a.partner.localeCompare(b.partner));
}
