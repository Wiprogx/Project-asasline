import { z } from "zod";
import { PORT_CODE } from "@/domain/ports";
import { VESSEL_STATUSES } from "@/domain/vessels";
import { optionalDayField } from "@/lib/zod-fields";

const day = optionalDayField("A date").transform((v) => v ?? undefined);

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

/** A port of Settings › Ports by its UN/LOCODE; one the table lacks is added to it. */
const port = text(10)
  .transform((v) => v?.toUpperCase() ?? null)
  .refine((v) => v === null || PORT_CODE.test(v), "A UN/LOCODE, e.g. BEANR");

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
  pol: port,
  pod: port,
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
