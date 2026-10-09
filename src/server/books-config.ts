import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { type BooksSettings, DEFAULT_BOOKS, VAT_PERIODS } from "@/domain/accounting-settings";
import { cached } from "./cache/cache";
import { db, type DbOrTx } from "./db/client";
import { configTables } from "./db/schema";

export const BOOKS_NAME = "books";
export const BOOKS_TAG = `config:${BOOKS_NAME}`;

/** The books row: the close day (books-store) and the two settings the office edits. */
export const booksSchema = z.object({
  closedThrough: z.string().nullable().default(null),
  approveOverCents: z
    .number()
    .int()
    .min(0)
    .max(100_000_000)
    .default(DEFAULT_BOOKS.approveOverCents),
  vatPeriod: z.enum(VAT_PERIODS).default(DEFAULT_BOOKS.vatPeriod),
  parallelUntil: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .default(null),
});

export function parseBooks(value: unknown): BooksSettings {
  const parsed = booksSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : { ...DEFAULT_BOOKS };
}

/** The settings, cached; the close day is read uncached and locked by books-store. */
export function readBooks(): Promise<BooksSettings> {
  return cached(BOOKS_NAME, { ttlSeconds: 600, tags: [BOOKS_TAG] }, () => readBooksNow(db));
}

export async function readBooksNow(tx: DbOrTx): Promise<BooksSettings> {
  const [row] = await tx.select().from(configTables).where(eq(configTables.name, BOOKS_NAME));
  return parseBooks(row?.value);
}

export async function readBooksForEdit() {
  const [row] = await db.select().from(configTables).where(eq(configTables.name, BOOKS_NAME));
  return { books: parseBooks(row?.value), version: row?.version ?? 0 };
}
