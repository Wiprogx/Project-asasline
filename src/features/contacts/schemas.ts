import { z } from "zod";
import { CONTACT_TYPES, LANGUAGES } from "@/domain/contacts";
import { ibanOk } from "@/domain/iban";
import { toCents } from "@/domain/money";

const optional = z.string().max(500).optional();

export const contactSchema = z.object({
  name: z.string().min(1, "A contact needs a name").max(200),
  type: z.enum(CONTACT_TYPES).default("company"),
  country: z
    .string()
    .regex(/^[A-Za-z]{2}$/, "Two-letter ISO code, e.g. BE")
    .transform((c) => c.toUpperCase())
    .optional(),
  lang: z.enum(LANGUAGES).default("en"),
  vat: optional,
  eori: optional,
  phone: optional,
  mobile: optional,
  whatsapp: optional,
  email: z.email("Not a valid email").optional(),
  website: optional,
  street: optional,
  zip: optional,
  city: optional,
  note: z.string().max(5000).optional(),
  paymentTermId: optional,
  usesLastPrice: z
    .string()
    .optional()
    .transform((v) => v === "on"),
  creditLimit: z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (v === undefined) return null;
      const c = toCents(v);
      if (c === null) ctx.addIssue({ code: "custom", message: "Amount like 5000 or 5000.00" });
      return c;
    }),
});

export type ContactInput = z.infer<typeof contactSchema>;

export const versionRef = z.object({
  id: z.uuid(),
  version: z.coerce.number().int().positive(),
});

export const archiveSchema = versionRef.extend({
  reason: z.string().min(3, "Say why — it stays on the record").max(500),
});

export const bankAccountSchema = z.object({
  contactId: z.uuid(),
  iban: z
    .string()
    .transform((v) => v.replace(/\s+/g, "").toUpperCase())
    .refine(ibanOk, "Not a valid IBAN"),
  bic: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{8}([A-Za-z0-9]{3})?$/, "8 or 11 letters and digits")
    .transform((v) => v.toUpperCase())
    .optional(),
  label: z.string().trim().max(100).optional(),
});

export const bankAccountArchiveSchema = z.object({
  id: z.uuid(),
  contactId: z.uuid(),
  reason: z.string().trim().min(3, "Why? It stays on the record.").max(500),
});
