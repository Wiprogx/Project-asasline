import { z } from "zod";
import { VAT_CODES } from "@/domain/accounting";
import { RATE_TYPES } from "@/domain/pricing";
import { toCents } from "@/domain/money";

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

const upper = (max: number) => text(max).transform((v) => v?.toUpperCase() ?? null);

const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "A date")
  .optional()
  .transform((v) => v ?? null);

const count = z
  .string()
  .optional()
  .transform((v) => (v === undefined ? null : Number(v)))
  .refine((v) => v === null || (Number.isInteger(v) && v >= 0 && v <= 365), "0 to 365 days");

const amount = (label: string) =>
  z.string({ error: `${label}: an amount` }).transform((v, ctx) => {
    const c = toCents(v);
    if (c === null || c < 0)
      ctx.addIssue({ code: "custom", message: `${label}: an amount like 1250 or 1250.00` });
    return c ?? 0;
  });

const version = z.coerce.number().int().positive();
const reason = z.string().trim().min(3, "Say why — it stays on the record").max(300);

export const rateItemSchema = z.object({
  category: z.string().regex(/^[a-z]{2,20}$/, "Choose a category"),
  name: text(120),
  pol: upper(10),
  pod: upper(10),
  country: upper(2).refine((v) => v === null || /^[A-Z]{2}$/.test(v), "Two letters, e.g. CM"),
  containerType: upper(10),
  carrier: text(60),
  transitDays: count,
  fromPlace: text(120),
  toPlace: text(120),
  docCode: upper(20),
  freeDays: count,
  sellCents: amount("Sell"),
  buyCents: amount("Buy"),
  vatCode: z.enum(VAT_CODES.map((v) => v.code) as [string, ...string[]]).default("EX41"),
  rateType: z.enum(RATE_TYPES).default("contract"),
  validUntil: day,
  note: text(300),
});

export const rateItemUpdateSchema = rateItemSchema.extend({ id: z.uuid(), version });

export const archiveSchema = z.object({ id: z.uuid(), reason });
export const restoreSchema = z.object({ id: z.uuid() });

export const priceListSchema = z.object({
  contactId: z.uuid("Choose the customer"),
  name: z.string().trim().min(2, "Name the agreement").max(120),
  validFrom: day,
  validUntil: day,
  active: z
    .string()
    .optional()
    .transform((v) => v !== "0"),
});

export const priceListUpdateSchema = priceListSchema.extend({ id: z.uuid(), version });

/** Sell and buy are optional: an empty one takes the catalogue's price. */
export const agreedPriceSchema = z.object({
  priceListId: z.uuid(),
  itemId: z.uuid("Pick an item from the catalogue"),
  sellCents: amount("Agreed sell").optional(),
  buyCents: amount("Agreed buy").optional(),
});

export const agreedPriceArchiveSchema = z.object({ id: z.uuid(), priceListId: z.uuid(), reason });
