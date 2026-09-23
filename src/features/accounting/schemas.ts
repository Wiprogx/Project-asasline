import { z } from "zod";
import { VAT_CODES } from "@/domain/accounting";
import { toCents } from "@/domain/money";

const ref = z.object({ id: z.uuid(), version: z.coerce.number().int().positive() });

/** Lines picked on the booking's Billing tab: every "qty:<sourceKey>" field with a quantity. */
export const fromBookingSchema = z.object({
  bookingId: z.uuid(),
  payerId: z.uuid("Choose who is invoiced"),
});

export function pickedLines(fd: FormData): { key: string; qty: number }[] {
  const out: { key: string; qty: number }[] = [];
  for (const [k, v] of fd.entries()) {
    if (!k.startsWith("qty:") || typeof v !== "string") continue;
    const qty = Number(v);
    if (Number.isInteger(qty) && qty > 0) out.push({ key: k.slice(4), qty });
  }
  return out;
}

export const blankDraftSchema = z.object({ customerId: z.uuid("Choose the customer") });

export const addLineSchema = ref.extend({
  description: z.string().min(2, "Describe the line").max(300),
  qty: z.coerce.number().int().min(1).max(10_000),
  unit: z.string().transform((v, ctx) => {
    const c = toCents(v);
    if (c === null) ctx.addIssue({ code: "custom", message: "An amount like 1250 or 1250.00" });
    return c ?? 0;
  }),
  vatCode: z.enum(VAT_CODES.map((v) => v.code) as [string, ...string[]]),
  account: z
    .string()
    .regex(/^\d{6}$/, "Six-digit account, e.g. 700000")
    .default("700000"),
});

export const removeLineSchema = ref.extend({ lineId: z.uuid() });

export const issueSchema = ref.extend({ paymentTermId: z.string().optional() });

export const discardSchema = ref.extend({
  reason: z.string().min(3, "Say why — it stays on the draft").max(500),
});

export const creditSchema = ref.extend({
  reason: z.string().min(3, "Say why the invoice is credited").max(500),
  redraft: z
    .string()
    .optional()
    .transform((v) => v === "on"),
});

export const listFilterSchema = z.object({
  status: z.enum(["draft", "issued", "discarded"]).optional().catch(undefined),
  kind: z.enum(["invoice", "credit"]).optional().catch(undefined),
  q: z.string().max(100).optional().catch(undefined),
});
