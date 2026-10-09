import { describe, expect, it } from "vitest";
import { DEFAULT_SEAL_SOURCES, sealLabel, sealOf, sealSourceProblem, sealText } from "./seals";

describe("seals", () => {
  it("reads a number with its source, or a bare number", () => {
    expect(sealOf("ABC1234 (Carrier)")).toEqual({ no: "ABC1234", source: "Carrier" });
    expect(sealOf("  XYZ-9 ")).toEqual({ no: "XYZ-9", source: null });
    expect(sealText(sealOf("ABC1234 (Carrier)"))).toBe("ABC1234 (Carrier)");
    expect(sealLabel(sealOf("ABC1234 (Carrier)"))).toBe("ABC1234 · Carrier");
  });
  it("refuses a source the office does not know, and nothing else", () => {
    expect(sealSourceProblem(["ABC1234 (Carrier)", "X"], DEFAULT_SEAL_SOURCES)).toBeNull();
    expect(sealSourceProblem(["ABC1234 (Pirate)"], DEFAULT_SEAL_SOURCES)).toMatch(/Pirate/);
  });
});
