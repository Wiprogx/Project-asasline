import { z } from "zod";
import { parseYmd } from "@/domain/dates";
import { BOOKING_FLOW, SHIPMENT_KINDS } from "@/domain/shipments";

const day = z.string().refine((s) => parseYmd(s) !== null, "Date as YYYY-MM-DD");
const optional = z.string().max(200).optional();

export const newBookingSchema = z.object({
  clientId: z.uuid("Choose the customer"),
  kind: z.enum(SHIPMENT_KINDS).default("export"),
  pol: optional,
  pod: optional,
  loadAddress: z.string().max(500).optional(),
  loadDate: day.optional(),
  commodity: optional,
  containerType: z.string().min(2).max(10).default("40HC"),
  containerCount: z.coerce.number().int().min(1, "At least one box").max(50),
});

export const statusSchema = z.object({
  id: z.uuid(),
  version: z.coerce.number().int().positive(),
  status: z.enum(BOOKING_FLOW),
});

export const cancelSchema = z.object({
  id: z.uuid(),
  version: z.coerce.number().int().positive(),
  reason: z.string().min(3, "Choose a reason").max(500),
});

export const restoreSchema = cancelSchema.omit({ reason: true });
