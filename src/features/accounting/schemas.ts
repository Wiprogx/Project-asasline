import { z } from "zod";
import { VAT_CODES } from "@/domain/accounting";
import { toCents } from "@/domain/money";
import { DIFF_ACCOUNTS, type DiffAccount, PAYMENT_METHODS } from "@/domain/payments";

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

export const registerPaymentSchema = z.object({
  invoiceId: z.uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date as YYYY-MM-DD"),
  amount: z.string().transform((v, ctx) => {
    const c = toCents(v);
    if (c === null || c <= 0) ctx.addIssue({ code: "custom", message: "An amount above zero" });
    return c ?? 0;
  }),
  method: z.enum(PAYMENT_METHODS).default("bank"),
  reference: z.string().max(200).optional(),
  writeOff: z.enum(Object.keys(DIFF_ACCOUNTS) as [DiffAccount, ...DiffAccount[]]).optional(),
});

export const reversePaymentSchema = z.object({
  id: z.uuid(),
  version: z.coerce.number().int().positive(),
  reason: z.string().min(3, "Say why the payment is reversed").max(500),
});

export const matchLineSchema = z.object({ lineId: z.uuid(), invoiceId: z.uuid() });

export const ignoreLineSchema = z.object({
  lineId: z.uuid(),
  reason: z.string().min(3, "Say why the line needs no match").max(300),
});

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date as YYYY-MM-DD");

export const newBillSchema = z.object({
  supplierId: z.uuid("Choose the supplier"),
  bookingId: z.uuid().optional(),
});

/** Recording a supplier's bill: their own number, the date on it, when it is due. */
export const recordBillSchema = z.object({
  id: z.uuid(),
  version: z.coerce.number().int().positive(),
  supplierRef: z.string().min(1, "The supplier's invoice number").max(60),
  billDate: isoDay,
  dueDate: isoDay,
});

export const approveBillSchema = z.object({
  id: z.uuid(),
  version: z.coerce.number().int().positive(),
});

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "A date");

export const fileVatSchema = z.object({
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2]|Q[1-4])$/, "A VAT period"),
});

export const closeBooksSchema = z.object({ through: day });

export const reminderSchema = z.object({
  id: z.uuid(),
  toText: z.string().trim().min(3, "Who it goes to").max(300),
  subject: z.string().trim().min(1, "A subject").max(300),
  body: z.string().trim().min(1, "The message").max(10_000),
});

export const sepaFileSchema = z.object({
  ids: z.array(z.uuid()).min(1, "Tick at least one bill"),
  executionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "A date"),
});

export const sepaCancelSchema = z.object({
  id: z.uuid(),
  reason: z.string().trim().min(3, "Why? It stays on the record.").max(500),
});

export const assetYearsSchema = z.object({
  id: z.uuid(),
  version: z.coerce.number().int().positive(),
  years: z.coerce.number().int().min(1, "At least one year").max(50, "At most 50 years"),
});

export const assetDisposeSchema = z.object({
  id: z.uuid(),
  version: z.coerce.number().int().positive(),
  disposedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "A date"),
  note: z.string().trim().min(3, "What happened to it?").max(300),
});
