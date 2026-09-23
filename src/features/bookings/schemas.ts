import { z } from "zod";
import { parseYmd } from "@/domain/dates";
import { containerNumberOk } from "@/domain/container";
import { BOOKING_FLOW, DOC_TYPES, SHIPMENT_KINDS, sailingProblem } from "@/domain/shipments";

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

const party = z.uuid("Choose a contact").optional();
const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time as HH:MM")
  .optional();

/** The editable part of a booking. The ref, client and status have their own paths. */
export const bookingDetailsSchema = z
  .object({
    id: z.uuid(),
    version: z.coerce.number().int().positive(),
    kind: z.enum(SHIPMENT_KINDS),
    payerId: party,
    shipperId: party,
    consigneeId: party,
    notifyId: party,
    pol: optional,
    pod: optional,
    loadAddress: z.string().max(500).optional(),
    loadDate: day.optional(),
    loadTime: time,
    commodity: optional,
    carrierBookingNo: optional,
    blNo: optional,
    docType: z.enum(DOC_TYPES).default("SEA WAYBILL"),
    vesselName: optional,
    voyage: optional,
    etd: day.optional(),
    eta: day.optional(),
    customsClosing: day.optional(),
    vgmClosing: day.optional(),
    siClosing: day.optional(),
    portCutOff: day.optional(),
  })
  .superRefine((v, ctx) => {
    const p = sailingProblem(v.etd ?? null, v.eta ?? null);
    if (p) ctx.addIssue({ code: "custom", path: ["eta"], message: p });
  });

/** Fields of the details form that a person may empty (see nullMissing). */
export const CLEARABLE_DETAILS = [
  "payerId",
  "shipperId",
  "consigneeId",
  "notifyId",
  "pol",
  "pod",
  "loadAddress",
  "loadDate",
  "loadTime",
  "commodity",
  "carrierBookingNo",
  "blNo",
  "vesselName",
  "voyage",
  "etd",
  "eta",
  "customsClosing",
  "vgmClosing",
  "siClosing",
  "portCutOff",
] as const;

const kg = z.coerce.number().int().min(0, "Kilograms, 0 or more").max(100_000).optional();

export const containerSchema = z.object({
  id: z.uuid(),
  bookingId: z.uuid(),
  version: z.coerce.number().int().positive(),
  type: z.string().min(2).max(10),
  number: z
    .string()
    .transform((s) => s.replace(/\s+/g, "").toUpperCase())
    .refine(containerNumberOk, "Not a valid ISO 6346 number (check digit)")
    .optional(),
  seals: z
    .string()
    .max(300)
    .optional()
    .transform((s) =>
      (s ?? "")
        .split(/[,\n]/)
        .map((x) => x.trim())
        .filter(Boolean),
    ),
  tareKg: kg,
  cargoKg: kg,
});

export const addContainerSchema = z.object({
  bookingId: z.uuid(),
  type: z.string().min(2).max(10),
});

export const removeContainerSchema = z.object({
  id: z.uuid(),
  bookingId: z.uuid(),
  version: z.coerce.number().int().positive(),
  reason: z.string().min(3, "Say why").max(500),
});
