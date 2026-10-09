import { describe, expect, it } from "vitest";
import {
  countryLines,
  countryName,
  DEFAULT_COUNTRIES,
  dialOf,
  langOf,
  parseCountryLines,
} from "./countries";

describe("the countries table", () => {
  it("ports the legacy 124 countries with their dial code and language", () => {
    expect(DEFAULT_COUNTRIES).toHaveLength(124);
    expect(DEFAULT_COUNTRIES.find((c) => c.code === "BE")).toEqual({
      code: "BE",
      name: "Belgium",
      dial: "+32",
      lang: "fr",
    });
    expect(new Set(DEFAULT_COUNTRIES.map((c) => c.code)).size).toBe(124);
  });

  it("names, dials and picks the language, falling back as the legacy helpers did", () => {
    expect(countryName(DEFAULT_COUNTRIES, "cm")).toBe("Cameroon");
    expect(countryName(DEFAULT_COUNTRIES, "XX")).toBe("XX");
    expect(countryName(DEFAULT_COUNTRIES, null)).toBe("");
    expect(dialOf(DEFAULT_COUNTRIES, "CM")).toBe("+237");
    expect(dialOf(DEFAULT_COUNTRIES, "XX")).toBe("");
    expect(langOf(DEFAULT_COUNTRIES, "CM")).toBe("fr");
    expect(langOf(DEFAULT_COUNTRIES, "SA")).toBe("ar");
    // German is not a language the office writes in: English.
    expect(langOf(DEFAULT_COUNTRIES, "DE")).toBe("en");
    expect(langOf(DEFAULT_COUNTRIES, undefined)).toBe("en");
  });

  it("round-trips the lines and refuses a bad code, dial or duplicate", () => {
    const { countries, problems } = parseCountryLines(countryLines(DEFAULT_COUNTRIES));
    expect(problems).toEqual([]);
    expect(countries).toEqual(DEFAULT_COUNTRIES);
    expect(parseCountryLines("XK | Kosovo | +383 | en").countries).toEqual([
      { code: "XK", name: "Kosovo", dial: "+383", lang: "en" },
    ]);
    expect(parseCountryLines("XK | Kosovo").countries[0]).toEqual({
      code: "XK",
      name: "Kosovo",
      dial: "",
      lang: "en",
    });
    expect(parseCountryLines("Kosovo | Kosovo").problems[0]).toMatch(/two-letter code/);
    expect(parseCountryLines("XK | Kosovo | 383").problems[0]).toMatch(/dial code/);
    expect(parseCountryLines("XK | Kosovo | +383 | english").problems[0]).toMatch(/two letters/);
    expect(parseCountryLines("BE | Belgium\nbe | Belgique").problems[0]).toMatch(/BE twice/);
  });
});
