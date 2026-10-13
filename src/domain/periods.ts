import { addDays, addMonths, dayOfWeek, monthLength } from "./dates";

/**
 * The periods a list is counted over (legacy PERIODS, periodRange): this week, month, quarter,
 * year or all time, and the one before for a comparison. Days are "YYYY-MM-DD" strings and
 * today is passed in (invariant 4).
 */
export const PERIOD_KEYS = ["week", "month", "quarter", "year", "all"] as const;
export type PeriodKey = (typeof PERIOD_KEYS)[number];
export const PERIOD_LABEL: Record<PeriodKey, string> = {
  week: "This week",
  month: "This month",
  quarter: "This quarter",
  year: "This year",
  all: "All time",
};
const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");

export function parsePeriodKey(param: unknown): PeriodKey {
  return PERIOD_KEYS.find((k) => k === param) ?? "all";
}

/** The period `back` steps before the current one; null for all time (nothing to compare). */
export function periodScope(
  key: PeriodKey,
  today: string,
  back = 0,
): { from: string; to: string; label: string } | null {
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  if (key === "week") {
    // Monday-first.
    const n = (dayOfWeek(today) + 6) % 7;
    const from = addDays(today, -n - 7 * back);
    return { from, to: addDays(from, 6), label: `Week of ${from.slice(5)}` };
  }
  if (key === "month") {
    const from = addMonths(`${y}-${pad(m)}-01`, -back);
    const fy = Number(from.slice(0, 4));
    const fm = Number(from.slice(5, 7));
    return {
      from,
      to: `${fy}-${pad(fm)}-${pad(monthLength(fy, fm))}`,
      label: `${MONTH[fm - 1]} ${fy}`,
    };
  }
  if (key === "quarter") {
    const q0 = Math.floor((m - 1) / 3) * 3 + 1;
    const from = addMonths(`${y}-${pad(q0)}-01`, -3 * back);
    const fy = Number(from.slice(0, 4));
    const fm = Number(from.slice(5, 7));
    const last = addMonths(from, 2);
    const ly = Number(last.slice(0, 4));
    const lm = Number(last.slice(5, 7));
    return {
      from,
      to: `${ly}-${pad(lm)}-${pad(monthLength(ly, lm))}`,
      label: `Q${Math.floor((fm - 1) / 3) + 1} ${fy}`,
    };
  }
  if (key === "year") {
    const yy = y - back;
    return { from: `${yy}-01-01`, to: `${yy}-12-31`, label: String(yy) };
  }
  return null;
}

/** The change from the period before, in whole percent; null when either side is missing. */
export function deltaPercent(now: number | null, before: number | null): number | null {
  if (now === null || before === null) return null;
  if (before === 0) return now === 0 ? 0 : 100;
  return Math.round(((now - before) / Math.abs(before)) * 100);
}
