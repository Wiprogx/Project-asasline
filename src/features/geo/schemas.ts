import { z } from "zod";
import { parseAliases } from "@/domain/ports";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

const ref = { id: z.uuid(), version: z.coerce.number().int().positive() };
const reason = z.string().trim().min(3, "Say why — it stays on the record").max(500);

/** A country's words: the office's name for it, its dial code and the language written there. */
const countryDetails = {
  name: z.string().trim().min(2, "Name the country").max(80),
  dial: z
    .string()
    .trim()
    .optional()
    .transform((v) => v ?? "")
    .refine((v) => v === "" || /^\+\d{1,4}$/.test(v), "A dial code like +32, or nothing"),
  lang: z
    .string()
    .trim()
    .transform((v) => v.toLowerCase())
    .refine((v) => /^[a-z]{2}$/.test(v), "A language as two letters, e.g. fr"),
};

export const createCountrySchema = z.object({
  code: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .refine((v) => /^[A-Z]{2}$/.test(v), "The ISO code: two letters, e.g. XK"),
  ...countryDetails,
});
export const updateCountrySchema = z.object({ ...ref, ...countryDetails });

/** A city's words; its country is the page's and stays. */
const cityDetails = {
  name: z.string().trim().min(1, "Name the city").max(120),
  region: optionalText(120),
  aliases: z
    .string()
    .max(4000)
    .optional()
    .transform((v) => parseAliases(v ?? "")),
  notes: optionalText(1000),
};

export const createCitySchema = z.object({
  country: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .refine((v) => /^[A-Z]{2}$/.test(v), "The country's code"),
  ...cityDetails,
});
export const updateCitySchema = z.object({ ...ref, ...cityDetails });

export const archiveSchema = z.object({ ...ref, reason });
export const restoreSchema = z.object(ref);

/** A city typed wrong, merged into the right one of the same country. */
export const mergeCitySchema = z.object({ ...ref, intoId: z.uuid("Pick the city to merge into") });
