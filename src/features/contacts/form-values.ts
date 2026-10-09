/** The editable text fields of a contact, as the form reads them (money as "5000.00"). */
import { centsToInput } from "@/domain/money";
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
  professions?: string | null;
};

type ContactRecord = {
  id: string;
  version: number;
  creditLimitCents: number | null;
  professions?: string[];
} & Partial<Record<(typeof CONTACT_TEXT_FIELDS)[number], string | null>>;

export function toContactFormValues(c: ContactRecord): ContactFormValues {
  const out: ContactFormValues = { id: c.id, version: c.version };
  for (const k of CONTACT_TEXT_FIELDS) if (k !== "creditLimit") out[k] = c[k] ?? null;
  out.creditLimit = c.creditLimitCents === null ? null : centsToInput(c.creditLimitCents);
  out.professions = c.professions?.join(", ") ?? null;
  return out;
}
