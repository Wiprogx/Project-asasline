/**
 * What the ledger says when read as a report (legacy acctTotals, P&L, balance sheet, aged debts):
 * pure arithmetic over the entries of domain/ledger, for a period or a day.
 */
import { daysBetween } from "./dates";
import { accountName, type Entry, type EntryLine } from "./ledger";

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
