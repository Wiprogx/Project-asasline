import { describe, expect, it } from "vitest";
import {
  cargoKgOf,
  DEFAULT_HS_CODES,
  DEFAULT_PACKAGE_TYPES,
  hsCodeLines,
  hsDescription,
  hsLineText,
  packagesOf,
  packageTypeOf,
  parseHsCodeLines,
  parseHsLines,
} from "./goods";

describe("the HS code table", () => {
  it("ships the legacy list and round-trips through the Settings lines", () => {
    expect(DEFAULT_HS_CODES).toHaveLength(45);
    expect(DEFAULT_PACKAGE_TYPES).toHaveLength(20);
    expect(hsDescription(DEFAULT_HS_CODES, "630900")).toBe("Worn clothing and other worn articles");
    const { codes, problems } = parseHsCodeLines(hsCodeLines(DEFAULT_HS_CODES));
    expect(problems).toEqual([]);
    expect(codes).toEqual(DEFAULT_HS_CODES);
  });
  it("refuses a code that is not six digits, a line twice, and a missing description", () => {
    expect(parseHsCodeLines("63090 | x").problems[0]).toMatch(/six-digit/);
    expect(parseHsCodeLines("630900 | a\n630900 | b").problems[0]).toMatch(/twice/);
    expect(parseHsCodeLines("630900").problems[0]).toMatch(/description/);
  });
});

describe("the HS lines of a box", () => {
  it("read a code with its own weight, packages and type, and write them back", () => {
    const { lines, problem } = parseHsLines("630900 | 12000 | 620 | Bales\n640399 | | 40");
    expect(problem).toBeNull();
    expect(lines).toEqual([
      { code: "630900", weightKg: 12000, packages: 620, packageType: "Bales" },
      { code: "640399", weightKg: null, packages: 40, packageType: null },
    ]);
    expect(hsLineText(lines)).toBe("630900 | 12000 | 620 | Bales\n640399 |  | 40");
    expect(parseHsLines("ABC").problem).toMatch(/six-digit/);
    expect(parseHsLines("630900 | 12.5").problem).toMatch(/whole kilograms/);
  });

  it("let the lines' totals win over the box's own figures, and keep the box's when there are none", () => {
    const lines = parseHsLines("630900 | 12000 | 620 | Bales\n640399 | 3000 | 40 | Cartons").lines;
    const box = { hsLines: lines, cargoKg: 999, packages: 1, packageType: "Pallets" };
    expect(cargoKgOf(box)).toBe(15000);
    expect(packagesOf(box)).toBe(660);
    expect(packageTypeOf(box)).toBe("Bales + Cartons");
    const bare = { hsLines: [], cargoKg: 999, packages: 1, packageType: "Pallets" };
    expect(cargoKgOf(bare)).toBe(999);
    expect(packagesOf(bare)).toBe(1);
    expect(packageTypeOf(bare)).toBe("Pallets");
    // a line without a weight does not turn the total into zero
    const noWeights = { ...bare, hsLines: parseHsLines("630900 | | 620 | Bales").lines };
    expect(cargoKgOf(noWeights)).toBe(999);
    expect(packageTypeOf(noWeights)).toBe("Bales");
  });
});
