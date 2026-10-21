import { z } from "zod";
import { HAND_STATUSES } from "@/domain/quotation-status";
import { SHIPMENT_KINDS } from "@/domain/shipments";
import { dayField } from "@/lib/zod-fields";
import { quotationRef } from "./schemas";

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

/** The quotation's own fields (legacy editQ); destinations and lines live in the editor. */
export const editQuotationSchema = quotationRef.extend({
  clientId: z.uuid("Choose the customer"),
  kind: z.enum(SHIPMENT_KINDS),
  commodity: text(200),
  docType: text(60),
  validUntil: dayField()
    .optional()
    .transform((v) => v ?? null),
  paymentTermId: text(40),
  note: text(2000),
});

export const quotationStatusSchema = quotationRef.extend({ status: z.enum(HAND_STATUSES) });

/** Rejected or cancelled: the reason stays on the record. */
export const quotationReasonSchema = quotationRef.extend({
  reason: z.string().trim().min(3, "Give a reason").max(500),
});
