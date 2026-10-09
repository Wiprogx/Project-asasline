import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { BankAccount } from "@/domain/bank-accounts";
import { cached } from "./cache/cache";
import { db } from "./db/client";
import { configTables } from "./db/schema";

const NAME = "bankAccounts";
export const BANK_ACCOUNTS_TAG = `config:${NAME}`;

export const bankAccountsSchema = z
  .array(
    z.object({
      name: z.string().min(1).max(80),
      iban: z.string().regex(/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/),
      bic: z
        .string()
        .regex(/^[A-Z0-9]{8}([A-Z0-9]{3})?$/)
        .nullable(),
      account: z.string().regex(/^5[5-8]\d{4}$/),
      openingCents: z.number().int(),
      openingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }),
  )
  .max(20);

/** The office's bank accounts (legacy BANK_ACCOUNTS): none until Settings › Accounting names one. */
export const readBankAccounts = () =>
  cached(NAME, { ttlSeconds: 600, tags: [BANK_ACCOUNTS_TAG] }, async (): Promise<BankAccount[]> => {
    const [row] = await db.select().from(configTables).where(eq(configTables.name, NAME));
    const parsed = row ? bankAccountsSchema.safeParse(row.value) : null;
    return parsed?.success ? parsed.data : [];
  });

export async function readBankAccountsForEdit() {
  const [row] = await db.select().from(configTables).where(eq(configTables.name, NAME));
  const parsed = row ? bankAccountsSchema.safeParse(row.value) : null;
  return { accounts: parsed?.success ? parsed.data : [], version: row?.version ?? 0 };
}
