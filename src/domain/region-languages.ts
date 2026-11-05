import { LANGUAGES } from "./contacts";
import { type Country, COUNTRY_CODE, POSTCODE_RANGE, type RegionLanguage } from "./countries";

type Language = (typeof LANGUAGES)[number];

/**
 * The regional languages (Settings › Regional languages): a part of a country written to in
 * another language than the country's — a new contact in Flanders is written to in Dutch while
 * Belgium is French. A Settings table (invariant 8); these rows are the defaults until saved.
 * A row names the region as Settings › Countries spells a city's region, or a postcode range for
 * an address whose postcode is typed before its city is known.
 */
export type RegionLanguageRow = RegionLanguage & { country: string; lang: Language };

export const DEFAULT_REGION_LANGUAGES: readonly RegionLanguageRow[] = [
  { country: "BE", region: "Flanders", lang: "nl" },
  { country: "BE", region: "Brussels Capital", lang: "fr" },
  { country: "BE", region: "Wallonia", lang: "fr" },
  { country: "BE", region: "1500-3999", lang: "nl" },
  { country: "BE", region: "8000-9999", lang: "nl" },
  { country: "CH", region: "Vaud", lang: "fr" },
  { country: "CH", region: "Geneva", lang: "fr" },
  { country: "CH", region: "Neuchatel", lang: "fr" },
  { country: "CH", region: "Jura", lang: "fr" },
  { country: "CH", region: "1000-2999", lang: "fr" },
];

/** Each country given its rows, in their order; a country without any is left as it is. */
export function withRegions(
  countries: readonly Country[],
  rows: readonly RegionLanguageRow[],
): Country[] {
  return countries.map((c) => {
    const regions = rows
      .filter((r) => r.country === c.code)
      .map(({ region, lang }) => ({ region, lang }));
    return regions.length ? { ...c, regions } : c;
  });
}

/** `BE | Flanders | nl` — one rule per line, as Settings edits them. */
export const regionLanguageLines = (rows: readonly RegionLanguageRow[]) =>
  rows.map((r) => `${r.country} | ${r.region} | ${r.lang}`).join("\n");

const REGION_WORDS = /^[\p{L}\p{N} '.()-]{1,60}$/u;

export function parseRegionLanguageLines(text: string): {
  rows: RegionLanguageRow[];
  problems: string[];
} {
  const rows: RegionLanguageRow[] = [];
  const problems: string[] = [];
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line, i) => {
      const [country = "", region = "", lang = ""] = line.split("|").map((x) => x.trim());
      const cc = country.toUpperCase();
      const code = lang.toLowerCase();
      if (!COUNTRY_CODE.test(cc)) problems.push(`Line ${i + 1}: a two-letter country code (BE).`);
      else if (!POSTCODE_RANGE.test(region) && !REGION_WORDS.test(region))
        problems.push(`Line ${i + 1}: a region (Flanders) or a postcode range (1500-3999).`);
      else if (!(LANGUAGES as readonly string[]).includes(code))
        problems.push(`Line ${i + 1}: a language the office writes (${LANGUAGES.join(", ")}).`);
      else if (
        rows.some((r) => r.country === cc && r.region.toLowerCase() === region.toLowerCase())
      )
        problems.push(`Line ${i + 1}: ${cc} ${region} twice.`);
      else rows.push({ country: cc, region, lang: code as Language });
    });
  return { rows, problems };
}
