import { z } from "zod";
import { centsField } from "@/lib/zod-fields";

const onTheFile = {
  quotationId: z.uuid(),
  version: z.coerce.number().int().positive(),
  routeId: z.uuid(),
  bookingId: z.uuid(),
};

/** Certiweight switched on from the booking (legacy "Add Certiweight"): the price and the cost. */
export const certiOnSchema = z.object({
  ...onTheFile,
  sellCents: centsField("Price").optional(),
  costCents: centsField("Cost").optional(),
});

/** Certiweight cancelled from the booking before any certificate is in, with why. */
export const certiOffSchema = z.object({
  ...onTheFile,
  lineId: z.uuid(),
  reason: z.string().trim().min(1, "Say why it is cancelled").max(300),
});
