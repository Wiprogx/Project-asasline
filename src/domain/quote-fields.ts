/**
 * What the printed quotation shows (legacy QUOTE_FIELDS): a Settings table of switches. The
 * office decides once; every quotation printed after that obeys.
 */
export const QUOTE_FIELD_KEYS = [
  "price",
  "services",
  "freetime",
  "validity",
  "contact",
  "terms",
] as const;
export type QuoteFieldKey = (typeof QUOTE_FIELD_KEYS)[number];

export const QUOTE_FIELD_LABEL: Record<QuoteFieldKey, string> = {
  price: "The price",
  services: "What is included",
  freetime: "Free time terms",
  validity: "Valid until",
  contact: "Sales contact",
  terms: "VAT note",
};

export type QuoteFields = Record<QuoteFieldKey, boolean>;

export const DEFAULT_QUOTE_FIELDS: QuoteFields = {
  price: true,
  services: true,
  freetime: true,
  validity: true,
  contact: true,
  terms: true,
};
