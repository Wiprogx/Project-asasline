import { z } from "zod";
import { containerNumberOk } from "@/domain/container";
import { BOOKING_FLOW, SHIPMENT_KINDS, sailingProblem } from "@/domain/shipments";
import { dayField } from "@/lib/zod-fields";
import { parseHsLines } from "@/domain/goods";
import { snapQuarterHour } from "@/domain/moments";
import { parseEmails } from "@/domain/messages";
import { PORT_CODE } from "@/domain/ports";

const day = dayField();
const optional = z.string().max(200).optional();

/** A port of Settings › Ports by its UN/LOCODE; one the table lacks is added to it. */
const port = z
  .string()
  .trim()
  .max(10)
  .optional()
  .transform((v) => v?.toUpperCase() || undefined)
  .refine((v) => v === undefined || PORT_CODE.test(v), "A UN/LOCODE, e.g. BEANR");

export const newBookingSchema = z.object({
  clientId: z.uuid("Choose the customer"),
  kind: z.enum(SHIPMENT_KINDS).default("export"),
  pol: port,
  pod: port,
  /** The customer's place the boxes are loaded at (domain/load-place). */
  loadAddressId: z.uuid().optional(),
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
  /** A row of Settings › Cancel reasons still offered (checked in the action). */
  reasonId: z.uuid("Choose a reason"),
});

export const restoreSchema = cancelSchema.omit({ reasonId: true });

const party = z.uuid("Choose a contact").optional();
/** An hour of the day, "HH:MM", kept to the quarter hour (domain/moments). */
const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time as HH:MM")
  .optional()
  .transform((v) => (v ? snapQuarterHour(v) : v));

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
    // The office's counterparts on the file (domain/booking-parties OFFICE_PARTIES).
    docCheckId: party,
    shippingCoId: party,
    transporterId: party,
    destForwarderId: party,
    forwarderId: party,
    customsAgentId: party,
    // Where the empty box is collected and the full one delivered: locations linked under the
    // line with the Depot or Terminal role (domain/line-places); a booking from before keeps its words.
    pickupDepotId: party,
    terminalId: party,
    pol: port,
    pod: port,
    commodity: optional,
    carrierBookingNo: optional,
    blNo: optional,
    /** Copied on every message of the booking (legacy cc), typed comma-separated. */
    cc: z.string().max(1000).optional().transform(parseEmails),
    // From Settings › Lists › Document types; the form offers the list, the row keeps what was chosen.
    /** A row of Settings › Lists › Document types. */
    docTypeId: z.uuid("Choose a document"),
    vesselName: optional,
    voyage: optional,
    // Each moment a day and the hour beside it (domain/moments), posted as one field.
    etd: day.optional(),
    etdTime: time,
    eta: day.optional(),
    etaTime: time,
    customsClosing: day.optional(),
    customsClosingTime: time,
    vgmClosing: day.optional(),
    vgmClosingTime: time,
    siClosing: day.optional(),
    siClosingTime: time,
    portCutOff: day.optional(),
    portCutOffTime: time,
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
  "docCheckId",
  "shippingCoId",
  "transporterId",
  "destForwarderId",
  "forwarderId",
  "customsAgentId",
  "pickupDepotId",
  "terminalId",
  "pol",
  "pod",
  "commodity",
  "carrierBookingNo",
  "blNo",
  "vesselName",
  "voyage",
  "etd",
  "etdTime",
  "eta",
  "etaTime",
  "customsClosing",
  "customsClosingTime",
  "vgmClosing",
  "vgmClosingTime",
  "siClosing",
  "siClosingTime",
  "portCutOff",
  "portCutOffTime",
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
  // The empty box — this box only: its depot (a contact) and the day it is collected.
  pickupDepotId: party,
  pickupDate: day.optional(),
  // Loading — this box only (domain/loading): nothing is inherited between boxes. The loading
  // address is a place (domain/load-place); its words are written from the contact.
  loadAddressId: party,
  loadDate: day.optional(),
  loadTime: time,
  loadingMode: z.string().max(80).optional(),
  transporterId: z.uuid().optional(),
  loadEndDate: day.optional(),
  loadEndTime: time,
  pickBackDate: day.optional(),
  pickBackTime: time,
  // Goods in this container (domain/goods): the lines' totals win over the box's own figures.
  hsLines: z
    .string()
    .max(10_000)
    .optional()
    .transform((v, ctx) => {
      const { lines, problem } = parseHsLines(v ?? "");
      if (problem) {
        ctx.addIssue({ code: "custom", message: problem });
        return z.NEVER;
      }
      return lines;
    }),
  packages: z.coerce.number().int().min(0, "Packages, 0 or more").max(1_000_000).optional(),
  packageType: z.string().max(60).optional(),
  blDescription: z.string().max(2000).optional(),
});

/**
 * The extra stops of a box as its form posts them, one row each (`formRows`): a place of the
 * customer or any other location — a stop is a place, never typed words — when the truck is
 * expected there, how the box is handled there and, dropped there, when it is picked back. Ten
 * at most; a row is dropped only by its Remove button, never by being empty.
 */
export const containerStopsSchema = z
  .array(
    z.object({
      stopPlaceId: z.uuid("Choose a place for every stop, or remove it"),
      stopDate: day.optional(),
      stopTime: time,
      stopMode: z.string().max(80).optional(),
      stopPickBackDate: day.optional(),
      stopPickBackTime: time,
    }),
  )
  .max(10, "Ten stops at most");

/** Where the shipment stands for the consignee; a hold says who asked and what must happen. */
export const releaseSchema = z.object({
  id: z.uuid(),
  version: z.coerce.number().int().positive(),
  release: z.string().min(1, "Choose a state").max(32),
  releaseById: z.uuid().optional(),
  releaseNote: z.string().max(300).optional(),
});

/** One milestone of the journey, by its position, ticked or unticked. */
export const trackStepSchema = z.object({
  id: z.uuid(),
  version: z.coerce.number().int().positive(),
  index: z.coerce.number().int().min(0).max(50),
  place: z.string().max(120).optional(),
});

/** How the original papers travel. */
export const originalsSchema = z.object({
  id: z.uuid(),
  version: z.coerce.number().int().positive(),
  // Step 1 (legacy blPickAddr, sendRequestedAt): where the courier collects them, booked when.
  originalsPickup: z.string().trim().max(200).optional(),
  originalsRequestedOn: day.optional(),
  docReceiverId: z.uuid().optional(),
  sendMode: z.string().max(60).optional(),
  sendDate: day.optional(),
  sendTracking: z.string().max(80).optional(),
});

/** Fields of a box a person may empty (see nullMissing). */
export const CLEARABLE_CONTAINER = [
  "number",
  "tareKg",
  "cargoKg",
  "pickupDepotId",
  "pickupDate",
  "loadAddressId",
  "loadDate",
  "loadTime",
  "loadingMode",
  "transporterId",
  "loadEndDate",
  "loadEndTime",
  "pickBackDate",
  "pickBackTime",
  "packages",
  "blDescription",
] as const;

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
