import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { DEFAULT_PAYMENT_TERMS } from "@/domain/accounting";
import { cached } from "./cache/cache";
import { db } from "./db/client";
import { configTables } from "./db/schema";

const termSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    rule: z.string(),
    days: z.number().int().optional(),
  }),
);
export type PaymentTerm = z.infer<typeof termSchema>[number];

/** Payment terms (a Settings table seeded with the legacy list). */
export function readPaymentTerms(): Promise<PaymentTerm[]> {
  return cached(
    "config:paymentTerms",
    { ttlSeconds: 600, tags: ["config:paymentTerms"] },
    async () => {
      const [row] = await db
        .select()
        .from(configTables)
        .where(eq(configTables.name, "paymentTerms"));
      const parsed = row ? termSchema.safeParse(row.value) : null;
      return parsed?.success ? parsed.data : DEFAULT_PAYMENT_TERMS.map((t) => ({ ...t }));
    },
  );
}
