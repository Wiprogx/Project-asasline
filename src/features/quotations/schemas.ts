import { z } from "zod";
import { ROUTE_SERVICES } from "@/domain/route-service";
import { dayField } from "@/lib/zod-fields";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const optionalDay = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable()
  .optional()
  .transform((v) => v ?? null);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => v || null);
const optionalId = z
  .uuid()
  .nullable()
  .optional()
  .transform((v) => v ?? null);

/** A stop: one of the customer's places, and when the truck calls there. */
const stop = z.object({
  contactId: z.uuid("Pick the stop's address"),
  date: optionalDay,
  time: z
    .string()
    .regex(TIME, "The hour as HH:MM")
    .nullable()
    .optional()
    .transform((v) => v ?? null),
});

/** One product shipped: its HS code and, when the list has none, its words. */
const commodity = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{4,10}$/, "An HS code: 4 to 10 digits"),
  description: z
    .string()
    .trim()
    .max(200)
    .nullable()
    .optional()
    .transform((v) => v || null),
});

/** A container of the destination: its own mode, address and stops, and its HS rows. */
const box = z.object({
  loadingMode: optionalText(80),
  loadAddressId: optionalId,
  stops: z.array(stop).max(10).default([]),
  hs: z.array(commodity).max(30).default([]),
});

/** One destination (legacy fQ): an ocean leg of the catalogue, its service and its loading. */
export const destinationSchema = z
  .object({
    laneId: z.uuid("Pick an ocean leg"),
    service: z.enum(ROUTE_SERVICES).default("port_port"),
    boxes: z.coerce.number().int().min(1, "At least one container").max(50).default(1),
    loadingMode: optionalText(80),
    loadAddressId: optionalId,
    stops: z.array(stop).max(10).default([]),
    /** One per container: what it carries, and — two or more — its own loading. */
    boxDetails: z.array(box).max(50).default([]),
  })
  .refine(
    (d) =>
      d.service !== "door_port" ||
      (d.boxes > 1 ? d.boxDetails.every((b) => b.loadAddressId) : d.loadAddressId),
    {
      path: ["loadAddressId"],
      message: "A door service needs its loading address — for every box asked separately",
    },
  );
export type DestinationInput = z.infer<typeof destinationSchema>;

/** A field the form posts as JSON (the destinations, the commodities). */
const json = <T extends z.ZodType>(schema: T) =>
  z
    .string()
    .optional()
    .transform((v, ctx) => {
      try {
        return JSON.parse(v || "[]") as unknown;
      } catch {
        ctx.addIssue({ code: "custom", message: "Could not read the form; reload the page." });
        return z.NEVER;
      }
    })
    .pipe(schema);

/**
 * A new quotation (legacy fQ): the customer, the direction and the document asked for, one or
 * more destinations each built from an ocean leg — each container with what it carries — the
 * validity and the terms.
 * Every line comes from the catalogue; more are added in the editor.
 */
export const newQuotationSchema = z.object({
  clientId: z.uuid("Choose the customer"),
  kind: z.enum(["export", "import"]).default("export"),
  /** A row of Settings › Lists › Document types; none: SEA WAYBILL. */
  docTypeId: z
    .string()
    .optional()
    .transform((v) => v || null)
    .pipe(z.uuid().nullable()),
  validUntil: dayField().optional(),
  paymentTermId: z
    .string()
    .max(40)
    .optional()
    .transform((v) => v || null),
  destinations: json(z.array(destinationSchema).min(1, "Add at least one destination").max(20)),
});

export const quotationRef = z.object({
  id: z.uuid(),
  version: z.coerce.number().int().positive(),
});

/** Accepting one destination: it becomes its own booking. */
export const acceptRouteSchema = quotationRef.extend({ routeId: z.uuid() });
