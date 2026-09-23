import { yymm } from "./dates";

/**
 * Document numbers: QT/SB + YYMM + 3 digits, the counter resetting every month.
 * The counter itself is issued by the database in a transaction (src/server/sequences.ts);
 * this module only knows the shape. A ref is never edited once issued (invariant 9).
 */
export const REF_PREFIXES = ["QT", "SB"] as const;
export type RefPrefix = (typeof REF_PREFIXES)[number];

const RE = /^(QT|SB)(\d{2})(\d{2})(\d{3,})$/;

/** The sequence key a counter lives under: one per prefix and month. */
export const sequenceKey = (prefix: RefPrefix, day: string) => `${prefix}${yymm(day)}`;

export function formatRef(prefix: RefPrefix, day: string, n: number): string {
  if (!Number.isInteger(n) || n < 1) throw new Error(`Invalid counter ${n}`);
  return `${sequenceKey(prefix, day)}${String(n).padStart(3, "0")}`;
}

export function parseRef(ref: string) {
  const m = RE.exec(ref);
  if (!m) return null;
  return { prefix: m[1] as RefPrefix, yy: +m[2], mm: +m[3], n: +m[4] };
}
