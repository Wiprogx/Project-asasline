/**
 * A legacy entry written by hand (legacy newEntry: ref, date, label, lines {acct, d, c}, st,
 * cancelledAt, opening) as a journal entry. Only these are carried: the entries the legacy app
 * derived from documents and payments are derived again here. A cancelled entry comes with
 * its reversal, dated the day it was cancelled.
 */
import { entryProblem } from "./journal-entries";
import type { EntryLine } from "./ledger";

const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const day = (v: unknown) => {
  const s = typeof v === "string" ? v.slice(0, 10) : "";
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};
const cents = (v: unknown) => (Number.isFinite(Number(v)) ? Math.round(Number(v) * 100) : 0);

export function mapLegacyEntry(e: Record<string, unknown>) {
  const date = day(e.date);
  const ref = text(e.ref);
  if (!date || !ref) return { skip: "no day or reference" };
  const lines: EntryLine[] = (Array.isArray(e.lines) ? (e.lines as Record<string, unknown>[]) : [])
    .map((l) => ({
      account: String(l?.acct ?? "")
        .replace(/\D/g, "")
        .slice(0, 6),
      cents: cents(l?.d) - cents(l?.c),
    }))
    .filter((l) => l.account.length === 6 && l.cents !== 0);
  const problem = entryProblem(lines);
  if (problem) return { skip: problem };
  const cancelled = e.st === "cancelled";
  return {
    entry: { ref, date, label: text(e.label) ?? ref, lines },
    opening: e.opening === true,
    reversedOn: cancelled ? (day(e.cancelledAt) ?? date) : null,
  };
}
