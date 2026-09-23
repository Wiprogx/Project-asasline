import { describe, expect, it } from "vitest";
import {
  intervatXml,
  isVatPeriod,
  type VatDoc,
  vatDeadline,
  vatPeriodOf,
  vatPeriodRange,
  vatPeriodShift,
  vatReturn,
} from "./vat";

const sale = (lines: VatDoc["lines"], credit = false): VatDoc => ({
  side: "sale",
  credit,
  partnerCountry: "BE",
  lines,
});
const bill = (lines: VatDoc["lines"], partnerCountry = "BE"): VatDoc => ({
  side: "purchase",
  credit: false,
  partnerCountry,
  lines,
});
const line = (unitCents: number, vatCode: string, account = "700000") => ({
  qty: 1,
  unitCents,
  vatCode,
  account,
});

describe("VAT periods", () => {
  it("names a day's month or quarter", () => {
    expect(vatPeriodOf("2026-08-14", "monthly")).toBe("2026-08");
    expect(vatPeriodOf("2026-08-14", "quarterly")).toBe("2026-Q3");
  });

  it("gives a quarter's first and last day", () => {
    expect(vatPeriodRange("2026-Q1")).toEqual({ from: "2026-01-01", to: "2026-03-31" });
    expect(vatPeriodRange("2028-02")).toEqual({ from: "2028-02-01", to: "2028-02-29" });
  });

  it("steps across a year end", () => {
    expect(vatPeriodShift("2026-Q4", 1)).toBe("2027-Q1");
    expect(vatPeriodShift("2026-01", -1)).toBe("2025-12");
  });

  it("is due on the 20th (monthly) or the 25th (quarterly) of the next month", () => {
    expect(vatDeadline("2026-08")).toBe("2026-09-20");
    expect(vatDeadline("2026-Q4")).toBe("2027-01-25");
  });

  it("recognises only well-formed periods", () => {
    expect(isVatPeriod("2026-Q3")).toBe(true);
    expect(isVatPeriod("2026-13")).toBe(false);
    expect(isVatPeriod("2026-Q5")).toBe(false);
  });
});

describe("vatReturn", () => {
  it("puts a 21% sale in grid 03 and its VAT in 54", () => {
    const r = vatReturn([sale([line(100_000, "S21")])]);
    expect(r.grids.get("03")).toBe(100_000);
    expect(r.grids.get("54")).toBe(21_000);
    expect(r.grids.get("71")).toBe(21_000);
  });

  it("puts shipping exempt under article 41 in grid 47", () => {
    const r = vatReturn([sale([line(50_000, "EX41")])]);
    expect(r.grids.get("47")).toBe(50_000);
    expect(r.grids.has("54")).toBe(false);
  });

  it("puts a service to an EU business in 44, and its credit note in 48", () => {
    const r = vatReturn([sale([line(10_000, "RC")]), sale([line(2_000, "RC")], true)]);
    expect(r.grids.get("44")).toBe(10_000);
    expect(r.grids.get("48")).toBe(2_000);
  });

  it("puts a credit note's VAT in 64, in the office's favour", () => {
    const r = vatReturn([sale([line(10_000, "S21")], true)]);
    expect(r.grids.get("49")).toBe(10_000);
    expect(r.grids.get("64")).toBe(2_100);
    expect(r.grids.get("72")).toBe(2_100);
  });

  it("deducts a Belgian bill's VAT in 59, the cost in 82 and equipment in 83", () => {
    const r = vatReturn([bill([line(40_000, "S21", "604000"), line(100_000, "S21", "230000")])]);
    expect(r.grids.get("82")).toBe(40_000);
    expect(r.grids.get("83")).toBe(100_000);
    expect(r.grids.get("59")).toBe(29_400);
  });

  it("self-assesses an EU supplier's service: 88, 55 due and 59 deducted", () => {
    const r = vatReturn([bill([line(10_000, "RC", "611000")], "IE")]);
    expect(r.grids.get("88")).toBe(10_000);
    expect(r.grids.get("55")).toBe(2_100);
    expect(r.grids.get("59")).toBe(2_100);
    expect(r.balanceCents).toBe(0);
  });

  it("uses 87 and 56 for a reverse charge from outside the EU", () => {
    const r = vatReturn([bill([line(10_000, "RC", "611000")], "US")]);
    expect(r.grids.get("87")).toBe(10_000);
    expect(r.grids.get("56")).toBe(2_100);
  });
});

describe("intervatXml", () => {
  const office = {
    vat: "BE0772649540",
    name: "A & B",
    street: "Rue 1",
    postCode: "1070",
    city: "Bruxelles",
    email: "a@b.be",
    phone: "+32 2 1",
  };

  it("writes each non-zero grid as a positive amount in euros", () => {
    const xml = intervatXml(
      "2026-Q3",
      new Map([
        ["03", 100_000],
        ["72", 500],
        ["00", 0],
      ]),
      office,
    );
    expect(xml).toContain('<ns2:Amount GridNumber="3">1000.00</ns2:Amount>');
    expect(xml).toContain('<ns2:Amount GridNumber="72">5.00</ns2:Amount>');
    expect(xml).not.toContain('GridNumber="0"');
    expect(xml).toContain("<ns2:Quarter>3</ns2:Quarter><ns2:Year>2026</ns2:Year>");
  });

  it("escapes the office's name and keeps only the VAT number's digits", () => {
    const xml = intervatXml("2026-08", new Map(), office);
    expect(xml).toContain("<Name>A &amp; B</Name>");
    expect(xml).toContain("<VATNumber>0772649540</VATNumber>");
    expect(xml).toContain("<ns2:Month>8</ns2:Month>");
  });
});
