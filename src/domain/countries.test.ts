import { describe, expect, it } from "vitest";
import { type Country, countryName, dialOf, langOf } from "./countries";

const TABLE: Country[] = [
  { code: "BE", name: "Belgium", dial: "+32", lang: "fr" },
  { code: "CM", name: "Cameroon", dial: "+237", lang: "fr" },
  { code: "SA", name: "Saudi Arabia", dial: "+966", lang: "ar" },
  { code: "DE", name: "Germany", dial: "+49", lang: "de" },
];

describe("countries", () => {
  it("names a country by its code, any case; an unknown code as written", () => {
    expect(countryName(TABLE, "cm")).toBe("Cameroon");
    expect(countryName(TABLE, "XX")).toBe("XX");
    expect(countryName(TABLE, null)).toBe("");
  });
  it("gives the dial code, nothing for an unknown country", () => {
    expect(dialOf(TABLE, "CM")).toBe("+237");
    expect(dialOf(TABLE, "XX")).toBe("");
  });
  it("writes in the country's language when the office writes it, else English", () => {
    expect(langOf(TABLE, "CM")).toBe("fr");
    expect(langOf(TABLE, "SA")).toBe("ar");
    expect(langOf(TABLE, "DE")).toBe("en");
    expect(langOf(TABLE, undefined)).toBe("en");
  });
});
