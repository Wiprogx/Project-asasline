import { describe, expect, it } from "vitest";
import { boxType, configValueOf, listOf, portCode } from "./legacy-config";
import { mapRateItem, vatCodeOf } from "./legacy-rates";

describe("the legacy settings", () => {
  it("reads a config record's value, saved whole or bare", () => {
    expect(configValueOf({ value: ["a"] })).toEqual(["a"]);
    expect(configValueOf(["a"])).toEqual(["a"]);
  });

  it("cleans a word list, and writes container types the new way", () => {
    expect(listOf([" Goods not ready ", "Goods not ready", ""])).toEqual(["Goods not ready"]);
    expect(listOf(["40F HC", "20F DV"], "CONTAINER_TYPES")).toEqual(["40HC", "20DV"]);
    expect(listOf([{ id: 1 }])).toBeNull();
    expect(listOf([])).toBeNull();
  });

  it("takes the UN/LOCODE out of a port name", () => {
    expect(portCode("Antwerp (BEANR)")).toBe("BEANR");
    expect(portCode("trmer")).toBe("TRMER");
    expect(portCode("")).toBeNull();
    expect(boxType("45HC")).toBe("45HC");
  });
});

describe("mapRateItem", () => {
  it("carries an ocean leg: codes, box type, cents, VAT code, validity", () => {
    expect(
      mapRateItem({
        id: 1,
        cat: "ocean",
        pol: "Antwerp (BEANR)",
        pod: "Douala (CMDLA)",
        country: "CM",
        ctype: "40F HC",
        carrier: "MSC",
        transit: 22,
        sell: 4250,
        buy: 2650.5,
        rateType: "contract",
        validUntil: "2026-12-31",
        vat: "0% Art.146",
        notes: "Weekly service",
      })?.row,
    ).toMatchObject({
      category: "ocean",
      pol: "BEANR",
      pod: "CMDLA",
      containerType: "40HC",
      transitDays: 22,
      sellCents: 425000,
      buyCents: 265050,
      vatCode: "EX41",
      validUntil: "2026-12-31",
      note: "Weekly service",
    });
  });

  it("keeps a free-time kind the new catalogue lacks as a note, and says so", () => {
    const r = mapRateItem({ cat: "freetime", ftype: "storage", side: "origin", freeDays: 5 });
    expect(r?.row).toMatchObject({
      name: "Storage — origin",
      freeKind: null,
      side: "origin",
      freeDays: 5,
    });
    expect(r?.row.note).toBe("Legacy free time: storage");
    expect(r?.warnings).toHaveLength(1);
  });

  it("needs a category", () => {
    expect(mapRateItem({ name: "x" })).toBeNull();
  });

  it("reads the VAT labels", () => {
    expect(vatCodeOf("21%")).toBe("S21");
    expect(vatCodeOf("6%")).toBe("S6");
    expect(vatCodeOf(undefined)).toBe("EX41");
  });
});
