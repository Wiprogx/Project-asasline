import "server-only";
import { z } from "zod";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { creditableLines } from "./credit-store";

/** An issued invoice's lines with what is still to be credited on each (the credit dialogs). */
export async function creditLeftOf(invoiceId: string) {
  await requirePermission("app.accounting");
  if (!z.uuid().safeParse(invoiceId).success) return [];
  const rows = await db.transaction((tx) => creditableLines(tx, invoiceId));
  return rows.map(({ line, left }) => ({
    id: line.id,
    description: line.description,
    qty: line.qty,
    left,
  }));
}
