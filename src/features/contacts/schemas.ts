import { z } from "zod";
import { CONTACT_TYPES, idClean, type IdFormat, idProblem, LANGUAGES } from "@/domain/contacts";
import { ibanOk } from "@/domain/iban";
import { toCents } from "@/domain/money";
import { parseCommaList } from "@/domain/lookups";
import { CONTACT_KINDS } from "@/domain/contact-list";

const optional = z.string().max(500).optional();
/** The column is a four-byte integer: about 21.4 million euros, in cents. */
const MAX_CREDIT_CENTS = 2_147_483_647;

export const contactSchema = z.object({
  /** A company's or a location's name; a person's is built from the first and last names. */
  name: z.string().trim().max(200).optional(),
  /** A row of Settings › Lists › Salutations. */
  salutationId: z.uuid().optional(),
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
  jobTitle: optional,
  passportNumber: optional,
  /** A location's site: its code at the carrier or terminal, opening hours, access remarks. */
  siteRef: optional,
  openingHours: optional,
  instructions: z.string().max(2000).optional(),
  type: z.enum(CONTACT_TYPES).default("company"),
  /** No longer on the form: a saved kind stays, a new contact takes the column's default. */
  kind: z.enum(CONTACT_KINDS).optional(),
  country: z
    .string()
    .regex(/^[A-Za-z]{2}$/, "Two-letter ISO code, e.g. BE")
    .transform((c) => c.toUpperCase())
    .optional(),
  // Empty on a new contact: the language follows the country (Settings › Countries).
  lang: z
    .enum(LANGUAGES)
    .or(z.literal(""))
    .optional()
    .transform((v) => v || undefined),
  vat: optional.transform((v) => (v === undefined ? v : idClean(v) || undefined)),
  eori: optional.transform((v) => (v === undefined ? v : idClean(v) || undefined)),
  phone: optional,
  mobile: optional,
  whatsapp: optional,
  email: z.email("Not a valid email").max(254).optional(),
  website: optional,
  street: optional,
  zip: optional,
  /** A city of the contact's country (Settings › Countries), picked from its list. */
  cityId: z.uuid("Pick the city from the list").optional(),
  note: z.string().max(5000).optional(),
  /** The trades, typed comma-separated against the professions list. */
  professions: z.string().max(1000).optional().transform(parseCommaList),
  /** Free labels, typed comma-separated against the contactTags list. */
  tags: z.string().max(500).optional().transform(parseCommaList),
  /** A Settings › Accounting term id, checked against the list on the server. */
  paymentTermId: z.string().max(40).optional(),
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
      else if (c < 0 || c > MAX_CREDIT_CENTS)
        ctx.addIssue({ code: "custom", message: "From 0 up to 21474836.47" });
      return c;
    }),
});

const REQUIRED = {
  vat: "A company needs its VAT number",
  eori: "A company needs its EORI number",
} as const;

type Raw = z.infer<typeof contactSchema>;
type Ctx = z.RefinementCtx;
const need = (ctx: Ctx, path: string, message: string) =>
  ctx.addIssue({ code: "custom", path: [path], message });

/** What each contact must carry: an address; a company its name, VAT, EORI and a profession; a location its name; a person a last name and a way to reach them. */
function requiredByType(c: Raw, ctx: Ctx) {
  // Every contact is written to or delivered to: an address is never optional (some countries have no postcode).
  if (!c.street) need(ctx, "street", "The street is needed");
  if (!c.cityId) need(ctx, "cityId", "The city is needed");
  if (!c.country) need(ctx, "country", "The country is needed");
  if (c.type === "company") {
    if (!c.name) need(ctx, "name", "A contact needs a name");
    for (const kind of ["vat", "eori"] as const) if (!c[kind]) need(ctx, kind, REQUIRED[kind]);
    if (!c.professions.length) need(ctx, "professions", "A company needs at least one profession");
    return;
  }
  if (c.type === "location") {
    if (!c.name) need(ctx, "name", "A location needs a name");
    return;
  }
  if (!c.lastName) need(ctx, "lastName", "A person needs a last name");
  if (!c.email && !c.phone && !c.mobile)
    need(ctx, "email", "A person needs an email or a phone number");
}

/** A person's name is "First Last"; a company's or a location's is typed. */
const settleName = (c: Raw) => ({
  ...c,
  name: c.type === "person" ? [c.firstName, c.lastName].filter(Boolean).join(" ") : (c.name ?? ""),
});

/** The numbers each type carries and has checked: a company VAT and EORI, a person a VAT given, a location none. */
const CHECKED = { company: ["vat", "eori"], person: ["vat"], location: [] } as const;

/** The contact with its VAT and EORI numbers checked against its country's formats (Settings › Number formats). */
export const checkedContactSchema = (formats?: readonly IdFormat[]) =>
  contactSchema
    .superRefine((c, ctx) => {
      requiredByType(c, ctx);
      // A number out of sight for the type is kept as it is, not checked.
      for (const kind of CHECKED[c.type]) {
        const problem = idProblem(c[kind], c.country, kind, formats);
        if (problem) need(ctx, kind, problem);
      }
    })
    .transform(settleName);

export type ContactInput = z.output<ReturnType<typeof checkedContactSchema>>;

/** Marking a number as checked against the register today. */
export const idCheckedSchema = z.object({ id: z.uuid(), kind: z.enum(["vat", "eori"]) });

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

/** A paper kept on the contact: its kind from Settings › Lists, a note if needed. */
export const contactFileSchema = z.object({
  contactId: z.uuid(),
  kind: z.string().trim().min(1, "What kind of paper").max(60),
  note: z.string().trim().max(300).optional(),
});

/** A paper of the contact's file sent by e-mail: where it is filed, to whom, with what words. */
export const sendContactFileSchema = z.object({
  contactId: z.uuid(),
  fileId: z.uuid(),
  where: z.enum(["contact", "booking", "invoice"]),
  to: z.email("Not a valid e-mail address"),
  cc: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((s) => (s ? s.split(/[\s,;]+/).filter(Boolean) : []))
    .pipe(z.array(z.email("A copy address is not valid")).max(10)),
  subject: z.string().trim().min(1, "A subject").max(200),
  body: z.string().trim().max(5000).default(""),
});

export const removeContactFileSchema = z.object({
  contactId: z.uuid(),
  fileId: z.uuid(),
  reason: z.string().trim().min(3, "Say why — it stays on the record").max(300),
});
