import { describe, expect, it } from "vitest";
import { idClean, idProblem } from "./contacts";

describe("idProblem", () => {
  it("reads a Belgian VAT number however it is typed, and checks its check digits", () => {
    expect(idClean("be 0464.648.410")).toBe("BE0464648410");
    expect(idProblem("be 0464.648.410", "BE", "vat")).toBeNull();
    expect(idProblem("BE0464648411", "BE", "vat")).toMatch(/check digits/);
  });

  it("says what the country expects, with an example", () => {
    expect(idProblem("NL861234567", "NL", "vat")).toBe(
      "A NL VAT number is NL + 9 digits + B + 2 digits — for example NL861234567B01",
    );
  });

  it("takes the country from the number's prefix when the contact has none", () => {
    expect(idProblem("DE12345", null, "vat")).toMatch(/^A DE VAT number/);
  });

  it("takes a number as written where no format is on file, or when empty", () => {
    expect(idProblem("XY-123", "US", "vat")).toBeNull();
    expect(idProblem("", "BE", "vat")).toBeNull();
  });

  it("checks EORI numbers with their own format", () => {
    expect(idProblem("DE123456789012345", "DE", "eori")).toBeNull();
    expect(idProblem("DE123456789", "DE", "eori")).toMatch(/15 digits/);
  });
});
