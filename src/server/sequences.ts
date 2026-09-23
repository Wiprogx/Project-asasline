import { sql } from "drizzle-orm";
import { formatInvoiceNumber, type InvoiceKind, invoiceSequenceKey } from "@/domain/invoicing";
import { formatRef, type RefPrefix, sequenceKey } from "@/domain/refs";
import type { Tx } from "./db/client";
import { sequences } from "./db/schema";

/**
 * The next value of a named counter, atomically. The upsert takes a row lock, so two staff
 * issuing in the same second get two different numbers; the legacy app had to detect and
 * renumber collisions after the fact. Call inside the transaction that uses the number, so a
 * failed write never burns one — which is what keeps the invoice series unbroken.
 */
async function nextCounter(tx: Tx, key: string): Promise<number> {
  const [row] = await tx
    .insert(sequences)
    .values({ key, value: 1 })
    .onConflictDoUpdate({ target: sequences.key, set: { value: sql`${sequences.value} + 1` } })
    .returning({ value: sequences.value });
  return row.value;
}

/** The next QT/SB number for the month of `day`. */
export async function nextRef(tx: Tx, prefix: RefPrefix, day: string): Promise<string> {
  return formatRef(prefix, day, await nextCounter(tx, sequenceKey(prefix, day)));
}

/** The next invoice or credit-note number of the year of `day` (INV/2026/00001). */
export async function nextInvoiceNumber(tx: Tx, kind: InvoiceKind, day: string): Promise<string> {
  return formatInvoiceNumber(kind, day, await nextCounter(tx, invoiceSequenceKey(kind, day)));
}
