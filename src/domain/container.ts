/** ISO 6346 container numbers: owner (3) + category (U/J/Z) + serial (6) + check digit. */
const LETTER: Record<string, number> = {
  A: 10,
  B: 12,
  C: 13,
  D: 14,
  E: 15,
  F: 16,
  G: 17,
  H: 18,
  I: 19,
  J: 20,
  K: 21,
  L: 23,
  M: 24,
  N: 25,
  O: 26,
  P: 27,
  Q: 28,
  R: 29,
  S: 30,
  T: 31,
  U: 32,
  V: 34,
  W: 35,
  X: 36,
  Y: 37,
  Z: 38,
};

/** The check digit of the first ten characters, or null when they are not valid. */
export function containerCheckDigit(s: string): number | null {
  const v = s.toUpperCase();
  if (!/^[A-Z]{3}[UJZ]\d{6}/.test(v)) return null;
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const c = v[i];
    const n = /\d/.test(c) ? Number(c) : LETTER[c];
    sum += n * 2 ** i;
  }
  return (sum % 11) % 10;
}

export function containerNumberOk(s: string): boolean {
  const v = s.replace(/\s+/g, "").toUpperCase();
  return /^[A-Z]{4}\d{7}$/.test(v) && containerCheckDigit(v) === Number(v[10]);
}

/**
 * Empty weight and maximum gross per ISO type (legacy CONTAINER_TARE / CONTAINER_MAX). Seed
 * values: the line's own figure on the box wins when the clerk types one in.
 */
export const CONTAINER_SPECS: Record<string, { tareKg: number; maxGrossKg: number }> = {
  "20DV": { tareKg: 2250, maxGrossKg: 30480 },
  "40DV": { tareKg: 3750, maxGrossKg: 32500 },
  "40HC": { tareKg: 3900, maxGrossKg: 32500 },
  "45HC": { tareKg: 4800, maxGrossKg: 32500 },
  "20RF": { tareKg: 3000, maxGrossKg: 30480 },
  "40RF": { tareKg: 4800, maxGrossKg: 32500 },
  "20OT": { tareKg: 2400, maxGrossKg: 30480 },
  "40OT": { tareKg: 4100, maxGrossKg: 32500 },
  "40FR": { tareKg: 5000, maxGrossKg: 45000 },
};

export type Vgm =
  | { state: "unknown"; reason: string }
  | { state: "ok" | "over"; grossKg: number; maxGrossKg: number | null; tareFrom: "box" | "type" };

/**
 * Verified gross mass = cargo + tare. Fail closed: no cargo weight, or no tare from either
 * the box or its type, is "unknown" — never a reassuring zero. Over the type's maximum the
 * line refuses the VGM, so the booking shows it red.
 */
export function vgm(box: { type: string; cargoKg: number | null; tareKg: number | null }): Vgm {
  const spec = CONTAINER_SPECS[box.type.toUpperCase()];
  if (box.cargoKg === null) return { state: "unknown", reason: "cargo weight missing" };
  const tare = box.tareKg ?? spec?.tareKg ?? null;
  if (tare === null) return { state: "unknown", reason: "tare unknown for this type" };
  const grossKg = box.cargoKg + tare;
  const maxGrossKg = spec?.maxGrossKg ?? null;
  return {
    state: maxGrossKg !== null && grossKg > maxGrossKg ? "over" : "ok",
    grossKg,
    maxGrossKg,
    tareFrom: box.tareKg !== null ? "box" : "type",
  };
}
