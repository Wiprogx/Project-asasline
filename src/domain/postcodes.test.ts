import { describe, expect, it } from "vitest";
import { postcodeKey, postcodeLabel } from "./postcodes";

describe("postcodes", () => {
  it("compares a code without spaces or case, a Dutch one by its four digits", () => {
    expect(postcodeKey("BE", " 2600 ")).toBe("2600");
    expect(postcodeKey("NL", "1011 ab")).toBe("1011");
    expect(postcodeKey("FR", "75 001")).toBe("75001");
  });
  it("shows the code with its place", () => {
    expect(postcodeLabel({ code: "2600", place: "Berchem" })).toBe("2600 Berchem");
  });
});
