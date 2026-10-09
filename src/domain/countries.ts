import { LANGUAGES } from "./contacts";

type Language = (typeof LANGUAGES)[number];

/**
 * The countries the office ships to (legacy COUNTRIES + COUNTRY_META, 124 of them): the ISO
 * code, the name the office writes, the dial code for a phone and the language the office
 * writes to a contact there. A Settings table (invariant 8); these are the defaults until saved.
 */
export type Country = { code: string; name: string; dial: string; lang: string };

export const DEFAULT_COUNTRIES: readonly Country[] = [
  { code: "DZ", name: "Algeria", dial: "+213", lang: "fr" },
  { code: "AO", name: "Angola", dial: "+244", lang: "pt" },
  { code: "AR", name: "Argentina", dial: "+54", lang: "es" },
  { code: "AU", name: "Australia", dial: "+61", lang: "en" },
  { code: "AZ", name: "Azerbaijan", dial: "+994", lang: "en" },
  { code: "BS", name: "Bahamas", dial: "+1", lang: "en" },
  { code: "BH", name: "Bahrain", dial: "+973", lang: "ar" },
  { code: "BD", name: "Bangladesh", dial: "+880", lang: "en" },
  { code: "BE", name: "Belgium", dial: "+32", lang: "fr" },
  { code: "BJ", name: "Benin", dial: "+229", lang: "fr" },
  { code: "BR", name: "Brazil", dial: "+55", lang: "pt" },
  { code: "BN", name: "Brunei", dial: "+673", lang: "en" },
  { code: "BG", name: "Bulgaria", dial: "+359", lang: "en" },
  { code: "KH", name: "Cambodia", dial: "+855", lang: "en" },
  { code: "CM", name: "Cameroon", dial: "+237", lang: "fr" },
  { code: "CA", name: "Canada", dial: "+1", lang: "en" },
  { code: "CL", name: "Chile", dial: "+56", lang: "es" },
  { code: "CN", name: "China", dial: "+86", lang: "en" },
  { code: "CO", name: "Colombia", dial: "+57", lang: "es" },
  { code: "CG", name: "Congo (Brazzaville)", dial: "+242", lang: "fr" },
  { code: "CD", name: "Congo (Kinshasa)", dial: "+243", lang: "fr" },
  { code: "CR", name: "Costa Rica", dial: "+506", lang: "es" },
  { code: "HR", name: "Croatia", dial: "+385", lang: "en" },
  { code: "CU", name: "Cuba", dial: "+53", lang: "es" },
  { code: "CY", name: "Cyprus", dial: "+357", lang: "en" },
  { code: "DK", name: "Denmark", dial: "+45", lang: "en" },
  { code: "DJ", name: "Djibouti", dial: "+253", lang: "fr" },
  { code: "DO", name: "Dominican Republic", dial: "+1", lang: "es" },
  { code: "EC", name: "Ecuador", dial: "+593", lang: "es" },
  { code: "EG", name: "Egypt", dial: "+20", lang: "ar" },
  { code: "SV", name: "El Salvador", dial: "+503", lang: "es" },
  { code: "GQ", name: "Equatorial Guinea", dial: "+240", lang: "es" },
  { code: "EE", name: "Estonia", dial: "+372", lang: "en" },
  { code: "FJ", name: "Fiji", dial: "+679", lang: "en" },
  { code: "FI", name: "Finland", dial: "+358", lang: "en" },
  { code: "FR", name: "France", dial: "+33", lang: "fr" },
  { code: "GA", name: "Gabon", dial: "+241", lang: "fr" },
  { code: "GM", name: "Gambia", dial: "+220", lang: "en" },
  { code: "GE", name: "Georgia", dial: "+995", lang: "en" },
  { code: "DE", name: "Germany", dial: "+49", lang: "de" },
  { code: "GH", name: "Ghana", dial: "+233", lang: "en" },
  { code: "GR", name: "Greece", dial: "+30", lang: "en" },
  { code: "GT", name: "Guatemala", dial: "+502", lang: "es" },
  { code: "GN", name: "Guinea", dial: "+224", lang: "fr" },
  { code: "HT", name: "Haiti", dial: "+509", lang: "fr" },
  { code: "HN", name: "Honduras", dial: "+504", lang: "es" },
  { code: "HK", name: "Hong Kong", dial: "+852", lang: "en" },
  { code: "IN", name: "India", dial: "+91", lang: "en" },
  { code: "ID", name: "Indonesia", dial: "+62", lang: "en" },
  { code: "IR", name: "Iran", dial: "+98", lang: "en" },
  { code: "IQ", name: "Iraq", dial: "+964", lang: "ar" },
  { code: "IE", name: "Ireland", dial: "+353", lang: "en" },
  { code: "IL", name: "Israel", dial: "+972", lang: "en" },
  { code: "IT", name: "Italy", dial: "+39", lang: "en" },
  { code: "CI", name: "Ivory Coast", dial: "+225", lang: "fr" },
  { code: "JM", name: "Jamaica", dial: "+1", lang: "en" },
  { code: "JP", name: "Japan", dial: "+81", lang: "en" },
  { code: "JO", name: "Jordan", dial: "+962", lang: "ar" },
  { code: "KZ", name: "Kazakhstan", dial: "+7", lang: "en" },
  { code: "KE", name: "Kenya", dial: "+254", lang: "en" },
  { code: "KW", name: "Kuwait", dial: "+965", lang: "ar" },
  { code: "LV", name: "Latvia", dial: "+371", lang: "en" },
  { code: "LB", name: "Lebanon", dial: "+961", lang: "ar" },
  { code: "LR", name: "Liberia", dial: "+231", lang: "en" },
  { code: "LY", name: "Libya", dial: "+218", lang: "ar" },
  { code: "LT", name: "Lithuania", dial: "+370", lang: "en" },
  { code: "LU", name: "Luxembourg", dial: "+352", lang: "fr" },
  { code: "MG", name: "Madagascar", dial: "+261", lang: "fr" },
  { code: "MY", name: "Malaysia", dial: "+60", lang: "en" },
  { code: "MV", name: "Maldives", dial: "+960", lang: "en" },
  { code: "MT", name: "Malta", dial: "+356", lang: "en" },
  { code: "MR", name: "Mauritania", dial: "+222", lang: "fr" },
  { code: "MU", name: "Mauritius", dial: "+230", lang: "en" },
  { code: "MX", name: "Mexico", dial: "+52", lang: "es" },
  { code: "MA", name: "Morocco", dial: "+212", lang: "fr" },
  { code: "MZ", name: "Mozambique", dial: "+258", lang: "pt" },
  { code: "MM", name: "Myanmar", dial: "+95", lang: "en" },
  { code: "NA", name: "Namibia", dial: "+264", lang: "en" },
  { code: "NL", name: "Netherlands", dial: "+31", lang: "nl" },
  { code: "NZ", name: "New Zealand", dial: "+64", lang: "en" },
  { code: "NI", name: "Nicaragua", dial: "+505", lang: "es" },
  { code: "NG", name: "Nigeria", dial: "+234", lang: "en" },
  { code: "NO", name: "Norway", dial: "+47", lang: "en" },
  { code: "OM", name: "Oman", dial: "+968", lang: "en" },
  { code: "PK", name: "Pakistan", dial: "+92", lang: "en" },
  { code: "PA", name: "Panama", dial: "+507", lang: "es" },
  { code: "PG", name: "Papua New Guinea", dial: "+675", lang: "en" },
  { code: "PY", name: "Paraguay", dial: "+595", lang: "es" },
  { code: "PE", name: "Peru", dial: "+51", lang: "es" },
  { code: "PH", name: "Philippines", dial: "+63", lang: "en" },
  { code: "PL", name: "Poland", dial: "+48", lang: "en" },
  { code: "PT", name: "Portugal", dial: "+351", lang: "en" },
  { code: "QA", name: "Qatar", dial: "+974", lang: "ar" },
  { code: "RO", name: "Romania", dial: "+40", lang: "en" },
  { code: "RU", name: "Russia", dial: "+7", lang: "en" },
  { code: "SA", name: "Saudi Arabia", dial: "+966", lang: "ar" },
  { code: "SN", name: "Senegal", dial: "+221", lang: "fr" },
  { code: "SL", name: "Sierra Leone", dial: "+232", lang: "en" },
  { code: "SG", name: "Singapore", dial: "+65", lang: "en" },
  { code: "SI", name: "Slovenia", dial: "+386", lang: "en" },
  { code: "SO", name: "Somalia", dial: "+252", lang: "en" },
  { code: "ZA", name: "South Africa", dial: "+27", lang: "en" },
  { code: "KR", name: "South Korea", dial: "+82", lang: "en" },
  { code: "ES", name: "Spain", dial: "+34", lang: "en" },
  { code: "LK", name: "Sri Lanka", dial: "+94", lang: "en" },
  { code: "SD", name: "Sudan", dial: "+249", lang: "ar" },
  { code: "SE", name: "Sweden", dial: "+46", lang: "en" },
  { code: "SY", name: "Syria", dial: "+963", lang: "ar" },
  { code: "TW", name: "Taiwan", dial: "+886", lang: "en" },
  { code: "TZ", name: "Tanzania", dial: "+255", lang: "en" },
  { code: "TH", name: "Thailand", dial: "+66", lang: "en" },
  { code: "TG", name: "Togo", dial: "+228", lang: "fr" },
  { code: "TT", name: "Trinidad & Tobago", dial: "+1", lang: "en" },
  { code: "TN", name: "Tunisia", dial: "+216", lang: "ar" },
  { code: "TM", name: "Turkmenistan", dial: "+993", lang: "en" },
  { code: "TR", name: "Türkiye", dial: "+90", lang: "tr" },
  { code: "UA", name: "Ukraine", dial: "+380", lang: "en" },
  { code: "AE", name: "United Arab Emirates", dial: "+971", lang: "en" },
  { code: "GB", name: "United Kingdom", dial: "+44", lang: "en" },
  { code: "US", name: "United States", dial: "+1", lang: "en" },
  { code: "UY", name: "Uruguay", dial: "+598", lang: "es" },
  { code: "VE", name: "Venezuela", dial: "+58", lang: "es" },
  { code: "VN", name: "Vietnam", dial: "+84", lang: "en" },
  { code: "YE", name: "Yemen", dial: "+967", lang: "ar" },
];

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

