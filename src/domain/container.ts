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
