/**
 * Calendar days as "YYYY-MM-DD" strings, computed from the digits alone.
 *
 * Ported from the legacy engine (BUILD_PLAN 1b): parsing a date string with the platform
 * clock reads it as midnight UTC and answers in the machine's zone, so the same file gave
 * different working days in Brussels and in Auckland. Nothing here reads a clock or a zone;
 * "today" is always passed in by the caller (see src/server/clock.ts).
 */
export type Ymd = { y: number; m: number; d: number };

const RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Days since 1970-01-01 for a proleptic Gregorian date (H. Hinnant's algorithm). */
function daysFromCivil(y: number, m: number, d: number): number {
  const yy = m <= 2 ? y - 1 : y;
  const era = Math.floor(yy / 400);
  const yoe = yy - era * 400;
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

function civilFromDays(n: number): Ymd {
  const z = n + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365,
  );
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp + (mp < 10 ? 3 : -9);
  return { y: yoe + era * 400 + (m <= 2 ? 1 : 0), m, d };
}

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

/** Parses a strict, existing calendar day; "2026-02-30" is null, not March 2nd. */
export function parseYmd(s: string | null | undefined): Ymd | null {
  const m = RE.exec(String(s ?? ""));
  if (!m) return null;
  const p = { y: +m[1], m: +m[2], d: +m[3] };
  const back = civilFromDays(daysFromCivil(p.y, p.m, p.d));
  return back.y === p.y && back.m === p.m && back.d === p.d ? p : null;
}

export const formatYmd = ({ y, m, d }: Ymd) => `${pad(y, 4)}-${pad(m)}-${pad(d)}`;

/** A day as a number so two days can be compared or subtracted; NaN when not a day. */
export function dayNumber(s: string | null | undefined): number {
  const p = parseYmd(s);
  return p ? daysFromCivil(p.y, p.m, p.d) : NaN;
}

export const fromDayNumber = (n: number) => formatYmd(civilFromDays(n));

/** "" when the input is not a day — fail closed, never a guessed date. */
export function addDays(s: string, n: number): string {
  const t = dayNumber(s);
  return Number.isNaN(t) ? "" : fromDayNumber(t + n);
}

export const daysBetween = (a: string, b: string) => dayNumber(b) - dayNumber(a);

/** 0 = Sunday … 6 = Saturday, the same answer in every zone; -1 when not a day. */
export function dayOfWeek(s: string): number {
  const t = dayNumber(s);
  return Number.isNaN(t) ? -1 : ((t % 7) + 7 + 4) % 7;
}

export const isWeekend = (s: string) => [0, 6].includes(dayOfWeek(s));

/** m is 1-based. */
export function monthLength(y: number, m: number): number {
  const next = m === 12 ? daysFromCivil(y + 1, 1, 1) : daysFromCivil(y, m + 1, 1);
  return next - daysFromCivil(y, m, 1);
}

/** Adds months, clamping to the month's last day: 2026-01-31 + 1 → 2026-02-28. */
/** The first and last day of the month a day falls in, shifted by `back` months. */
export function monthRange(day: string, back = 0): { from: string; to: string; label: string } {
  const first = addMonths(`${day.slice(0, 7)}-01`, -back);
  const p = parseYmd(first)!;
  const to = formatYmd({ ...p, d: monthLength(p.y, p.m) });
  return { from: first, to, label: `${MONTHS[p.m - 1]} ${p.y}` };
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function addMonths(s: string, n: number): string {
  const p = parseYmd(s);
  if (!p) return "";
  const total = p.y * 12 + (p.m - 1) + n;
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  return formatYmd({ y, m, d: Math.min(p.d, monthLength(y, m)) });
}

/** "2609" for any day in September 2026 — the month key of QT/SB numbering. */
export function yymm(s: string): string {
  const p = parseYmd(s);
  if (!p) throw new Error(`Not a calendar day: ${s}`);
  return pad(p.y % 100) + pad(p.m);
}
