import { describe, expect, it } from "vitest";
import {
  DEFAULT_RATE_SOURCES,
  parseRateSourceLines,
  rateSourceLines,
  sourceLabel,
} from "./rate-sources";

describe("the rate sources", () => {
  it("default to the legacy two and label a key", () => {
    expect(DEFAULT_RATE_SOURCES).toEqual([
      { key: "contract", label: "Contract" },
      { key: "spot", label: "Spot" },
    ]);
    expect(sourceLabel(DEFAULT_RATE_SOURCES, "spot")).toBe("Spot");
    expect(sourceLabel(DEFAULT_RATE_SOURCES, "tender")).toBe("tender");
  });

  it("round-trip the lines and refuse a bad key, a missing label or a duplicate", () => {
    const { sources, problems } = parseRateSourceLines(rateSourceLines(DEFAULT_RATE_SOURCES));
    expect(problems).toEqual([]);
    expect(sources).toEqual(DEFAULT_RATE_SOURCES);
    expect(parseRateSourceLines("tender | Tender (yearly)").sources).toEqual([
      { key: "tender", label: "Tender (yearly)" },
    ]);
    expect(parseRateSourceLines("Tender | Tender").problems[0]).toMatch(/lowercase/);
    expect(parseRateSourceLines("tender").problems[0]).toMatch(/label/);
    expect(parseRateSourceLines("spot | Spot\nspot | Again").problems[0]).toMatch(/twice/);
  });
});
