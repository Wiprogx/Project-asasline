import { z } from "zod";
import { centsField } from "@/lib/zod-fields";

/**
 * A charge raised from a booking onto its quotation's destination (legacy addExtraCharge): a
 * catalogue item, how many, the price (the catalogue's unless typed), every container or one
 * only, and why — the reason goes in both histories.
 */
export const raiseChargeSchema = z.object({
  quotationId: z.uuid(),
  version: z.coerce.number().int().positive(),
  routeId: z.uuid(),
  bookingId: z.uuid(),
  itemId: z.uuid("Pick a charge"),
  qty: z.coerce.number().int().min(1, "At least one").max(1000),
  sellCents: centsField("Sell").optional(),
  costCents: centsField("Buy").optional(),
  /** "all": every container (the line is per box); "one": charged once (legacy box pick). */
  appliesTo: z.enum(["all", "one"]).default("one"),
  reason: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((v) => v || null),
});
