/**
 * Accounting reference data (legacy VAT_CODES, PAYMENT_TERMS, EU_CC). Seed values for the
 * Settings tables; the running app reads the table, not these constants.
 */
export const VAT_CODES = [
  {
    code: "EX41",
    rate: 0,
    label: "0% · service linked to export (art. 41)",
    mention: "Exempt — article 41 of the Belgian VAT Code (services linked to the export of goods)",
  },
  {
    code: "RC",
    rate: 0,
    label: "0% · reverse charge, EU business customer",
    mention: "Reverse charge — article 196 of Directive 2006/112/EC (art. 21 §2 Belgian VAT Code)",
  },
  {
    code: "OUT",
    rate: 0,
    label: "0% · outside the scope, customer outside the EU",
    mention: "Outside the scope of Belgian VAT — article 21 §2 Belgian VAT Code",
  },
  { code: "S21", rate: 21, label: "21%" },
  { code: "S6", rate: 6, label: "6%" },
  { code: "S0", rate: 0, label: "0% · other" },
] as const;
export type VatCode = (typeof VAT_CODES)[number]["code"];

export const EU_COUNTRIES = [
  "AT",
  "BE",
  "BG",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "ES",
  "FI",
  "FR",
  "GR",
  "HR",
  "HU",
  "IE",
  "IT",
  "LT",
  "LU",
  "LV",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SE",
  "SI",
  "SK",
];

/**
 * Shipping charges are normally VAT-free: exempt for a Belgian customer on an export,
 * reverse charge for an EU business, outside the scope beyond the EU.
 */
export function defaultSaleVat(customerCountry: string | null | undefined): VatCode {
  const cc = (customerCountry ?? "").toUpperCase();
  if (!cc || cc === "BE") return "EX41";
  return EU_COUNTRIES.includes(cc) ? "RC" : "OUT";
}

export const DEFAULT_PAYMENT_TERMS = [
  { id: "immediate", name: "Immediate payment", rule: "days", days: 0 },
  { id: "d7", name: "7 days", rule: "days", days: 7 },
  { id: "d15", name: "15 days", rule: "days", days: 15 },
  { id: "d30", name: "30 days net", rule: "days", days: 30 },
  { id: "dap", name: "Documents against payment", rule: "docs" },
  { id: "before_confirm", name: "Before booking confirmation", rule: "before_confirm" },
  {
    id: "before_arrival",
    name: "Before the container arrives at the port of discharge",
    rule: "before_arrival",
  },
] as const;
