import { describe, expect, it } from "vitest";
import { cityKey, cityLabel, citySearchKey } from "./cities";

describe("cities", () => {
  it("reads words without accents or case, as the migration's key does", () => {
    expect(cityKey("Liège")).toBe("liege");
    expect(cityKey("Braine-l’Alleud")).toBe("braine l alleud");
    expect(cityKey("İzmir")).toBe("izmir");
    expect(cityKey("  SÃO  Paulo ")).toBe("sao paulo");
  });
  it("searches a city by its name, its other names and its region", () => {
    expect(
      citySearchKey({
        name: "Brussels",
        aliases: ["Bruxelles", "Brussel"],
        region: "Brussels Capital",
      }),
    ).toBe("brussels bruxelles brussel brussels capital");
  });
  it("names the region only when it tells the city apart", () => {
    expect(cityLabel({ name: "Mersin", region: "Mersin" })).toBe("Mersin");
    expect(cityLabel({ name: "Saint-Denis", region: "Réunion" })).toBe("Saint-Denis (Réunion)");
    expect(cityLabel({ name: "Kraainem", region: null })).toBe("Kraainem");
  });
});
