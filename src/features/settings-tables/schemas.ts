import { z } from "zod";
import { VAT_PERIODS } from "@/domain/accounting-settings";
import { centsField } from "@/lib/zod-fields";

/** The books' two figures, saved against the version read (invariant 6). */
export const booksSettingsSchema = z.object({
  version: z.coerce.number().int().min(0),
  approveOver: centsField("Approval from"),
  vatPeriod: z.enum(VAT_PERIODS),
  parallelUntil: z
    .string()
    .optional()
    .transform((v) => v || null)
    .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), "A day as YYYY-MM-DD"),
});

/** A counter moved forward: the series' key and what its last issued number becomes. */
export const raiseSequenceSchema = z.object({
  key: z.string().min(1, "Choose a series").max(40),
  value: z.coerce.number().int().min(1, "A whole number, 1 or more").max(99_999_999),
});
