import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { DEFAULT_PAYMENT_TERMS } from "@/domain/accounting";
import { cached } from "./cache/cache";
import { db } from "./db/client";
import { configTables } from "./db/schema";
import { TERM_RULES } from "@/domain/accounting-settings";

const NAME = "paymentTerms";
export const PAYMENT_TERMS_TAG = `config:${NAME}`;

export const paymentTermsSchema = z
  .array(
    z.object({
      id: z.string().regex(/^[a-z][a-z0-9_]{0,30}$/),
      name: z.string().trim().min(1).max(80),
      rule: z.enum(TERM_RULES),
      days: z.number().int().min(0).max(365).optional(),
    }),
  )
  .min(1)
  .max(40);
const termSchema = paymentTermsSchema;
export type PaymentTerm = z.infer<typeof termSchema>[number];

export async function readPaymentTermsForEdit() {
  const [row] = await db.select().from(configTables).where(eq(configTables.name, NAME));
  const parsed = row ? termSchema.safeParse(row.value) : null;
  return {
    terms: parsed?.success ? parsed.data : DEFAULT_PAYMENT_TERMS.map((t) => ({ ...t })),
    version: row?.version ?? 0,
  };
}

/** Payment terms (a Settings table seeded with the legacy list). */
export function readPaymentTerms(): Promise<PaymentTerm[]> {
  return cached(NAME, { ttlSeconds: 600, tags: [PAYMENT_TERMS_TAG] }, async () => {
    const [row] = await db.select().from(configTables).where(eq(configTables.name, "paymentTerms"));
    const parsed = row ? termSchema.safeParse(row.value) : null;
    return parsed?.success ? parsed.data : DEFAULT_PAYMENT_TERMS.map((t) => ({ ...t }));
  });
}
