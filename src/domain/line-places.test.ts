import { describe, expect, it } from "vitest";
import { defaultPlace, placeLabel, placesForLine } from "./line-places";

const places = [
  { value: "kallo", label: "Kallo depot", under: ["msc"] },
  { value: "mpet", label: "MPET", under: ["cma", "msc"] },
  { value: "gateway", label: "Antwerp Gateway", under: ["cma"] },
  { value: "orphan", label: "Zeebrugge depot", under: [] },
];

describe("placesForLine", () => {
  it("lists the line's own places first, as linked, then the others by name", () => {
    expect(placesForLine(places, "msc").map((p) => p.value)).toEqual([
      "kallo",
      "mpet",
      "gateway",
      "orphan",
    ]);
  });
  it("offers every other location after the places with the role, each once", () => {
    const others = [
      { value: "mpet", label: "MPET", under: [] },
      { value: "yard", label: "A yard", under: [] },
    ];
    expect(placesForLine(places, "msc", others).map((p) => p.value)).toEqual([
      "kallo",
      "mpet",
      "gateway",
      "orphan",
      "yard",
    ]);
  });
  it("offers every place by name when no line is chosen", () => {
    expect(placesForLine(places, null).map((p) => p.value)).toEqual([
      "gateway",
      "kallo",
      "mpet",
      "orphan",
    ]);
  });
});

describe("defaultPlace", () => {
  it("is the line's latest linked place", () => {
    expect(defaultPlace(places, "cma")).toBe("mpet");
  });
  it("is nothing when the line has none, or no line is chosen", () => {
    expect(defaultPlace(places, "hapag")).toBeNull();
    expect(defaultPlace(places, null)).toBeNull();
  });
});

describe("placeLabel", () => {
  it("writes the name and the address, and the name alone without one", () => {
    expect(placeLabel({ name: "MPET", street: "Kaai 1", zip: "2000", city: "Antwerpen" })).toBe(
      "MPET — Kaai 1, 2000 Antwerpen",
    );
    expect(placeLabel({ name: "MPET", street: null, zip: null, city: null })).toBe("MPET");
  });
});
