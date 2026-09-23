import "server-only";
import { and, eq, gt } from "drizzle-orm";
import { COMPANY } from "@/domain/company";
import { creditProblem, reminderText, remindStep } from "@/domain/reminders";
import { openCents } from "@/domain/payments";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { bookings, contacts, invoices } from "@/server/db/schema";
import { creditedSql, settledSql } from "./money";
import { exposureOf, lastReminderSql } from "./reminder-store";

/** Overdue invoices with the reminder due today on each (none if reminded in the last ten days). */
export async function remindersDue(today: string, signer: string) {
  await requirePermission("app.accounting");
  const rows = await db
    .select({
      id: invoices.id,
      number: invoices.number,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      ogm: invoices.ogm,
      gross: invoices.grossCents,
      settled: settledSql,
      credited: creditedSql,
      last: lastReminderSql,
      customer: contacts.name,
      email: contacts.email,
      bookingRef: bookings.ref,
    })
    .from(invoices)
    .innerJoin(contacts, eq(contacts.id, invoices.customerId))
    .leftJoin(bookings, eq(bookings.id, invoices.bookingId))
    .where(
      and(eq(invoices.kind, "invoice"), eq(invoices.status, "issued"), gt(invoices.grossCents, 0)),
    );
  return rows
    .map((r) => {
      const open = openCents(r.gross ?? 0, r.settled, r.credited);
      const step = remindStep({ dueDate: r.dueDate, openCents: open, today, last: r.last });
      const text =
        step &&
        reminderText({
          step,
          customer: r.customer,
          number: r.number ?? "",
          issueDate: r.issueDate ?? "",
          dueDate: r.dueDate ?? "",
          openCents: open,
          iban: COMPANY.iban,
          ogm: r.ogm,
          signer,
          company: COMPANY.name,
        });
      return { ...r, openCents: open, step, text };
    })
    .filter((r) => r.openCents > 0 && r.dueDate && r.dueDate < today)
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
}

/** A customer's exposure against their credit limit, for the contact page. */
export async function creditStanding(contactId: string) {
  await requirePermission("app.accounting");
  const [c] = await db
    .select({ limit: contacts.creditLimitCents })
    .from(contacts)
    .where(eq(contacts.id, contactId));
  if (!c) return null;
  const exposure = await exposureOf(db, contactId);
  return {
    limitCents: c.limit,
    exposureCents: exposure,
    problem: creditProblem(c.limit, exposure),
  };
}
