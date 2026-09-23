import { describe, expect, it } from "vitest";
import { normaliseList } from "./lists";

describe("normaliseList", () => {
  it("trims, drops blanks and case-insensitive duplicates, keeps order", () => {
    expect(normaliseList(" 40HC\r\n\n20DV\n40hc\n  Other ")).toEqual(["40HC", "20DV", "Other"]);
  });
  it("gives an empty list for empty text", () => {
    expect(normaliseList("\n \n")).toEqual([]);
  });
});
