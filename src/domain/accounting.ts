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

/**
 * Where a supplier's bill line goes (legacy GL_ITEMS and the shipment cost category). A cost
 * bought for a shipment is 604000; the office's own costs have their own accounts; equipment
 * is an asset, depreciated, not a cost.
 */
export const PURCHASE_ACCOUNTS = [
  { account: "604000", label: "Shipment costs (bought for resale)" },
  { account: "610000", label: "Rent and charges" },
  { account: "611000", label: "IT and software" },
  { account: "612000", label: "Office supplies" },
  { account: "613000", label: "Accountant and legal fees" },
  { account: "614000", label: "Telephone and internet" },
  { account: "617000", label: "Vehicle costs" },
  { account: "619000", label: "Other services" },
  { account: "230000", label: "Equipment — to depreciate" },
] as const;

/** A bill from this amount (gross) needs a second person's approval before it is paid. */
export const APPROVAL_LIMIT_CENTS = 500_000;

export const needsApproval = (grossCents: number) => grossCents >= APPROVAL_LIMIT_CENTS;

/** Four eyes: whoever recorded a bill cannot be the one who approves it. */
export function approvalProblem(recordedBy: string | null, approverId: string): string | null {
  return recordedBy && recordedBy === approverId
    ? "A second person must approve this bill — not the one who recorded it."
    : null;
}

/** Paying a bill that needs approval and has none is refused. */
export function payProblem(bill: { grossCents: number; approvedAt: unknown }): string | null {
  return needsApproval(bill.grossCents) && !bill.approvedAt
    ? "This bill is €5,000 or more: a second person must approve it before it is paid."
    : null;
}
