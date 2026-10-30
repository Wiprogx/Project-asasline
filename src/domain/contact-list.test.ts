import { describe, expect, it } from "vitest";
import { filterLabel, filterParam, parseContactFilters, whyMatched } from "./contact-list";

describe("the contacts filters", () => {
  it("reads each field from its URL key, in order, and ignores the empty ones", () => {
    expect(
      parseContactFilters({ "f.tag": "VIP", "f.city": "Antwerpen", "f.note": " ", q: "x" }),
    ).toEqual([
      { field: "city", value: "Antwerpen" },
      { field: "tag", value: "VIP" },
    ]);
    expect(filterParam("tag")).toBe("f.tag");
    expect(filterLabel("profession")).toBe("Industry");
  });
});

describe("why a contact is on screen", () => {
  const kids = [
    { name: "Warehouse Zeebrugge", type: "Delivery", hay: "Warehouse Zeebrugge Kaai 1 Zeebrugge" },
    { name: null, type: "Loading", hay: "Oostkamp" },
  ];
  it("names the address that answered, unless the contact's own fields explain it", () => {
    expect(whyMatched(["ACME", "Brussels"], kids, "zeebrugge")).toEqual([
      "Warehouse Zeebrugge (Delivery)",
    ]);
    expect(whyMatched(["ACME", "Oostkamp"], kids, "oostkamp")).toEqual([]);
    expect(whyMatched(["ACME"], kids, "oostkamp")).toEqual(["— (Loading)"]);
    expect(whyMatched(["ACME"], kids, "")).toEqual([]);
  });
});
