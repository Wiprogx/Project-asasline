import { describe, expect, it } from "vitest";
import { formatRef, refFloors } from "./refs";

describe("refFloors", () => {
  it("is the highest counter issued in each month of each series", () => {
    expect(refFloors(["QT2609004", "QT2609012", "SB2609003", "QT2610001", "nonsense"])).toEqual({
      QT2609: 12,
      SB2609: 3,
      QT2610: 1,
    });
  });

  it("reads back what formatRef writes", () => {
    expect(refFloors([formatRef("SB", "2026-01-15", 7)])).toEqual({ SB2601: 7 });
  });
});
