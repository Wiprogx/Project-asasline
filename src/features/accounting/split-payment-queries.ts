import "server-only";
import { z } from "zod";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { openInvoices } from "./money";

/** A customer's issued invoices with something open, oldest number first: what a transfer can settle. */
export async function openInvoicesOfCustomer(customerId: string) {
  await requirePermission("app.accounting");
  if (!z.uuid().safeParse(customerId).success) return [];
  return (await openInvoices(db))
    .filter((i) => i.kind === "invoice" && i.customerId === customerId)
    .sort((a, b) => a.number.localeCompare(b.number));
}
