import { describe, expect, it } from "vitest";
import {
  itemLabel,
  itemProblem,
  latestQuoted,
  listIsLive,
  periodsOverlap,
  priceFor,
  type RateItemFields,
} from "./pricing";

const blank: RateItemFields = {
  category: "other",
  name: null,
  pol: null,
  pod: null,
  containerType: null,
  carrier: null,
  fromPlace: null,
  toPlace: null,
  docCode: null,
  country: null,
  freeDays: null,
};

describe("itemLabel", () => {
  it("reads an ocean leg as its ports, box and carrier", () => {
    expect(
      itemLabel({
        ...blank,
        category: "ocean",
        pol: "BEANR",
        pod: "CMDLA",
        containerType: "40HC",
        carrier: "MSC",
      }),
    ).toBe("BEANR › CMDLA · 40HC · MSC");
  });
  it("reads a country document and free time by what they are", () => {
    expect(itemLabel({ ...blank, category: "docs", docCode: "BESC", country: "CM" })).toBe(
      "BESC — CM",
    );
    expect(itemLabel({ ...blank, category: "freetime", name: "Demurrage", freeDays: 14 })).toBe(
      "Demurrage · 14 free days",
    );
  });
});

describe("itemProblem", () => {
  it("asks each category for what identifies it", () => {
    expect(itemProblem({ ...blank, category: "ocean", pol: "BEANR" })).toMatch(/discharge/);
    expect(itemProblem({ ...blank, category: "docs", docCode: "BESC" })).toMatch(/country/);
    expect(itemProblem({ ...blank, category: "freetime", name: "Storage" })).toMatch(/free days/);
    expect(itemProblem({ ...blank, name: "THC" })).toBeNull();
  });
  it("accepts zero free days", () => {
    expect(itemProblem({ ...blank, category: "freetime", name: "X", freeDays: 0 })).toBeNull();
  });
});

describe("listIsLive", () => {
  const list = { active: true, validFrom: "2027-01-01", validUntil: null };
  it("is not live before it opens (legacy 2.3)", () => {
    expect(listIsLive(list, "2026-09-24")).toBe(false);
    expect(listIsLive(list, "2027-01-01")).toBe(true);
  });
  it("is not live after it ends, or when switched off", () => {
    expect(listIsLive({ ...list, validFrom: null, validUntil: "2026-09-23" }, "2026-09-24")).toBe(
      false,
    );
    expect(listIsLive({ ...list, active: false }, "2027-06-01")).toBe(false);
  });
});

describe("periodsOverlap", () => {
  it("sees a shared day, including on the edge", () => {
    const a = { validFrom: "2026-01-01", validUntil: "2026-06-30" };
    expect(periodsOverlap(a, { validFrom: "2026-06-30", validUntil: null })).toBe(true);
    expect(periodsOverlap(a, { validFrom: "2026-07-01", validUntil: null })).toBe(false);
  });
  it("treats open ends as forever", () => {
    expect(
      periodsOverlap(
        { validFrom: null, validUntil: null },
        { validFrom: "2030-01-01", validUntil: "2030-01-02" },
      ),
    ).toBe(true);
  });
});

describe("latestQuoted", () => {
  it("takes the newest non-zero price", () => {
    expect(
      latestQuoted([
        { sellCents: 400_000, buyCents: 1, ref: "QT2608001", day: "2026-08-01" },
        { sellCents: 0, buyCents: 1, ref: "QT2609009", day: "2026-09-20" },
        { sellCents: 410_000, buyCents: 1, ref: "QT2609001", day: "2026-09-01" },
      ])?.ref,
    ).toBe("QT2609001");
    expect(latestQuoted([])).toBeNull();
  });
});

describe("priceFor", () => {
  const item = { sellCents: 425_000, buyCents: 265_000 };
  const last = { sellCents: 410_000, buyCents: 260_000, ref: "QT2609001", day: "2026-09-01" };
  it("uses the agreement first", () => {
    expect(
      priceFor({
        item,
        agreed: { sellCents: 400_000, buyCents: 265_000, listName: "2026 agreement" },
        usesLastPrice: true,
        last,
      }),
    ).toEqual({
      sellCents: 400_000,
      buyCents: 265_000,
      source: "agreement",
      from: "2026 agreement",
    });
  });
  it("uses the last price only when the contact says so, with the catalogue's cost", () => {
    expect(priceFor({ item, agreed: null, usesLastPrice: true, last })).toEqual({
      sellCents: 410_000,
      buyCents: 265_000,
      source: "last",
      from: "QT2609001",
    });
    expect(priceFor({ item, agreed: null, usesLastPrice: false, last }).source).toBe("catalogue");
  });
  it("falls back to the catalogue when there is no last price", () => {
    expect(priceFor({ item, agreed: null, usesLastPrice: true, last: null })).toEqual({
      ...item,
      source: "catalogue",
      from: null,
    });
  });
});
