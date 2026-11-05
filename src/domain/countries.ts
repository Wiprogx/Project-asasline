import { cityKey } from "./cities";
import { LANGUAGES } from "./contacts";
import { postcodeKey } from "./postcodes";

type Language = (typeof LANGUAGES)[number];

/**
 * A part of a country written to in another language than the country's (Settings › Regional
 * languages): Flanders in Dutch while Belgium is French. `region` is the city's region as
 * Settings › Countries spells it ("Flanders"), or a postcode range ("1500-3999", "1000") for an
 * address whose postcode is known before its city.
 */
export type RegionLanguage = { region: string; lang: string };

/**
 * A country of the `countries` table (Settings › Countries; legacy COUNTRIES + COUNTRY_META):
 * the ISO code a record names it by, the office's name for it, the dial code of its phones and
 * the language the office writes to a contact there. Every ISO country is a row (migration
 * 0074); an archived one is no longer offered but still named.
 */
export type Country = {
  code: string;
  name: string;
  dial: string;
  lang: string;
  archived?: boolean;
  /** Its regions written to in another language, in the order they are tried. */
  regions?: readonly RegionLanguage[];
};

/** What of an address decides its language: the country, and its postcode or its city's region. */
export type AddressPlace = {
  country: string | null | undefined;
  zip?: string | null;
  region?: string | null;
};

export const COUNTRY_CODE = /^[A-Z]{2}$/;

/** "1500-3999" or "1000": a rule by postcode, inclusive. */
export const POSTCODE_RANGE = /^(\d{1,9})(?:\s*-\s*(\d{1,9}))?$/;

const find = (countries: readonly Country[], code: string | null | undefined) =>
  code ? countries.find((c) => c.code === code.toUpperCase()) : undefined;

/** A language the office writes; English for any other. */
const written = (lang: string | undefined): Language =>
  lang && (LANGUAGES as readonly string[]).includes(lang) ? (lang as Language) : "en";

/** "Belgium" for BE; an unknown code is shown as written (legacy cName). */
export const countryName = (countries: readonly Country[], code: string | null | undefined) =>
  find(countries, code)?.name ?? code ?? "";

/** "+32" for BE, nothing for an unknown country (legacy dialOf). */
export const dialOf = (countries: readonly Country[], code: string | null | undefined) =>
  find(countries, code)?.dial ?? "";

/** The language the office writes to a contact there; English when unknown or not one the office writes (legacy langOf). */
export function langOf(countries: readonly Country[], code: string | null | undefined): Language {
  return written(find(countries, code)?.lang);
}

/** The number a postcode starts with ("2600", "1011 AB" → 1011); none for "L-1009". */
function postcodeNumber(country: string, zip: string): number | null {
  const m = /^\d+/.exec(postcodeKey(country, zip));
  return m ? Number(m[0]) : null;
}

/** Whether a rule speaks for the address: its range holds the postcode, or its region is the city's. */
function regionMatches(rule: RegionLanguage, country: string, a: AddressPlace): boolean {
  const range = POSTCODE_RANGE.exec(rule.region.trim());
  if (range) {
    const n = a.zip ? postcodeNumber(country, a.zip) : null;
    const from = Number(range[1]);
    return n !== null && n >= from && n <= (range[2] ? Number(range[2]) : from);
  }
  return !!a.region && cityKey(a.region) === cityKey(rule.region);
}

/**
 * The language written to a new contact at that address: its region's when the country has one
 * for it (Flanders: Dutch), else the country's, English when neither is one the office writes.
 */
export function langOfAddress(countries: readonly Country[], a: AddressPlace): Language {
  const c = find(countries, a.country);
  const hit = c?.regions?.find((r) => regionMatches(r, c.code, a));
  return written(hit?.lang ?? c?.lang);
}
