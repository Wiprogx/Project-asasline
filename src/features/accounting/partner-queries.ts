import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { partnerBalance } from "@/domain/partner-balance";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { invoices, payments } from "@/server/db/schema";
import { creditedSql, settledSql } from "./money";

/** A contact's standing with the office and its payments, newest first (the contact's Invoices tab). */
export async function contactMoney(contactId: string, today: string) {
  await requirePermission("app.accounting");
  if (!z.uuid().safeParse(contactId).success) return null;
  const [docs, pays] = await Promise.all([
    db
      .select({
        kind: invoices.kind,
        grossCents: invoices.grossCents,
        settledCents: settledSql,
        creditedCents: creditedSql,
        dueDate: invoices.dueDate,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.customerId, contactId),
          eq(invoices.status, "issued"),
          inArray(invoices.kind, ["invoice", "bill"]),
        ),
      ),
    db
      .select({
        id: payments.id,
        date: payments.date,
        direction: payments.direction,
        amountCents: payments.amountCents,
        status: payments.status,
        reference: payments.reference,
      })
      .from(payments)
      .where(eq(payments.contactId, contactId))
      .orderBy(desc(payments.date))
      .limit(100),
  ]);
  const balance = partnerBalance(
    docs.map((d) => ({
      kind: d.kind === "bill" ? ("bill" as const) : ("invoice" as const),
      grossCents: d.grossCents ?? 0,
      settledCents: d.settledCents,
      creditedCents: d.creditedCents,
      dueDate: d.dueDate,
    })),
    today,
  );
  return { balance, payments: pays };
}
