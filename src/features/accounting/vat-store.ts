import "server-only";
import { eq } from "drizzle-orm";
import { vatPeriodRange, vatReturn } from "@/domain/vat";
import type { DbOrTx } from "@/server/db/client";
import { users, vatFilings } from "@/server/db/schema";
import { issuedDocs } from "./ledger-store";

// Internal: read by the VAT screen (permission-checked) and by the filing action.
/** The return as the documents dated in the period give it now. */
export async function computeVatReturn(period: string) {
  const docs = await issuedDocs(vatPeriodRange(period));
  return { ...vatReturn(docs), documents: docs.length };
}

export async function vatFilingOf(db: DbOrTx, period: string) {
  const [row] = await db
    .select({ filing: vatFilings, by: users.name })
    .from(vatFilings)
    .leftJoin(users, eq(users.id, vatFilings.filedBy))
    .where(eq(vatFilings.period, period));
  return row ?? null;
}
