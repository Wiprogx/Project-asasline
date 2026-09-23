/** The editable text fields of a contact, as the form reads them (money as "5000.00"). */
export const CONTACT_TEXT_FIELDS = [
  "name",
  "type",
  "lang",
  "email",
  "phone",
  "mobile",
  "whatsapp",
  "vat",
  "eori",
  "street",
  "zip",
  "city",
  "country",
  "website",
  "creditLimit",
  "note",
] as const;

export type ContactFormValues = Partial<
  Record<(typeof CONTACT_TEXT_FIELDS)[number], string | null>
> & {
  id?: string;
  version?: number;
};

type ContactRecord = { id: string; version: number; creditLimitCents: number | null } & Partial<
  Record<(typeof CONTACT_TEXT_FIELDS)[number], string | null>
>;

export function toContactFormValues(c: ContactRecord): ContactFormValues {
  const out: ContactFormValues = { id: c.id, version: c.version };
  for (const k of CONTACT_TEXT_FIELDS) if (k !== "creditLimit") out[k] = c[k] ?? null;
  out.creditLimit = c.creditLimitCents === null ? null : (c.creditLimitCents / 100).toFixed(2);
  return out;
}
