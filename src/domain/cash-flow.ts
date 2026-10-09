import type { Entry } from "./ledger";

/**
 * What went through the bank, as booked (legacy cash flow): each entry touching a bank or
 * cash account, by month, named by the account on the other side — customers, suppliers,
 * VAT, salaries, bank charges — with the cash at the start and the end of each month. Payments
 * registered, not yet what a statement shows unreconciled. Integer cents (invariant 3).
 */
export const CASH_KINDS = [
  "Opening",
  "From customers",
  "To suppliers",
  "VAT",
  "Salaries",
  "Bank charges and finance",
  "Other",
] as const;
export type CashKind = (typeof CASH_KINDS)[number];

/** Which side of an entry names the move: the largest line that is not the bank's. */
export function cashKindOf(e: Entry, bankAccounts: ReadonlySet<string>): CashKind {
  if (e.source.kind === "opening") return "Opening";
  const other = e.lines
    .filter((l) => !bankAccounts.has(l.account))
    .sort((a, b) => Math.abs(b.cents) - Math.abs(a.cents))[0];
  if (!other) return "Other";
  const a = other.account;
  if (a.startsWith("400")) return "From customers";
  if (a.startsWith("440")) return "To suppliers";
  if (/^(451|411)/.test(a)) return "VAT";
  if (/^(62|455)/.test(a)) return "Salaries";
  if (/^65/.test(a)) return "Bank charges and finance";
  return "Other";
}

export type CashFlow = {
  months: string[];
  /** The kinds with something in the period, in the legacy order. */
  kinds: CashKind[];
  /** cents[kind][month] */
  cells: Record<string, Record<string, number>>;
  startCents: Record<string, number>;
  netCents: Record<string, number>;
  endCents: Record<string, number>;
};

export function cashFlow(
  entries: readonly Entry[],
  bankAccounts: readonly string[],
  from: string,
  to: string,
): CashFlow {
  const bank = new Set(bankAccounts);
  const cells: Record<string, Record<string, number>> = {};
  let before = 0;
  for (const e of entries) {
    const onBank = e.lines.filter((l) => bank.has(l.account));
    if (onBank.length === 0) continue;
    const move = onBank.reduce((s, l) => s + l.cents, 0);
    if (e.date < from) {
      before += move;
      continue;
    }
    if (e.date > to) continue;
    const month = e.date.slice(0, 7);
    const kind = cashKindOf(e, bank);
    cells[kind] ??= {};
    cells[kind][month] = (cells[kind][month] ?? 0) + move;
  }
  const months = [...new Set(Object.values(cells).flatMap((m) => Object.keys(m)))].sort();
  const kinds = CASH_KINDS.filter((k) => cells[k]);
  const startCents: Record<string, number> = {};
  const netCents: Record<string, number> = {};
  const endCents: Record<string, number> = {};
  let run = before;
  for (const m of months) {
    startCents[m] = run;
    netCents[m] = kinds.reduce((s, k) => s + (cells[k][m] ?? 0), 0);
    run += netCents[m];
    endCents[m] = run;
  }
  return { months, kinds, cells, startCents, netCents, endCents };
}
