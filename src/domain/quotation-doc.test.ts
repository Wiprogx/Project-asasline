import { describe, expect, it } from "vitest";
import { destinationsPhrase, letterLines, quotationDoc } from "./quotation-doc";

const douala = {
  pol: "BEANR",
  pod: "CMDLA",
  finalPlace: null,
  containerType: "40HC",
  declined: false,
  lines: [
    { description: "Ocean freight", qty: 2, sellCents: 425_000, listed: true },
    { description: "BESC", qty: 1, sellCents: 25_000, listed: false },
  ],
};
const mersin = {
  pol: "BEANR",
  pod: "TRMER",
  finalPlace: "Adana",
  containerType: null,
  declined: false,
  lines: [{ description: "Ocean freight", qty: 1, sellCents: 190_000, listed: true }],
};

describe("quotationDoc", () => {
  it("lists every line with its amount when itemized", () => {
    const doc = quotationDoc([douala], "itemized");
    expect(doc.routes[0].lines).toEqual([
      { text: "2 × Ocean freight", amountCents: 850_000 },
      { text: "BESC", amountCents: 25_000 },
    ]);
    expect(doc.totalCents).toBe(875_000);
  });

  it("names only the listed services, without amounts, when all-inclusive", () => {
    const doc = quotationDoc([douala], "inclusive");
    expect(doc.routes[0].lines).toEqual([{ text: "2 × Ocean freight", amountCents: null }]);
    expect(doc.routes[0].totalCents).toBe(875_000);
  });

  it("leaves declined destinations out of the lines and the total", () => {
    const doc = quotationDoc([douala, { ...mersin, declined: true }], "itemized");
    expect(doc.routes).toHaveLength(1);
    expect(doc.totalCents).toBe(875_000);
  });

  it("titles a destination by its ports, box and final place", () => {
    expect(quotationDoc([mersin], "itemized").routes[0].title).toBe("BEANR › TRMER · to Adana");
  });
});

describe("destinationsPhrase", () => {
  it("names the first destination and counts the rest", () => {
    expect(destinationsPhrase(quotationDoc([douala, mersin], "itemized"))).toBe(
      "BEANR › CMDLA · 40HC and 1 more",
    );
    expect(destinationsPhrase(quotationDoc([], "itemized"))).toBe("—");
  });
});

describe("letterLines", () => {
  it("writes each destination with its price, then its lines", () => {
    const text = letterLines(quotationDoc([mersin], "itemized"), (c) => `€${c / 100}`);
    expect(text).toBe("BEANR › TRMER · to Adana: €1900\n  · Ocean freight €1900");
  });
});
