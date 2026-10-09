/** Contact vocabulary (legacy CHILD_TYPES, contact types). Seed values for Settings tables. */
export const CONTACT_TYPES = ["company", "person"] as const;

export const ADDRESS_TYPES = [
  "Doc Check",
  "Contact",
  "Invoicing address",
  "Delivery address",
  "Shipper",
  "Consignee",
  "Notify Party",
  "Weight address",
  "Terminal",
  "Depot",
  "Other address",
] as const;

/** Correspondence language is per contact; the UI stays English (invariant 10). */
export const LANGUAGES = ["en", "fr", "nl", "tr", "ar"] as const;

/** A stable lettermark from a name: same company, same initials, on every screen. */
export function lettermark(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0][0] ?? "";
  const second = words.length > 1 ? (words[1][0] ?? "") : (words[0][1] ?? "");
  return (first + second).toUpperCase();
}

/**
 * VAT and EORI number formats per country (legacy ID_FORMATS). A country without a format is
 * taken as written; a known country's number must match — a typo there breaks Peppol, the
 * listings and customs declarations.
 */
export type IdKind = "vat" | "eori";
export type IdFormat = { country: string; kind: IdKind; pattern: string; hint: string; eg: string };

export const ID_FORMATS: readonly IdFormat[] = [
  {
    country: "BE",
    kind: "vat",
    pattern: "^BE0\\d{9}$",
    hint: "BE + 10 digits, the first a 0",
    eg: "BE0464648410",
  },
  {
    country: "BE",
    kind: "eori",
    pattern: "^BE\\d{10}$",
    hint: "BE + 10 digits",
    eg: "BE0464648410",
  },
  {
    country: "NL",
    kind: "vat",
    pattern: "^NL\\d{9}B\\d{2}$",
    hint: "NL + 9 digits + B + 2 digits",
    eg: "NL861234567B01",
  },
  { country: "NL", kind: "eori", pattern: "^NL\\d{9}$", hint: "NL + 9 digits", eg: "NL861234567" },
  {
    country: "FR",
    kind: "vat",
    pattern: "^FR[A-Z0-9]{2}\\d{9}$",
    hint: "FR + 2 characters + 9 digits",
    eg: "FR62812445107",
  },
  {
    country: "FR",
    kind: "eori",
    pattern: "^FR\\d{14}$",
    hint: "FR + 14 digits",
    eg: "FR12345678900012",
  },
  { country: "DE", kind: "vat", pattern: "^DE\\d{9}$", hint: "DE + 9 digits", eg: "DE123456789" },
  {
    country: "DE",
    kind: "eori",
    pattern: "^DE\\d{15}$",
    hint: "DE + 15 digits",
    eg: "DE123456789012345",
  },
  { country: "LU", kind: "vat", pattern: "^LU\\d{8}$", hint: "LU + 8 digits", eg: "LU12345678" },
  {
    country: "IT",
    kind: "vat",
    pattern: "^IT\\d{11}$",
    hint: "IT + 11 digits",
    eg: "IT12345678901",
  },
  {
    country: "ES",
    kind: "vat",
    pattern: "^ES[A-Z0-9]\\d{7}[A-Z0-9]$",
    hint: "ES + 9 characters",
    eg: "ESA12345674",
  },
  { country: "PT", kind: "vat", pattern: "^PT\\d{9}$", hint: "PT + 9 digits", eg: "PT123456789" },
  { country: "GB", kind: "vat", pattern: "^GB\\d{9}$", hint: "GB + 9 digits", eg: "GB123456789" },
  {
    country: "GB",
    kind: "eori",
    pattern: "^GB\\d{12}$",
    hint: "GB + 12 digits",
    eg: "GB123456789000",
  },
  {
    country: "AE",
    kind: "vat",
    pattern: "^\\d{15}$",
    hint: "15 digits, no prefix",
    eg: "100590899900003",
  },
  {
    country: "TN",
    kind: "vat",
    pattern: "^\\d{7}[A-Z]{3}$",
    hint: "7 digits + 3 letters",
    eg: "1284567AMB",
  },
  { country: "MA", kind: "vat", pattern: "^\\d{8}$", hint: "8 digits", eg: "12345678" },
  { country: "EG", kind: "vat", pattern: "^\\d{9}$", hint: "9 digits", eg: "123456789" },
  { country: "TR", kind: "vat", pattern: "^\\d{10}$", hint: "10 digits", eg: "1234567890" },
];

/** Spaces, dots and dashes out, upper case: "be 0464.648.410" is BE0464648410. */
export const idClean = (v: string | null | undefined) =>
  (v ?? "").replace(/[\s.-]/g, "").toUpperCase();

/** A Belgian enterprise number carries its own check: the last two digits are 97 − (first eight mod 97). */
const belgianCheckOk = (digits10: string) =>
  97 - (Number(digits10.slice(0, 8)) % 97) === Number(digits10.slice(8));

/** What is wrong with a VAT or EORI number for its country, or null when it reads right. */
export function idProblem(
  value: string | null | undefined,
  country: string | null | undefined,
  kind: IdKind,
  formats: readonly IdFormat[] = ID_FORMATS,
): string | null {
  const v = idClean(value);
  if (!v) return null;
  const cc = (country ?? /^[A-Z]{2}/.exec(v)?.[0] ?? "").toUpperCase();
  const f = formats.find((x) => x.country === cc && x.kind === kind);
  if (!f) return null;
  const label = kind === "vat" ? "VAT number" : "EORI number";
  if (!new RegExp(f.pattern).test(v)) return `A ${cc} ${label} is ${f.hint} — for example ${f.eg}`;
  if (cc === "BE" && !belgianCheckOk(v.slice(2)))
    return `This ${label} fails the Belgian check digits — a digit is wrong`;
  return null;
}

/* ---- the Settings table, one format per line: "BE | vat | ^BE0\\d{9}$ | BE + 10 digits | BE0464648410" ---- */

export const idFormatLines = (formats: readonly IdFormat[]) =>
  formats.map((f) => [f.country, f.kind, f.pattern, f.hint, f.eg].join(" | ")).join("\n");

const patternOk = (p: string) => {
  try {
    new RegExp(p);
    return p.length > 0 && p.length <= 80;
  } catch {
    return false;
  }
};

export function parseIdFormatLines(text: string): { formats: IdFormat[]; problems: string[] } {
  const formats: IdFormat[] = [];
  const problems: string[] = [];
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line, i) => {
      const [country = "", kind = "", pattern = "", hint = "", eg = ""] = line
        .split("|")
        .map((x) => x.trim());
      const cc = country.toUpperCase();
      const k = kind.toLowerCase();
      if (!/^[A-Z]{2}$/.test(cc)) problems.push(`Line ${i + 1}: a two-letter country (BE).`);
      else if (k !== "vat" && k !== "eori") problems.push(`Line ${i + 1}: "vat" or "eori".`);
      else if (!patternOk(pattern))
        problems.push(`Line ${i + 1}: a pattern that compiles, 80 characters at most.`);
      else if (!hint || hint.length > 80)
        problems.push(`Line ${i + 1}: what the country expects, in words.`);
      else if (!eg || eg.length > 30) problems.push(`Line ${i + 1}: an example number.`);
      else if (formats.some((f) => f.country === cc && f.kind === k))
        problems.push(`Line ${i + 1}: ${cc} ${k} twice.`);
      else formats.push({ country: cc, kind: k, pattern, hint, eg });
    });
  return { formats, problems };
}
