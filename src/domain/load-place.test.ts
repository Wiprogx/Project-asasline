import { describe, expect, it } from "vitest";
import { defaultLoadPlace, loadPlaces } from "./load-place";

const places = [
  { value: "yard", label: "Yard (Loading)", delivery: false },
  { value: "acme", label: "Acme — Kaai 1", delivery: false },
];

describe("defaultLoadPlace", () => {
  it("is the customer's delivery address when it has one", () => {
    const withDelivery = [{ value: "wh", label: "Warehouse", delivery: true }, ...places];
    expect(defaultLoadPlace(withDelivery, "acme")).toBe("wh");
  });
  it("is the customer's own address without one", () => {
    expect(defaultLoadPlace(places, "acme")).toBe("acme");
  });
  it("is nothing when the customer has no address, or none is chosen", () => {
    expect(defaultLoadPlace([places[0]], "acme")).toBeNull();
    expect(defaultLoadPlace(places, null)).toBeNull();
  });
});

describe("loadPlaces", () => {
  const locations = [
    { value: "yard", label: "Yard — Kaai 2" },
    { value: "quay", label: "Quay 730 — Antwerpen" },
  ];
  it("offers the customer's places first, then every other location", () => {
    expect(loadPlaces(places, locations).map((p) => p.value)).toEqual(["yard", "acme", "quay"]);
  });
  it("names a place the customer's way when it is among both", () => {
    expect(loadPlaces(places, locations)[0].label).toBe("Yard (Loading)");
  });
  it("offers every location when the customer has none", () => {
    expect(loadPlaces([], locations)).toEqual(locations);
  });
});
