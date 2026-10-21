/**
 * Entries written by hand in the miscellaneous journal (legacy newEntry): an adjustment, a
 * correction, a transfer between accounts. They must balance — debits (+) equal credits (−) —
 * and are never edited: a wrong entry is reversed by a second one, both staying on the record
 * (legacy cancelEntry).
 */
import type { Entry, EntryLine } from "./ledger";
import { toCents } from "./money";

/**
 * The lines as typed, one per row: `account | debit | credit | label`. Debit and credit are
 * amounts like 120 or 120.00; one of the two is filled. Null with the problem when a row is wrong.
 */
export function parseEntryLines(text: string): { lines: EntryLine[]; problem: string | null } {
  const lines: EntryLine[] = [];
  const rows = text
    .split(/\r?\n/)
    .map((r) => r.trim())
    .filter(Boolean);
  for (const [i, row] of rows.entries()) {
    const [account = "", debit = "", credit = "", ...label] = row.split("|").map((c) => c.trim());
    if (!/^\d{6}$/.test(account))
      return { lines: [], problem: `Row ${i + 1}: an account of six digits first.` };
    const d = debit ? toCents(debit) : 0;
    const c = credit ? toCents(credit) : 0;
    if (d === null || c === null || d < 0 || c < 0)
      return { lines: [], problem: `Row ${i + 1}: amounts like 120 or 120.00.` };
    if (d > 0 === c > 0)
      return { lines: [], problem: `Row ${i + 1}: a debit or a credit, not both or neither.` };
    lines.push({ account, cents: d - c, ...(label.join("|") ? { label: label.join("|") } : {}) });
  }
  return { lines, problem: entryProblem(lines) };
}

/** Why the lines cannot be booked, or null: two lines at least, and they balance. */
export function entryProblem(lines: readonly EntryLine[]): string | null {
  if (lines.length < 2) return "An entry needs two lines at least.";
  const off = lines.reduce((s, l) => s + l.cents, 0);
  if (off !== 0)
    return `The entry does not balance: debits and credits differ by ${(Math.abs(off) / 100).toFixed(2)}.`;
  return null;
}

/** The lines that undo an entry: every amount on the other side. */
export const reversalOf = (lines: readonly EntryLine[]): EntryLine[] =>
  lines.map((l) => ({ ...l, cents: -l.cents }));

/** A hand-written entry as the journal reads it. */
export function manualEntry(e: {
  id: string;
  date: string;
  ref: string;
  label: string;
  lines: readonly EntryLine[];
}): Entry {
  return {
    date: e.date,
    journal: "MISC",
    ref: e.ref,
    label: e.label,
    partner: null,
    source: { kind: "manual", id: e.id },
    lines: [...e.lines],
  };
}

/** OD/2026/00001: the miscellaneous journal's own yearly series. */
export const entrySequenceKey = (day: string) => `OD${day.slice(0, 4)}`;
export function formatEntryRef(day: string, n: number): string {
  if (!Number.isInteger(n) || n < 1) throw new Error(`Invalid entry counter ${n}`);
  return `OD/${day.slice(0, 4)}/${String(n).padStart(5, "0")}`;
}
