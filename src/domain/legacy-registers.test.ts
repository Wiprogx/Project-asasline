import { describe, expect, it } from "vitest";
import { mapLegacyAsset, mapLegacyPriceList, mapLegacyVessel } from "./legacy-registers";

describe("mapLegacyVessel", () => {
  it("reads a sailing with its ports as UN/LOCODEs", () => {
    expect(
      mapLegacyVessel({
        id: 1,
        name: "MSC ROMA",
        imo: "9289888",
        carrier: "MSC",
        service: "West Africa Express",
        voyage: "FA534A",
        pol: "Antwerp (BEANR)",
        pod: "Douala (CMDLA)",
        etd: "2026-08-28",
        eta: "2026-09-19",
        atd: "",
        status: "sailed",
      }),
    ).toEqual({
      name: "MSC ROMA",
      imo: "9289888",
      carrier: "MSC",
      service: "West Africa Express",
      voyage: "FA534A",
      pol: "BEANR",
      pod: "CMDLA",
      etd: "2026-08-28",
      eta: "2026-09-19",
      atd: null,
      ata: null,
      status: "sailed",
    });
  });

  it("needs a name and a voyage; an unknown status reads as scheduled", () => {
    expect(mapLegacyVessel({ name: "X" })).toBeNull();
    expect(mapLegacyVessel({ name: "X", voyage: "1", status: "weird" })?.status).toBe("scheduled");
  });
});

describe("mapLegacyPriceList", () => {
  const items: Record<string, string> = { "1": "rate-1", "2": "rate-2" };
  it("keeps the agreement and its prices in cents, each item once", () => {
    const r = mapLegacyPriceList(
      {
        contact: "Os Textile",
        name: "2026 agreement",
        validFrom: "2026-01-01",
        validUntil: "2026-12-31",
        active: true,
        lines: [
          { itemId: 1, sell: 4100, buy: 2650 },
          { itemId: 1, sell: 1, buy: 1 },
          { itemId: 2, sell: 4050.5, buy: 2445 },
          { itemId: 99, sell: 1, buy: 1 },
        ],
      },
      (id) => items[id],
    );
    expect(r?.list).toEqual({
      name: "2026 agreement",
      validFrom: "2026-01-01",
      validUntil: "2026-12-31",
      active: true,
    });
    expect(r?.lines).toEqual([
      { itemId: "rate-1", sellCents: 410000, buyCents: 265000 },
      { itemId: "rate-2", sellCents: 405050, buyCents: 244500 },
    ]);
    expect(r?.warnings).toEqual(["catalogue item 99 not found — its agreed price left out"]);
  });
});

describe("mapLegacyAsset", () => {
  it("keeps the cost in cents, the years, the account and a disposal", () => {
    expect(
      mapLegacyAsset({
        name: "Laptop",
        invoiceId: 77,
        date: "2026-03-10",
        cost: 1299.99,
        years: 3,
        acct: "230000",
        st: "disposed",
        disposedAt: "2026-09-30",
        disposeNote: "Stolen",
      }),
    ).toEqual({
      asset: {
        name: "Laptop",
        acquiredOn: "2026-03-10",
        costCents: 129999,
        years: 3,
        account: "230000",
        disposedOn: "2026-09-30",
        disposeNote: "Stolen",
      },
      legacyInvoiceId: "77",
    });
  });

  it("needs the day it was bought", () => {
    expect(mapLegacyAsset({ name: "x" })).toBeNull();
  });
});
