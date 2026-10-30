import { z } from "zod";
import { VAT_CODES } from "@/domain/accounting";
import { PORT_CODE } from "@/domain/ports";
import { centsField, dayField } from "@/lib/zod-fields";

const amount = (label: string) => centsField(label, { allowNegative: true });

/** A port of Settings › Ports by its UN/LOCODE; one the table lacks is added to it. */
const portField = (label: string) =>
  z
    .string()
    .trim()
    .min(2, label)
    .max(10)
    .transform((v) => v.toUpperCase())
    .refine((v) => PORT_CODE.test(v), `${label}: a UN/LOCODE, e.g. BEANR`);

/** A first quotation: one destination, one all-inclusive line. More routes/lines come in the editor. */
export const newQuotationSchema = z.object({
  clientId: z.uuid("Choose the customer"),
  kind: z.enum(["export", "import"]).default("export"),
  validUntil: dayField().optional(),
  pol: portField("Port of loading"),
  pod: portField("Port of discharge"),
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

/** Accepting one destination: it becomes its own booking. */
export const acceptRouteSchema = quotationRef.extend({ routeId: z.uuid() });