/** `CODE | Name | +dial | lang` — one country per line, as Settings edits them. */
export const countryLines = (countries: readonly Country[]) =>
  countries.map((c) => [c.code, c.name, c.dial, c.lang].join(" | ")).join("\n");

export function parseCountryLines(text: string): { countries: Country[]; problems: string[] } {
  const countries: Country[] = [];
  const problems: string[] = [];
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line, i) => {
      const [code = "", name = "", dial = "", lang = "en"] = line.split("|").map((x) => x.trim());
      const cc = code.toUpperCase();
      if (!/^[A-Z]{2}$/.test(cc)) problems.push(`Line ${i + 1}: a two-letter code (BE).`);
      else if (!name || name.length > 80)
        problems.push(`Line ${i + 1}: a name (up to 80 characters).`);
      else if (dial && !/^\+\d{1,4}$/.test(dial))
        problems.push(`Line ${i + 1}: a dial code like +32, or nothing.`);
      else if (!/^[a-z]{2}$/.test(lang.toLowerCase()))
        problems.push(`Line ${i + 1}: a language as two letters (fr).`);
      else if (countries.some((c) => c.code === cc)) problems.push(`Line ${i + 1}: ${cc} twice.`);
      else countries.push({ code: cc, name, dial, lang: lang.toLowerCase() });
    });
  return { countries, problems };
}
