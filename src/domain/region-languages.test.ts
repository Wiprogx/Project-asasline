import { describe, expect, it } from "vitest";
import { type Country, langOfAddress } from "./countries";
import {
  DEFAULT_REGION_LANGUAGES,
  parseRegionLanguageLines,
  regionLanguageLines,
  withRegions,
} from "./region-languages";

const TABLE: Country[] = withRegions(
  [
    { code: "BE", name: "Belgium", dial: "+32", lang: "fr" },
    { code: "CH", name: "Switzerland", dial: "+41", lang: "de" },
    { code: "NL", name: "Netherlands", dial: "+31", lang: "nl" },
  ],
  DEFAULT_REGION_LANGUAGES,
);

describe("regional languages", () => {
  it("writes to Flanders in Dutch, to Brussels and Wallonia in French, by the city's region", () => {
    expect(langOfAddress(TABLE, { country: "BE", region: "Flanders" })).toBe("nl");
    expect(langOfAddress(TABLE, { country: "be", region: "flanders" })).toBe("nl");
    expect(langOfAddress(TABLE, { country: "BE", region: "Brussels Capital" })).toBe("fr");
    expect(langOfAddress(TABLE, { country: "BE", region: "Wallonia" })).toBe("fr");
  });
  it("reads the postcode when the city is not known yet", () => {
    expect(langOfAddress(TABLE, { country: "BE", zip: "2000" })).toBe("nl");
    expect(langOfAddress(TABLE, { country: "BE", zip: " 9000 " })).toBe("nl");
    expect(langOfAddress(TABLE, { country: "BE", zip: "1640" })).toBe("nl");
    expect(langOfAddress(TABLE, { country: "BE", zip: "1000" })).toBe("fr");
    expect(langOfAddress(TABLE, { country: "BE", zip: "1300" })).toBe("fr");
    expect(langOfAddress(TABLE, { country: "BE", zip: "4700" })).toBe("fr");
    expect(langOfAddress(TABLE, { country: "BE", zip: "7000" })).toBe("fr");
  });
  it("lets the city's region speak before the postcode", () => {
    expect(langOfAddress(TABLE, { country: "BE", zip: "2000", region: "Flanders" })).toBe("nl");
  });
  it("falls back to the country, and to English for a language the office does not write", () => {
    expect(langOfAddress(TABLE, { country: "BE" })).toBe("fr");
    expect(langOfAddress(TABLE, { country: "BE", zip: "B-2000" })).toBe("fr");
    expect(langOfAddress(TABLE, { country: "NL", zip: "1011 AB" })).toBe("nl");
    expect(langOfAddress(TABLE, { country: "CH", region: "Vaud" })).toBe("fr");
    expect(langOfAddress(TABLE, { country: "CH", zip: "1200" })).toBe("fr");
    expect(langOfAddress(TABLE, { country: "CH", region: "Zurich", zip: "8000" })).toBe("en");
    expect(langOfAddress(TABLE, { country: "XX", zip: "2000" })).toBe("en");
    expect(langOfAddress(TABLE, { country: null })).toBe("en");
  });
  it("gives a country only its own rows", () => {
    expect(TABLE.find((c) => c.code === "NL")?.regions).toBeUndefined();
    expect(TABLE.find((c) => c.code === "BE")?.regions).toHaveLength(5);
  });
  it("writes and reads the lines Settings edits", () => {
    const lines = regionLanguageLines(DEFAULT_REGION_LANGUAGES);
    expect(lines.split("\n")[0]).toBe("BE | Flanders | nl");
    expect(parseRegionLanguageLines(lines)).toEqual({
      rows: DEFAULT_REGION_LANGUAGES,
      problems: [],
    });
    expect(parseRegionLanguageLines("be | 1500 - 3999 | NL\n\n").rows).toEqual([
      { country: "BE", region: "1500 - 3999", lang: "nl" },
    ]);
  });
  it("names what is wrong with a line", () => {
    const { rows, problems } = parseRegionLanguageLines(
      [
        "Belgium | Flanders | nl",
        "BE | | nl",
        "BE | Flanders | de",
        "BE | Flanders | nl",
        "BE | flanders | nl",
      ].join("\n"),
    );
    expect(rows).toEqual([{ country: "BE", region: "Flanders", lang: "nl" }]);
    expect(problems).toEqual([
      "Line 1: a two-letter country code (BE).",
      "Line 2: a region (Flanders) or a postcode range (1500-3999).",
      "Line 3: a language the office writes (en, fr, nl, tr, ar).",
      "Line 5: BE flanders twice.",
    ]);
  });
});
