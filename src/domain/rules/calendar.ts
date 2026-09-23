import { addDays, dayOfWeek, parseYmd } from "../dates";

/**
 * Working days (legacy isWorkday / shiftWork / pullToWorkday). A public holiday is not a
 * working day: "upload two working days before she sails" once landed on a day the waiver
 * office was shut and the deadline passed with nobody warned. Holidays that count are
 * Belgium's (the office) and the country the paper is filed in.
 */
export type Holiday = { country: string; date: string; name: string };

export type Closed = (day: string) => string | null;

/** Why `day` is closed for these countries ("Saturday", "Christmas"), or null when open. */
export function closedDays(holidays: readonly Holiday[], countries: readonly string[]): Closed {
  const byDay = new Map<string, string>();
  const wanted = new Set(countries.map((c) => c.toUpperCase()));
  for (const h of holidays) if (wanted.has(h.country.toUpperCase())) byDay.set(h.date, h.name);
  return (day) => {
    const w = dayOfWeek(day);
    if (w === 6) return "Saturday";
    if (w === 0) return "Sunday";
    return byDay.get(day) ?? null;
  };
}

/** n working days after (n > 0) or before (n < 0) `day`; "" when `day` is not a day. */
export function shiftWorkdays(day: string, n: number, closed: Closed): string {
  if (!parseYmd(day)) return "";
  const step = n < 0 ? -1 : 1;
  let x = day;
  for (let left = Math.abs(n); left > 0;) {
    x = addDays(x, step);
    if (!closed(x)) left--;
  }
  return x;
}

/**
 * A deadline on a closed day is brought forward to the last open day, and says why.
 * Bounded: a run of more than two weeks of closed days is a data error, not a calendar.
 */
export function pullToWorkday(
  day: string,
  closed: Closed,
): { day: string; movedBecause: string | null } {
  const reason = closed(day);
  if (!reason) return { day, movedBecause: null };
  let x = day;
  for (let guard = 0; closed(x) && guard < 14; guard++) x = addDays(x, -1);
  return { day: x, movedBecause: reason };
}
