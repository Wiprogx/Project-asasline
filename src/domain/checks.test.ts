import { describe, expect, it } from "vitest";
import { containerCheckDigit, containerNumberOk } from "./container";
import { ibanOk, ibanPretty } from "./iban";
import { formatCents, toCents } from "./money";
import { ogmMake, ogmOk } from "./ogm";
import { formatRef, parseRef, sequenceKey } from "./refs";

describe("refs", () => {
  it("formats QT/SB + YYMM + counter", () => {
    expect(formatRef("SB", "2026-09-23", 1)).toBe("SB2609001");
    expect(formatRef("QT", "2026-10-01", 42)).toBe("QT2610042");
    expect(formatRef("SB", "2026-09-23", 1234)).toBe("SB26091234");
    expect(sequenceKey("SB", "2026-09-30")).toBe("SB2609");
    expect(() => formatRef("SB", "2026-09-23", 0)).toThrow();
  });
  it("parses what it formats and rejects the rest", () => {
    expect(parseRef("SB2609001")).toEqual({ prefix: "SB", yy: 26, mm: 9, n: 1 });
    expect(parseRef("XX2609001")).toBeNull();
    expect(parseRef("SB26091")).toBeNull();
  });
});

describe("ogm", () => {
  it("makes structured communications that pass their own check", () => {
    for (const n of ["INV/2026/00017", "1", "999999999", 123456])
      expect(ogmOk(ogmMake(n))).toBe(true);
    expect(ogmMake(1)).toMatch(/^\+\+\+\d{3}\/\d{4}\/\d{5}\+\+\+$/);
  });
  it("uses 97 when the remainder is zero", () => {
    // 1000000063 % 97 === 0 → check digits "97", never "00"
    expect(ogmMake("000000063").replace(/\D/g, "").slice(-2)).toBe("97");
  });
  it("rejects a mistyped digit", () => {
    const ok = ogmMake(17);
    const bad = ok.replace(
      /(\d)(\d{2}\+\+\+)$/,
      (_, d: string, rest: string) => `${(+d + 1) % 10}${rest}`,
    );
    expect(ogmOk(bad)).toBe(false);
  });
});

describe("iban", () => {
  it("accepts the company account and rejects a typo", () => {
    expect(ibanOk("BE41 0689 4162 5810")).toBe(true);
    expect(ibanOk("BE41 0689 4162 5811")).toBe(false);
    expect(ibanOk("GB82 WEST 1234 5698 7654 32")).toBe(true);
    expect(ibanOk("")).toBe(false);
  });
  it("pretty-prints in groups of four", () => {
    expect(ibanPretty("BE41068941625810")).toBe("BE41 0689 4162 5810");
  });
});

describe("container (ISO 6346)", () => {
  it("computes the check digit", () => {
    expect(containerCheckDigit("CSQU305438")).toBe(3);
    expect(containerCheckDigit("12345")).toBeNull();
  });
  it("validates full numbers", () => {
    expect(containerNumberOk("CSQU3054383")).toBe(true);
    expect(containerNumberOk("csqu 305438 3")).toBe(true);
    expect(containerNumberOk("CSQU3054384")).toBe(false);
  });
});

describe("money", () => {
  it("distinguishes no figure from a broken figure", () => {
    expect(formatCents(null)).toBe("—");
    expect(formatCents(Number.NaN)).toBe("⚠");
    expect(formatCents(123456)).toContain("1,234.56");
  });
  it("parses user input into cents", () => {
    expect(toCents("12,5")).toBe(1250);
    expect(toCents("1 200.99")).toBe(120099);
    expect(toCents("abc")).toBeNull();
    expect(toCents("1.234")).toBeNull();
  });
});
