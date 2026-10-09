/**
 * Currencies on a document (legacy cur / fx / BOOKS.fx): an invoice or a bill can be in USD
 * or GBP; the books are in euro. A rate is "euro for one unit" kept as an integer in
 * ten-thousandths (0.9200 → 9200), so no float reaches the database; the document's lines
 * stay in its currency and the stored totals are the euro the books carry.
 */
export const CURRENCIES = ["EUR", "USD", "GBP"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const isCurrency = (s: string): s is Currency =>
  (CURRENCIES as readonly string[]).includes(s);

/** One unit of the currency, as the rate is kept: 10 000 ten-thousandths of a euro. */
export const FX_UNIT = 10_000;

export type FxRates = { USD: number; GBP: number };

/** The legacy defaults (BOOKS.fx): 0.92 € for a dollar, 1.17 € for a pound. */
export const DEFAULT_FX: FxRates = { USD: 9200, GBP: 11_700 };

/** The office's rate for a currency; the euro is one, an unknown rate is one (legacy fxOf). */
export function fxOf(rates: Partial<FxRates>, currency: string): number {
  if (currency === "EUR") return FX_UNIT;
  const bp = rates[currency as keyof FxRates];
  return bp && bp > 0 ? bp : FX_UNIT;
}

/** An amount in the document's currency, in euro cents at the document's rate. */
export const euroCents = (cents: number, fxBp: number) => Math.round((cents * fxBp) / FX_UNIT);

/** The totals in euro: net and VAT each at the rate, the total their sum, so it still adds up. */
export function euroTotals<T extends { netCents: number; vatCents: number }>(t: T, fxBp: number) {
  const netCents = euroCents(t.netCents, fxBp);
  const vatCents = euroCents(t.vatCents, fxBp);
  return { netCents, vatCents, grossCents: netCents + vatCents };
}

/** "0.9200" — the rate as the input shows it. */
export const fxToInput = (bp: number) => (bp / FX_UNIT).toFixed(4);

/** "0.92" or "0,9200" → 9200; nothing for an empty, zero or absurd rate. */
export function parseFx(input: string): number | null {
  const t = input.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,4})?$/.test(t)) return null;
  const bp = Math.round(Number(t) * FX_UNIT);
  return bp > 0 && bp <= 1000 * FX_UNIT ? bp : null;
}

/** "1 USD = €0.9200" — how a document says its rate. */
export const fxLine = (currency: string, bp: number) => `1 ${currency} = €${fxToInput(bp)}`;
