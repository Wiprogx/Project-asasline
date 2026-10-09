import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { type BankRule, DEFAULT_BANK_RULES } from "@/domain/bank-rules";
import { cached } from "./cache/cache";
import { db } from "./db/client";
import { configTables } from "./db/schema";

const NAME = "bankRules";
export const BANK_RULES_TAG = `config:${NAME}`;

export const bankRulesSchema = z
  .array(
    z.object({
      match: z.string().min(1).max(200),
      account: z.string().regex(/^[1-7]\d{5}$/),
      label: z.string().min(1).max(60),
    }),
  )
  .max(50);

/** The office's bank matching rules (legacy BOOKS.rules): the bank's fee until Settings says more. */
export const readBankRules = () =>
  cached(NAME, { ttlSeconds: 600, tags: [BANK_RULES_TAG] }, async (): Promise<BankRule[]> => {
    const [row] = await db.select().from(configTables).where(eq(configTables.name, NAME));
    const parsed = row ? bankRulesSchema.safeParse(row.value) : null;
    return parsed?.success ? parsed.data : DEFAULT_BANK_RULES.map((r) => ({ ...r }));
  });

export async function readBankRulesForEdit() {
  const [row] = await db.select().from(configTables).where(eq(configTables.name, NAME));
  const parsed = row ? bankRulesSchema.safeParse(row.value) : null;
  return {
    rules: parsed?.success ? parsed.data : DEFAULT_BANK_RULES.map((r) => ({ ...r })),
    version: row?.version ?? 0,
  };
}
