import { describe, expect, it } from "vitest";
import { kpiHead, marginBy } from "./kpis";

describe("kpis", () => {
  it("reads the days to get paid from what is open against the last ninety days, and none before a sale", () => {
    expect(
      kpiHead({ revenueCents: 500_000, openArCents: 150_000, grossLast90Cents: 450_000 }),
    ).toEqual({
      revenueCents: 500_000,
      openArCents: 150_000,
      dso: 30,
    });
    expect(kpiHead({ revenueCents: 0, openArCents: 0, grossLast90Cents: 0 }).dso).toBeNull();
  });
  it("groups shipments by a key, best margin first, leaving out what was not invoiced", () => {
    const ships = [
      { revenueCents: 125_000, costCents: 80_000 },
      { revenueCents: 90_000, costCents: 95_000 },
      { revenueCents: 0, costCents: 10_000 },
      { revenueCents: 60_000, costCents: 20_000 },
    ];
    const keys = ["Os Textile", "BV Vanguy", "BV Vanguy", "Os Textile"];
    expect(marginBy(ships, (i) => keys[i])).toEqual([
      {
        key: "Os Textile",
        shipments: 2,
        revenueCents: 185_000,
        costCents: 100_000,
        marginCents: 85_000,
        pct: 46,
      },
      {
        key: "BV Vanguy",
        shipments: 1,
        revenueCents: 90_000,
        costCents: 95_000,
        marginCents: -5_000,
        pct: -6,
      },
    ]);
    expect(marginBy(ships, () => null)[0].key).toBe("—");
  });
});
