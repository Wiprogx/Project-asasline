import { LANGUAGES } from "./contacts";

type Language = (typeof LANGUAGES)[number];

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
};

export const COUNTRY_CODE = /^[A-Z]{2}$/;

const find = (countries: readonly Country[], code: string | null | undefined) =>
  code ? countries.find((c) => c.code === code.toUpperCase()) : undefined;

/** "Belgium" for BE; an unknown code is shown as written (legacy cName). */
export const countryName = (countries: readonly Country[], code: string | null | undefined) =>
  find(countries, code)?.name ?? code ?? "";

/** "+32" for BE, nothing for an unknown country (legacy dialOf). */
export const dialOf = (countries: readonly Country[], code: string | null | undefined) =>
  find(countries, code)?.dial ?? "";

/** The language the office writes to a contact there; English when unknown or not one the office writes (legacy langOf). */
export function langOf(countries: readonly Country[], code: string | null | undefined): Language {
  const lang = find(countries, code)?.lang ?? "en";
  return (LANGUAGES as readonly string[]).includes(lang) ? (lang as Language) : "en";
}
