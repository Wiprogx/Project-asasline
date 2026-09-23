/**
 * A reporting period from the address bar. Anything malformed falls back to the default —
 * the year to date — and a reversed range is put the right way round.
 */
import { monthLength } from "./dates";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export type Period = { from: string; to: string };

export function periodOf(
  input: { from?: string | string[]; to?: string | string[] },
  today: string,
): Period {
  const pick = (v: string | string[] | undefined) =>
    typeof v === "string" && DAY.test(v) ? v : null;
  const from = pick(input.from) ?? `${today.slice(0, 4)}-01-01`;
  const to = pick(input.to) ?? today;
  return from <= to ? { from, to } : { from: to, to: from };
}

/** Quick picks: this month, last month, this quarter, this year, last year. */
export function presets(today: string): { label: string; period: Period }[] {
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  const pad = (n: number) => String(n).padStart(2, "0");
  const end = (yy: number, mm: number) => `${yy}-${pad(mm)}-${pad(monthLength(yy, mm))}`;
  const lm = m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 };
  const q = Math.floor((m - 1) / 3) * 3 + 1;
  return [
    { label: "This month", period: { from: `${y}-${pad(m)}-01`, to: end(y, m) } },
    { label: "Last month", period: { from: `${lm.y}-${pad(lm.m)}-01`, to: end(lm.y, lm.m) } },
    { label: "This quarter", period: { from: `${y}-${pad(q)}-01`, to: end(y, q + 2) } },
    { label: "This year", period: { from: `${y}-01-01`, to: `${y}-12-31` } },
    { label: "Last year", period: { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` } },
  ];
}
