import { describe, expect, it } from "vitest";
import {
  destinationsPhrase,
  letterLines,
  quotationDoc,
  routeFacts,
  routeTotals,
} from "./quotation-doc";

const charge = { perBox: true, condition: false };

const douala = {
  pol: "BEANR",
  pod: "CMDLA",
  finalPlace: null,
  containerType: "40HC",
  boxes: 1,
  declined: false,
  lines: [
    { description: "Ocean freight", qty: 2, sellCents: 425_000, listed: true, ...charge },
    { description: "BESC", qty: 1, sellCents: 25_000, listed: false, ...charge },
  ],
};
const mersin = {
  pol: "BEANR",
  pod: "TRMER",
  finalPlace: "Adana",
  containerType: null,
  boxes: 1,
  declined: false,
  lines: [{ description: "Ocean freight", qty: 1, sellCents: 190_000, listed: true, ...charge }],
};

describe("a destination quoted per container (legacy routeSell)", () => {
  const twoBoxes = {
    ...mersin,
    boxes: 2,
    lines: [
      {
        description: "Ocean freight",
        qty: 1,
        sellCents: 190_000,
        costCents: 150_000,
        listed: true,
        ...charge,
      },
      {
        description: "Extra stop",
        qty: 1,
        sellCents: 10_000,
        costCents: 8_000,
        listed: true,
        perBox: false,
        condition: false,
      },
      {
        description: "Demurrage at destination · 14 free days",
        qty: 1,
        sellCents: 6_500,
        costCents: 4_500,
        listed: true,
        perBox: true,
        condition: true,
      },
    ],
  };
  it("multiplies a per-container line by the boxes, counts a box-bound line once, and never totals a term", () => {
    expect(routeTotals(twoBoxes)).toEqual({ sell: 390_000, cost: 308_000 });
    const doc = quotationDoc([twoBoxes], "itemized");
    expect(doc.routes[0].title).toBe("BEANR › TRMER × 2 · to Adana");
    expect(doc.routes[0].lines).toEqual([
      { text: "Ocean freight · per container", amountCents: 380_000, term: false },
      { text: "Extra stop", amountCents: 10_000, term: false },
      { text: "Demurrage at destination · 14 free days — terms", amountCents: null, term: true },
    ]);
    expect(doc.totalCents).toBe(390_000);
  });
});

describe("quotationDoc", () => {
  it("lists every line with its amount when itemized", () => {
    const doc = quotationDoc([douala], "itemized");
    expect(doc.routes[0].lines).toEqual([
      { text: "2 × Ocean freight", amountCents: 850_000, term: false },
      { text: "BESC", amountCents: 25_000, term: false },
    ]);
    expect(doc.totalCents).toBe(875_000);
  });

  it("names only the listed services, without amounts, when all-inclusive", () => {
    const doc = quotationDoc([douala], "inclusive");
    expect(doc.routes[0].lines).toEqual([
      { text: "2 × Ocean freight", amountCents: null, term: false },
    ]);
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

describe("a destination spelled out for the paper", () => {
  const spelled = {
    ...douala,
    polWords: "Antwerp (BE) (BEANR)",
    podWords: "Douala (CM) (CMDLA)",
    service: "door_port" as const,
    carrier: "MSC",
    transitDays: 22,
  };
  it("titles it by its ports in words, and by their codes for a subject", () => {
    const [r] = quotationDoc([spelled], "itemized").routes;
    expect(r.title).toBe("Antwerp (BE) (BEANR) › Douala (CM) (CMDLA) · 40HC");
    expect(r.short).toBe("BEANR › CMDLA · 40HC");
    expect(destinationsPhrase(quotationDoc([spelled], "itemized"))).toBe("BEANR › CMDLA · 40HC");
  });
  it("says at the top what the service moves", () => {
    expect(quotationDoc([spelled], "itemized").routes[0].freight).toBe(
      "Inland transport + ocean freight",
    );
    expect(quotationDoc([{ ...spelled, service: "port_port" }], "itemized").routes[0].freight).toBe(
      "Ocean freight",
    );
    expect(quotationDoc([douala], "itemized").routes[0].freight).toBeNull();
  });
  it("says the line and the transit only when known and asked for", () => {
    expect(routeFacts(spelled, { carrier: true, transit: true })).toEqual([
      "MSC",
      "22 days transit",
    ]);
    expect(routeFacts(spelled, { transit: true })).toEqual(["22 days transit"]);
    expect(routeFacts({ ...spelled, transitDays: null }, { transit: true })).toEqual([]);
    expect(routeFacts({}, { carrier: true, transit: true })).toEqual([]);
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
