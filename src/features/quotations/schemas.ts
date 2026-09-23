import { z } from "zod";
import { VAT_CODES } from "@/domain/accounting";
import { parseYmd } from "@/domain/dates";
import { toCents } from "@/domain/money";

const amount = (label: string) =>
  z.string().transform((v, ctx) => {
    const c = toCents(v);
    if (c === null)
      ctx.addIssue({ code: "custom", message: `${label}: an amount like 1250 or 1250.00` });
    return c ?? 0;
  });

/** A first quotation: one destination, one all-inclusive line. More routes/lines come in the editor. */
export const newQuotationSchema = z.object({
  clientId: z.uuid("Choose the customer"),
  validUntil: z
    .string()
    .refine((s) => parseYmd(s) !== null, "Date as YYYY-MM-DD")
    .optional(),
  pol: z.string().min(2, "Port of loading").max(10),
  pod: z.string().min(2, "Port of discharge").max(10),
  finalPlace: z.string().max(200).optional(),
  containerType: z.string().min(2).max(10).default("40HC"),
  description: z.string().min(1, "Describe the service").max(300),
  sell: amount("Sell"),
  cost: amount("Cost").optional(),
  vatCode: z.enum(VAT_CODES.map((v) => v.code) as [string, ...string[]]).default("EX41"),
});

export const quotationRef = z.object({
  id: z.uuid(),
  version: z.coerce.number().int().positive(),
});
