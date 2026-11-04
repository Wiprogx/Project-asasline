import { z } from "zod";
import { rateItemSchema } from "./schemas";

/**
 * A copy of a catalogue item: the same leg or service, with its own carrier, prices and rate
 * source (legacy: the same destination with two carriers is two rate items).
 */
export const duplicateRateItemSchema = rateItemSchema
  .pick({ carrierId: true, sellCents: true, buyCents: true, rateType: true })
  .extend({ id: z.uuid() });
