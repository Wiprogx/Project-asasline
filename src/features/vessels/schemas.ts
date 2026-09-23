import { z } from "zod";
import { VESSEL_STATUSES } from "@/domain/vessels";

const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "A date")
  .optional()
  .or(z.literal("").transform(() => undefined));

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

export const vesselSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "The ship's name")
    .max(100)
    .transform((v) => v.toUpperCase()),
  voyage: z.string().trim().min(1, "The voyage").max(40),
  imo: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || null)
    .refine((v) => v === null || /^\d{7}$/.test(v), "Seven digits"),
  carrier: text(60),
  service: text(80),
  pol: text(40),
  pod: text(40),
  etd: day.transform((v) => v ?? null),
  eta: day.transform((v) => v ?? null),
  atd: day.transform((v) => v ?? null),
  ata: day.transform((v) => v ?? null),
  status: z.enum(VESSEL_STATUSES).default("scheduled"),
});

export const vesselUpdateSchema = vesselSchema.extend({
  id: z.uuid(),
  version: z.coerce.number().int().positive(),
});

export const bookingVesselSchema = z.object({
  bookingId: z.uuid(),
  vesselId: z
    .string()
    .optional()
    .transform((v) => v || null)
    .pipe(z.uuid().nullable()),
});
