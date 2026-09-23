/**
 * Fixed assets (legacy assetSchedule / assetEntries / assetBook). Equipment bought on a bill
 * line of class 2 is an asset, not a cost: it is depreciated straight line, month by month
 * from the month it was bought, booked at each month's end (630200 / 230900) once the month
 * is over. The last month takes the cents left, so the total is exactly the cost.
 */
import { addDays, addMonths } from "./dates";
import { type Entry, entry } from "./ledger";

export type Asset = {
  id: string;
  name: string;
  acquiredOn: string;
  costCents: number;
  years: number;
  account: string;
  disposedOn: string | null;
  disposeNote: string | null;
};

const DEPRECIATION = "630200";
const ACCUMULATED = "230900";
const DISPOSAL_LOSS = "663000";

/** IT wears out in three years, other equipment in five (to confirm with the accountant). */
export const defaultYears = (description: string) =>
  /\b(IT|computer|laptop|software|server|screen|printer)\b/i.test(description) ? 3 : 5;

const monthEnd = (ym: string) => addDays(addMonths(`${ym}-01`, 1), -1);

/** The last day of the last finished month: depreciation is booked only for months that ended. */
export const lastMonthEnd = (today: string) => addDays(`${today.slice(0, 8)}01`, -1);

export function assetSchedule(a: Asset, upTo: string) {
  const n = Math.max(1, Math.round(a.years * 12));
  const monthly = Math.round(a.costCents / n);
  const stop = a.disposedOn?.slice(0, 7) ?? null;
  const out: { ym: string; date: string; cents: number }[] = [];
  let done = 0;
  for (let k = 0; k < n; k++) {
    const ym = addMonths(`${a.acquiredOn.slice(0, 7)}-01`, k).slice(0, 7);
    const date = monthEnd(ym);
    // The month it goes is not depreciated: the disposal takes what is left, on its own day.
    if (date > upTo || (stop && ym >= stop)) break;
    const cents = k === n - 1 ? a.costCents - done : monthly;
    done += cents;
    out.push({ ym, date, cents });
  }
  return out;
}

/** Depreciated so far and the book value. */
export function assetBook(a: Asset, upTo: string) {
  const depreciated = assetSchedule(a, upTo).reduce((s, x) => s + x.cents, 0);
  return {
    depreciatedCents: depreciated,
    bookValueCents: a.disposedOn ? 0 : a.costCents - depreciated,
  };
}

/**
 * The months' depreciation entries and, when disposed of, the entry taking it off the books on
 * the day it went (never a future day — the action refuses one).
 */
export function assetEntries(a: Asset, upTo: string): Entry[] {
  const months = assetSchedule(a, upTo);
  const out = months.map((m) =>
    entry({
      date: m.date,
      journal: "MISC",
      ref: `DEP-${m.ym}`,
      label: `Depreciation · ${a.name}`,
      partner: null,
      source: { kind: "asset", id: a.id },
      lines: [
        { account: DEPRECIATION, cents: m.cents },
        { account: ACCUMULATED, cents: -m.cents },
      ],
    }),
  );
  if (a.disposedOn) {
    const acc = assetSchedule(a, a.disposedOn).reduce((s, m) => s + m.cents, 0);
    out.push(
      entry({
        date: a.disposedOn,
        journal: "MISC",
        ref: "DISPOSAL",
        label: `Disposed · ${a.name}${a.disposeNote ? ` — ${a.disposeNote}` : ""}`,
        partner: null,
        source: { kind: "asset", id: a.id },
        lines: [
          { account: ACCUMULATED, cents: acc },
          { account: DISPOSAL_LOSS, cents: a.costCents - acc },
          { account: a.account, cents: -a.costCents },
        ],
      }),
    );
  }
  return out;
}

/** Changing the years rewrites past months: refused once one of them is in a closed period. */
export function yearsProblem(a: Asset, upTo: string, closedThrough: string | null): string | null {
  if (!closedThrough) return null;
  const locked = assetSchedule(a, upTo).filter((m) => m.date <= closedThrough).length;
  return locked
    ? `${locked} month${locked === 1 ? " is" : "s are"} in a closed period — the years can no longer change.`
    : null;
}
