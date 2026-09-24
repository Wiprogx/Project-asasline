import { z } from "zod";
import { VAT_CODES } from "@/domain/accounting";
import { toCents } from "@/domain/money";
import { QUOTATION_DISPLAYS } from "@/domain/quotation-doc";

/** Every editor action names the quotation and the version the person read (invariant 6). */
const onQuotation = {
  quotationId: z.uuid(),
  version: z.coerce.number().int().positive(),
};

const amount = (label: string) =>
  z.string().transform((v, ctx) => {
    const c = toCents(v);
    if (c === null || c < 0)
      ctx.addIssue({ code: "custom", message: `${label}: an amount like 1250 or 1250.00` });
    return c ?? 0;
  });

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

const port = (label: string) =>
  z
    .string()
    .trim()
    .min(2, label)
    .max(10)
    .transform((v) => v.toUpperCase());

const reason = z.string().trim().min(3, "Say why — it stays on the record").max(300);

/** A destination: from an ocean leg of the catalogue, or its ports typed in. */
export const addRouteSchema = z.object({
  ...onQuotation,
  laneId: z
    .string()
    .optional()
    .transform((v) => v || null)
    .pipe(z.uuid().nullable()),
  pol: port("Port of loading").optional(),
  pod: port("Port of discharge").optional(),
  finalPlace: text(200),
  containerType: text(10),
});

export const updateRouteSchema = z.object({
  ...onQuotation,
  routeId: z.uuid(),
  pol: port("Port of loading"),
  pod: port("Port of discharge"),
  finalPlace: text(200),
  containerType: text(10),
});

export const declineRouteSchema = z.object({ ...onQuotation, routeId: z.uuid(), reason });
export const restoreRouteSchema = z.object({ ...onQuotation, routeId: z.uuid() });

const qty = z.coerce.number().int().min(1, "At least 1").max(999).default(1);
const vatCode = z.enum(VAT_CODES.map((v) => v.code) as [string, ...string[]]);

/** A line from the catalogue (priced for the customer), or typed with its own price. */
export const addLineSchema = z.object({
  ...onQuotation,
  routeId: z.uuid(),
  itemId: z
    .string()
    .optional()
    .transform((v) => v || null)
    .pipe(z.uuid().nullable()),
  description: text(300),
  qty,
  sellCents: amount("Sell").optional(),
  costCents: amount("Cost").optional(),
  vatCode: vatCode.optional(),
});

/** Cost is optional: a role that cannot see costs leaves it as it was. */
export const updateLineSchema = z.object({
  ...onQuotation,
  lineId: z.uuid(),
  description: z.string().trim().min(1, "Describe the service").max(300),
  qty,
  sellCents: amount("Sell"),
  costCents: amount("Cost").optional(),
  vatCode,
});

export const removeLineSchema = z.object({ ...onQuotation, lineId: z.uuid(), reason });

export const displaySchema = z.object({ ...onQuotation, display: z.enum(QUOTATION_DISPLAYS) });
export const listedSchema = z.object({ ...onQuotation, lineId: z.uuid() });

/** The letter as the person left it: who to, how, and the text they read before sending. */
export const sendSchema = z.object({
  ...onQuotation,
  channel: z.enum(["email", "whatsapp"]),
  toText: z.string().trim().min(3, "Who it goes to").max(200),
  subject: z.string().trim().min(1, "A subject").max(200),
  body: z.string().trim().min(1, "The message").max(5000),
});
