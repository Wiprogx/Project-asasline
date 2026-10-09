import { describe, expect, it } from "vitest";
import {
  DEFAULT_FX,
  euroCents,
  euroTotals,
  fxLine,
  fxOf,
  fxToInput,
  FX_UNIT,
  isCurrency,
  parseFx,
} from "./fx";

describe("currencies on a document", () => {
  it("knows the three currencies and the legacy rates", () => {
    expect(isCurrency("USD")).toBe(true);
    expect(isCurrency("CHF")).toBe(false);
    expect(DEFAULT_FX).toEqual({ USD: 9200, GBP: 11_700 });
  });

  it("reads the office's rate: one for the euro, one when nothing is set", () => {
    expect(fxOf(DEFAULT_FX, "EUR")).toBe(FX_UNIT);
    expect(fxOf(DEFAULT_FX, "USD")).toBe(9200);
    expect(fxOf({}, "GBP")).toBe(FX_UNIT);
    expect(fxOf({ USD: 0 }, "USD")).toBe(FX_UNIT);
  });

  it("converts to euro at the rate and keeps net + VAT = total", () => {
    expect(euroCents(100_000, 9200)).toBe(92_000);
    expect(euroCents(100_000, FX_UNIT)).toBe(100_000);
    // 1 000 USD + 21 %: net 920.00 €, VAT 193.20 €, total their sum (not 1 113.20 rounded apart).
    const t = euroTotals({ netCents: 100_000, vatCents: 21_000, grossCents: 121_000 }, 9200);
    expect(t).toEqual({ netCents: 92_000, vatCents: 19_320, grossCents: 111_320 });
    const odd = euroTotals({ netCents: 333, vatCents: 70 }, 9201);
    expect(odd.grossCents).toBe(odd.netCents + odd.vatCents);
  });

  it("reads and shows a rate with four decimals, refusing nonsense", () => {
    expect(parseFx("0.92")).toBe(9200);
    expect(parseFx("0,9200")).toBe(9200);
    expect(parseFx("1.17")).toBe(11_700);
    expect(parseFx("")).toBeNull();
    expect(parseFx("0")).toBeNull();
    expect(parseFx("-1")).toBeNull();
    expect(parseFx("0.12345")).toBeNull();
    expect(parseFx("5000")).toBeNull();
    expect(fxToInput(9200)).toBe("0.9200");
    expect(fxLine("USD", 9200)).toBe("1 USD = €0.9200");
  });
});
